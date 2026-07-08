import mongoose, { Types, type ClientSession } from 'mongoose'
import { env } from '../config/env'
import { OrderEventModel } from '../models/OrderEvent'
import { OrderItemModel } from '../models/OrderItem'
import { OrderModel } from '../models/Order'
import { ProductModel } from '../models/Product'
import { UserModel } from '../models/User'
import { HttpError } from '../utils/httpError'
import { dispatchNotification } from './notificationService'

interface CreateOrderItemInput {
  productId: string
  quantity: number
  size?: string
}

interface CreateOrderPayload {
  userId: string
  items: CreateOrderItemInput[]
}

interface PersistedOrderRef {
  orderId: Types.ObjectId
}

const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

async function assertCustomerUser(userId: string, session?: ClientSession) {
  const userQuery = UserModel.findById(userId).select('role')
  const user = session ? await userQuery.session(session) : await userQuery

  if (!user) {
    throw new HttpError(404, 'User not found')
  }

  if (user.role === 'ADMIN') {
    throw new HttpError(403, 'Admins cannot create customer orders')
  }

  return user
}

function groupOrderItems(items: CreateOrderItemInput[]) {
  // Group by product + size so two lines for the same product but different
  // sizes (e.g. Guantes M and Guantes L) stay separate stock buckets.
  const grouped = new Map<string, { productId: string; quantity: number; size?: string }>()
  for (const item of items) {
    const key = `${item.productId}::${item.size ?? ''}`
    const existing = grouped.get(key)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      grouped.set(key, { productId: item.productId, quantity: item.quantity, size: item.size })
    }
  }
  return Array.from(grouped.values())
}

function buildOrderWithItems<TOrder extends { _id: Types.ObjectId }>(
  order: TOrder,
  allItems: Array<{ orderId: Types.ObjectId }>,
) {
  const items = allItems.filter((item) => item.orderId.toString() === order._id.toString())
  return {
    ...((order as unknown as { toObject?: () => object }).toObject
      ? (order as unknown as { toObject: () => object }).toObject()
      : order),
    items,
  }
}

export async function listOrders() {
  const orders = await OrderModel.find()
    .populate('userId', 'fullName email role')
    .sort({ createdAt: -1 })

  const orderIds = orders.map((order) => order._id)
  const items = await OrderItemModel.find({ orderId: { $in: orderIds } }).populate(
    'productId',
    'name price images isActive',
  )

  return orders.map((order) => buildOrderWithItems(order, items))
}

export async function getOrderById(id: string) {
  const order = await OrderModel.findById(id).populate('userId', 'fullName email role')
  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  const items = await OrderItemModel.find({ orderId: order._id }).populate(
    'productId',
    'name price images isActive',
  )

  return buildOrderWithItems(order, items)
}

export async function cancelOrder(id: string) {
  const order = await OrderModel.findById(id)

  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  if (order.status !== 'PENDING') {
    throw new HttpError(400, 'Only pending orders can be cancelled')
  }

  order.status = 'CANCELLED'
  await order.save()

  return loadOrderWithItems(id)
}

interface PopulatedOrderCustomer {
  email?: string
  fullName?: string
}

/**
 * HU-31: transitions a PAID order to SHIPPED and emails the customer that their
 * order is on its way. Only PAID orders can be shipped. The confirmation email
 * (order number, ship date, optional tracking number) is dispatched fire-and-
 * forget so it never blocks the response; it inherits the notificationService
 * retry/backoff and is audited (with its send timestamp) in NotificationLog.
 */
// Returns an order's event history, newest first (HU-29). Verifies the order
// exists so a bad id is a clean 404 rather than an empty list.
export async function listOrderEvents(id: string) {
  const orderExists = await OrderModel.exists({ _id: id })
  if (!orderExists) {
    throw new HttpError(404, 'Order not found')
  }

  return OrderEventModel.find({ orderId: id }).sort({ createdAt: -1 })
}

