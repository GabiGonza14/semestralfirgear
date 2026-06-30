import Stripe from 'stripe'
import mongoose, { Types, type ClientSession } from 'mongoose'
import { env } from '../config/env'
import { getStripeClient } from '../config/stripe'
import { OrderItemModel } from '../models/OrderItem'
import { OrderModel } from '../models/Order'
import { ProductModel } from '../models/Product'
import { HttpError } from '../utils/httpError'

interface CheckoutSessionResult {
  sessionId: string
  url: string
}

interface PopulatedProductRef {
  name?: string
  imageUrl?: string
}

interface PopulatedOrderUserRef {
  email?: string
  role?: string
}

interface GroupedOrderItem {
  productId: string
  quantity: number
}

const TAX_RATE = 0.07
const SHIPPING_FEE = 4.99

async function assertCustomerOrder(orderId: string, session?: ClientSession) {
  const orderQuery = OrderModel.findById(orderId).populate('userId', 'email fullName role')
  const order = session ? await orderQuery.session(session) : await orderQuery

  if (!order) {
    throw new HttpError(404, 'Order not found')
  }

  const userRef = order.userId as unknown as PopulatedOrderUserRef | { role?: string } | string | null

  if (typeof userRef !== 'string' && userRef?.role === 'ADMIN') {
    throw new HttpError(403, 'Admins cannot use customer checkout')
  }

  return order
}

function toStripeUnitAmount(amount: number) {
  return Math.round(amount * 100)
}

function toTaxAmount(amount: number) {
  return Math.round(amount * TAX_RATE * 100) / 100
}

function toAbsoluteImageUrl(imageUrl: string | undefined) {
  if (!imageUrl) {
    return undefined
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl
  }

  if (imageUrl.startsWith('/')) {
    return `${env.backendUrl}${imageUrl}`
  }

  return `${env.backendUrl}/${imageUrl}`
}

export async function createCheckoutSession(orderId: string): Promise<CheckoutSessionResult> {
  const stripe = getStripeClient()

  const order = await assertCustomerOrder(orderId)

  if (order.status === 'PAID') {
    throw new HttpError(400, 'Order is already paid')
  }

  await ensureOrderHasAvailableStock(order._id.toString())

  const items = await OrderItemModel.find({ orderId: order._id }).populate(
    'productId',
    'name imageUrl isActive',
  )

  if (!items.length) {
    throw new HttpError(400, 'Order has no items')
  }

  const lineItems = items.map((item) => {
    const productRef = item.productId as unknown as PopulatedProductRef | null
    const name =
      typeof item.productId === 'string'
        ? `Producto ${item.productId}`
        : productRef?.name ?? 'Producto FITGEAR'

    const imageUrl = toAbsoluteImageUrl(
      typeof item.productId === 'string' ? undefined : productRef?.imageUrl,
    )

    return {
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeUnitAmount(item.unitPrice),
        product_data: {
          name,
          images: imageUrl ? [imageUrl] : undefined,
        },
      },
    }
  })

  const subtotal = items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  const taxAmount = toTaxAmount(subtotal)
  const shippingAmount = subtotal > 0 ? SHIPPING_FEE : 0

  if (taxAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeUnitAmount(taxAmount),
        product_data: {
          name: `Impuesto (${Math.round(TAX_RATE * 100)}%)`,
          images: undefined,
        },
      },
    })
  }

  if (shippingAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: toStripeUnitAmount(shippingAmount),
        product_data: {
          name: 'Envío',
          images: undefined,
        },
      },
    })
  }

  const userRef = order.userId as unknown as PopulatedOrderUserRef | string | null
  const customerEmail = typeof userRef === 'string' ? undefined : (userRef?.email ?? undefined)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: `${env.frontendUrl}/checkout/success?orderId=${order._id.toString()}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/checkout/cancel?orderId=${order._id.toString()}`,
    metadata: {
      orderId: order._id.toString(),
    },
    client_reference_id: order._id.toString(),
    customer_email: customerEmail,
  })

  await OrderModel.findByIdAndUpdate(order._id, {
    stripeCheckoutSessionId: session.id,
    paymentProvider: 'STRIPE',
  })

  if (!session.url) {
    throw new HttpError(500, 'Failed to initialize Stripe checkout URL')
  }

  return {
    sessionId: session.id,
    url: session.url,
  }
}

export async function confirmCheckoutPayment(orderId: string, sessionId?: string) {
  const order = await assertCustomerOrder(orderId)

  if (order.status === 'PAID') {
    return { status: 'PAID' as const }
  }

  const resolvedSessionId = sessionId ?? order.stripeCheckoutSessionId

  if (!resolvedSessionId) {
    throw new HttpError(400, 'Missing Stripe checkout session id for this order')
  }

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(resolvedSessionId)

  const referenceOrderId = session.metadata?.orderId ?? session.client_reference_id

  if (referenceOrderId && referenceOrderId !== orderId) {
    throw new HttpError(400, 'Checkout session does not belong to this order')
  }

  const isPaid = session.payment_status === 'paid' || session.status === 'complete'

  if (!isPaid) {
    throw new HttpError(409, 'Payment is not confirmed yet')
  }

  await markOrderAsPaidAndDeductStock(
    orderId,
    session.id,
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? undefined),
  )

  return { status: 'PAID' as const }
}

export function constructWebhookEvent(payload: Buffer, signature: string | undefined) {
  if (!signature) {
    throw new HttpError(400, 'Missing Stripe signature header')
  }

  if (!env.stripeWebhookSecret) {
    throw new HttpError(500, 'Stripe webhook is not configured')
  }

  const stripe = getStripeClient()

  try {
    return stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret)
  } catch {
    throw new HttpError(400, 'Invalid Stripe signature')
  }
}

export async function handleStripeEvent(event: Stripe.Event) {
  if (event.type !== 'checkout.session.completed') {
    return
  }

  const session = event.data.object as Stripe.Checkout.Session
  const orderId = session.metadata?.orderId ?? session.client_reference_id

  if (!orderId) {
    return
  }

  try {
    await markOrderAsPaidAndDeductStock(
      orderId,
      session.id,
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? undefined),
    )
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 403) {
      return
    }

    throw error
  }
}

function groupOrderItems(items: Array<{ productId: Types.ObjectId | string; quantity: number }>) {
  const grouped = new Map<string, number>()

  for (const item of items) {
    const productId =
      typeof item.productId === 'string' ? item.productId : item.productId.toString()
    grouped.set(productId, (grouped.get(productId) ?? 0) + item.quantity)
  }

  return Array.from(grouped.entries()).map(([productId, quantity]) => ({ productId, quantity }))
}

async function loadOrderItems(orderId: string, session?: ClientSession) {
  const itemsQuery = OrderItemModel.find({ orderId }).select('productId quantity')
  return session ? itemsQuery.session(session) : itemsQuery
}

async function ensureOrderHasAvailableStock(orderId: string, session?: ClientSession) {
  const groupedItems = groupOrderItems(await loadOrderItems(orderId, session))

  if (!groupedItems.length) {
    throw new HttpError(400, 'Order has no items')
  }

  const productIds = groupedItems.map((item) => new Types.ObjectId(item.productId))
  const productsQuery = ProductModel.find({ _id: { $in: productIds } }).select('name stock isActive')
  const products = session ? await productsQuery.session(session) : await productsQuery

  if (products.length !== groupedItems.length) {
    throw new HttpError(404, 'Product not found')
  }

  const productMap = new Map(products.map((product) => [product._id.toString(), product]))

  for (const item of groupedItems) {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new HttpError(404, 'Product not found')
    }

    if (!product.isActive) {
      throw new HttpError(400, 'Order has inactive products and cannot be paid')
    }

    if (product.stock < item.quantity) {
      throw new HttpError(409, `Insufficient stock for ${product.name}. Available: ${product.stock}`)
    }
  }

  return groupedItems
}

async function applyStockDecrement(
  groupedItems: GroupedOrderItem[],
  session?: ClientSession,
) {
  for (const item of groupedItems) {
    const updateQuery = ProductModel.findOneAndUpdate(
      {
        _id: item.productId,
        isActive: true,
        stock: { $gte: item.quantity },
      },
      {
        $inc: { stock: -item.quantity },
      },
      {
        new: true,
      },
    )

    const updated = session ? await updateQuery.session(session) : await updateQuery

    if (!updated) {
      throw new HttpError(409, 'Stock update conflict. Try again with refreshed inventory.')
    }
  }
}

async function markOrderAsPaidAndDeductStock(
  orderId: string,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId?: string,
) {
  await assertCustomerOrder(orderId)

  const session = await mongoose.startSession()

  try {
    session.startTransaction()
    await markOrderAsPaidAndDeductStockWithSession(
      orderId,
      stripeCheckoutSessionId,
      stripePaymentIntentId,
      session,
    )
    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()

    if (isTransactionUnsupportedError(error)) {
      await markOrderAsPaidAndDeductStockFallback(orderId, stripeCheckoutSessionId, stripePaymentIntentId)
      return
    }

    throw error
  } finally {
    await session.endSession()
  }
}

async function markOrderAsPaidAndDeductStockWithSession(
  orderId: string,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId: string | undefined,
  session: ClientSession,
) {
  const orderQuery = OrderModel.findById(orderId)
  const order = await orderQuery.session(session)

  if (!order) {
    return
  }

  if (order.status === 'PAID') {
    return
  }

  const groupedItems = await ensureOrderHasAvailableStock(orderId, session)
  await applyStockDecrement(groupedItems, session)

  order.status = 'PAID'
  order.paymentProvider = 'STRIPE'
  order.stripeCheckoutSessionId = stripeCheckoutSessionId
  order.stripePaymentIntentId = stripePaymentIntentId
  order.paidAt = new Date()
  await order.save({ session })
}

async function markOrderAsPaidAndDeductStockFallback(
  orderId: string,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId?: string,
) {
  const order = await OrderModel.findById(orderId)

  if (!order) {
    return
  }

  if (order.status === 'PAID') {
    return
  }

  const groupedItems = await ensureOrderHasAvailableStock(orderId)
  const decremented: GroupedOrderItem[] = []

  try {
    for (const item of groupedItems) {
      const updated = await ProductModel.findOneAndUpdate(
        {
          _id: item.productId,
          isActive: true,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        {
          new: true,
        },
      )

      if (!updated) {
        throw new HttpError(409, 'Stock update conflict. Try again with refreshed inventory.')
      }

      decremented.push(item)
    }

    order.status = 'PAID'
    order.paymentProvider = 'STRIPE'
    order.stripeCheckoutSessionId = stripeCheckoutSessionId
    order.stripePaymentIntentId = stripePaymentIntentId
    order.paidAt = new Date()
    await order.save()
  } catch (error) {
    for (const item of decremented) {
      await ProductModel.findByIdAndUpdate(item.productId, {
        $inc: { stock: item.quantity },
      })
    }

    throw error
  }
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