export async function markOrderAsShipped(id: string, trackingNumber?: string) {
  const order = await OrderModel.findById(id).populate('userId', 'fullName email role')

  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  // Only a paid order can ship — guard against PENDING/SHIPPED/DELIVERED/etc.
  if (order.status !== 'PAID') {
    throw new HttpError(400, 'Only paid orders can be shipped')
  }

  order.status = 'SHIPPED'
  order.shippedAt = new Date()
  if (trackingNumber) {
    order.trackingNumber = trackingNumber
  }
  await order.save()

  notifyCustomerOrderShipped(order, trackingNumber)

  return loadOrderWithItems(id)
}

function notifyCustomerOrderShipped(
  order: InstanceType<typeof OrderModel>,
  trackingNumber?: string,
) {
  const customer = order.userId as unknown as PopulatedOrderCustomer | null
  const email = typeof order.userId === 'string' ? undefined : customer?.email

  if (!email) {
    console.warn('[order-shipped] cannot notify: order has no customer email', {
      orderId: order._id.toString(),
    })
    return
  }

  const orderId = order._id.toString()

  dispatchNotification({
    type: 'ORDER_SHIPPED',
    to: email,
    orderId,
    subject: `Tu orden #${orderId.slice(-6).toUpperCase()} va en camino 🚚`,
    html: buildOrderShippedEmailHtml({
      name: customer?.fullName,
      orderId,
      shippedAt: order.shippedAt ?? new Date(),
      trackingNumber,
    }),
  })
}

function buildOrderShippedEmailHtml(params: {
  name?: string
  orderId: string
  shippedAt: Date
  trackingNumber?: string
}): string {
  const greeting = params.name ? `Hola ${params.name},` : 'Hola,'
  const orderNumber = params.orderId.slice(-6).toUpperCase()
  const ordersUrl = `${env.frontendUrl}/orders/${params.orderId}`
  const shipDate = params.shippedAt.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const trackingBlock = params.trackingNumber
    ? `<p style="background:#f0fdf4; border-radius:8px; padding:12px 16px; color:#166534;">
         📦 <strong>Número de rastreo:</strong> ${params.trackingNumber}
       </p>`
    : ''

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
    <h2 style="color: #4d7c0f;">¡Tu pedido está en camino!</h2>
    <p>${greeting}</p>
    <p>Tu orden <strong>#${orderNumber}</strong> fue enviada el <strong>${shipDate}</strong>
      y pronto llegará a tus manos.</p>
    ${trackingBlock}
    <p style="margin: 24px 0;">
      <a href="${ordersUrl}"
         style="background:#84cc16; color:#0f172a; padding:12px 24px; border-radius:9999px;
                text-decoration:none; font-weight:bold;">Seguir mi orden</a>
    </p>
    <p style="color:#94a3b8; font-size:12px;">Gracias por comprar en FITGEAR. — Equipo FITGEAR</p>
  </div>`
}

export async function listOrdersByUserId(userId: string) {
  const userExists = await UserModel.exists({ _id: userId })
  if (!userExists) {
    throw new HttpError(404, 'User not found')
  }

  const orders = await OrderModel.find({ userId })
    .populate('userId', 'fullName email role')
    .sort({ createdAt: -1 })

  const orderIds = orders.map((order) => order._id)
  const items = await OrderItemModel.find({ orderId: { $in: orderIds } }).populate(
    'productId',
    'name price images isActive',
  )

  return orders.map((order) => buildOrderWithItems(order, items))
}

export async function createOrder(payload: CreateOrderPayload) {
  const session = await mongoose.startSession()

  try {
    session.startTransaction()
    const created = await persistOrder(payload, session)
    await session.commitTransaction()
    return await loadOrderWithItems(created.orderId.toString())
  } catch (error) {
    await session.abortTransaction()

    if (isTransactionUnsupportedError(error)) {
      const created = await persistOrder(payload)
      return await loadOrderWithItems(created.orderId.toString())
    }

    throw error
  } finally {
    await session.endSession()
  }
}

async function loadOrderWithItems(orderId: string) {
  const hydratedOrder = await OrderModel.findById(orderId).populate(
    'userId',
    'fullName email role',
  )

  if (!hydratedOrder) {
    throw new HttpError(500, 'Failed to load created order')
  }

  const hydratedItems = await OrderItemModel.find({ orderId: hydratedOrder._id }).populate(
    'productId',
    'name price images isActive',
  )

  return buildOrderWithItems(hydratedOrder, hydratedItems)
}

function isTransactionUnsupportedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.message.includes('Transaction numbers are only allowed on a replica set member') ||
    error.message.includes('Transaction numbers are only allowed on a mongos')
  )
}

async function persistOrder(payload: CreateOrderPayload, session?: ClientSession): Promise<PersistedOrderRef> {
  const userExistsQuery = UserModel.exists({ _id: payload.userId })
  const userExists = session ? await userExistsQuery.session(session) : await userExistsQuery

  if (!userExists) {
    throw new HttpError(404, 'User not found')
  }
  
  await assertCustomerUser(payload.userId, session)

  const groupedItems = groupOrderItems(payload.items)
  // Dedupe productIds for the lookup — the same product can appear twice in
  // groupedItems when the cart holds it in two different sizes.
  const uniqueProductIds = [...new Set(groupedItems.map((item) => item.productId))]
  const productIds = uniqueProductIds.map((productId) => new Types.ObjectId(productId))

  const productsQuery = ProductModel.find({ _id: { $in: productIds } })
  const products = session ? await productsQuery.session(session) : await productsQuery

  if (products.length !== uniqueProductIds.length) {
    throw new HttpError(404, 'Product not found')
  }

  const productMap = new Map(products.map((product) => [product._id.toString(), product]))
  const orderItemsToCreate = groupedItems.map((item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new HttpError(404, 'Product not found')
    }

    if (!product.isActive) {
      throw new HttpError(400, 'Validation failed', [
        {
          path: `items.${item.productId}`,
          message: `Product ${product.name} is inactive and cannot be purchased`,
        },
      ])
    }

    const hasSizes = product.sizes.length > 0
    let availableStock = product.stock

    if (hasSizes) {
      if (!item.size) {
        throw new HttpError(400, 'Validation failed', [
          { path: `items.${item.productId}.size`, message: `Product ${product.name} requires a size` },
        ])
      }

      const sizeEntry = product.sizes.find((size) => size.label === item.size)
      if (!sizeEntry) {
        throw new HttpError(400, 'Validation failed', [
          { path: `items.${item.productId}.size`, message: `Invalid size for ${product.name}` },
        ])
      }

      availableStock = sizeEntry.stock
    }

    if (availableStock < item.quantity) {
      throw new HttpError(400, 'Validation failed', [
        {
          path: `items.${item.productId}.quantity`,
          message: `Insufficient stock for ${product.name}. Available: ${availableStock}`,
        },
      ])
    }

    const unitPrice = product.hasDiscount ? product.finalPrice : product.price
    const subtotal = unitPrice * item.quantity

    return {
      productId: product._id,
      quantity: item.quantity,
      size: hasSizes ? item.size : undefined,
      unitPrice,
      subtotal,
    }
  })

  const subtotal = orderItemsToCreate.reduce((acc, item) => acc + item.subtotal, 0)
  const taxAmount = roundCurrency(subtotal * TAX_RATE)
  const shippingAmount = subtotal > 0 ? SHIPPING_FEE : 0
  const totalAmount = roundCurrency(subtotal + taxAmount + shippingAmount)

  const createdOrder = session
    ? (
        await OrderModel.create(
          [
            {
              userId: new Types.ObjectId(payload.userId),
              totalAmount,
              status: 'PENDING',
            },
          ],
          { session },
        )
      )[0]
    : await OrderModel.create({
        userId: new Types.ObjectId(payload.userId),
        totalAmount,
        status: 'PENDING',
      })

  if (!createdOrder) {
    throw new HttpError(500, 'Failed to create order')
  }

  const itemsPayload = orderItemsToCreate.map((item) => ({
    orderId: createdOrder._id,
    productId: item.productId,
    quantity: item.quantity,
    size: item.size,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
  }))

  if (session) {
    await OrderItemModel.insertMany(itemsPayload, { session })
  } else {
    await OrderItemModel.insertMany(itemsPayload)
  }

  return { orderId: createdOrder._id }
}
