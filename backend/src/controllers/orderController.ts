import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { recordAuditAction } from '../services/auditLogService'
import {
  cancelOrder,
  createOrder,
  getOrderById,
  listOrderEvents,
  listOrders,
  listOrdersByUserId,
  markOrderAsShipped,
  updateOrderStatus,
} from '../services/orderService'
import { refundOrder, selfRefundOrder } from '../services/paymentService'
import { HttpError } from '../utils/httpError'
import type { OrderLifecycleStatus } from '../utils/orderStatus'

export const getOrders = async (c: Context<AppEnv>) => {
  const orders = await listOrders()
  return c.json(orders, 200)
}

export const getOrder = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const order = await getOrderById(id)
  return c.json(order, 200)
}

export const getOrdersByUser = async (c: Context<AppEnv>) => {
  const { userId } = c.get('validatedParams') as { userId: string }
  const orders = await listOrdersByUserId(userId)
  return c.json(orders, 200)
}

export const createOrderController = async (c: Context<AppEnv>) => {
  const payload = c.get('validatedBody') as {
    userId: string
    items: Array<{ productId: string; quantity: number; size?: string }>
  }
  const order = await createOrder(payload)
  return c.json(order, 201)
}

export const cancelOrderController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const order = await cancelOrder(id)
  return c.json(order, 200)
}

// Customer self-service: cancel-and-refund a PAID order, or approve a return
// on a SHIPPED order — both auto-refund via Stripe with no admin involvement.
// Ownership + status are enforced inside selfRefundOrder itself.
export const selfRefundOrderController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const clerkUserId = c.get('userId')
  if (!clerkUserId) {
    throw new HttpError(401, 'No se proporcionó token de autenticación')
  }
  await selfRefundOrder(id, clerkUserId)
  const order = await getOrderById(id)
  return c.json(order, 200)
}

export const shipOrderController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const { trackingNumber } = c.get('validatedBody') as { trackingNumber?: string }
  const actorClerkId = c.get('userId')
  const order = await markOrderAsShipped(id, trackingNumber, actorClerkId)
  await recordAuditAction({
    actorClerkId,
    action: 'ORDER_SHIPPED',
    entityType: 'ORDER',
    entityId: id,
    changes: { status: 'SHIPPED', trackingNumber },
  })
  return c.json(order, 200)
}

export const updateOrderStatusController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const { status, trackingNumber, reason: requestedReason } = c.get('validatedBody') as {
    status: OrderLifecycleStatus
    trackingNumber?: string
    reason?: string
  }
  const actorClerkId = c.get('userId')

  // Cancelling a PAID order means real money already changed hands — route it
  // through the same Stripe refund (+ stock restore) as the "Reembolsar"
  // button instead of just relabeling it CANCELLED. Otherwise an admin could
  // "cancel" a paid order from this dropdown while the customer's payment
  // stays uncollected and the stock stays decremented.
  const current = await getOrderById(id)
  const currentStatus = (current as { status?: string }).status
  if (currentStatus === 'PAID' && status === 'CANCELLED') {
    const reason = requestedReason ?? 'Cancelado por el administrador'
    await refundOrder(id, { reason, actorClerkId })
    await recordAuditAction({
      actorClerkId,
      action: 'ORDER_REFUNDED',
      entityType: 'ORDER',
      entityId: id,
      changes: { status: 'REFUNDED', reason },
    })
    const order = await getOrderById(id)
    return c.json(order, 200)
  }

  const order = await updateOrderStatus(id, status, { actorClerkId, trackingNumber })
  await recordAuditAction({
    actorClerkId,
    action: 'ORDER_STATUS_CHANGED',
    entityType: 'ORDER',
    entityId: id,
    changes: { status, trackingNumber },
  })
  return c.json(order, 200)
}

export const getOrderHistoryController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const events = await listOrderEvents(id)
  return c.json(events, 200)
}

export const refundOrderController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const { reason } = c.get('validatedBody') as { reason?: string }
  const actorClerkId = c.get('userId')
  await refundOrder(id, { reason, actorClerkId })
  await recordAuditAction({
    actorClerkId,
    action: 'ORDER_REFUNDED',
    entityType: 'ORDER',
    entityId: id,
    changes: { status: 'REFUNDED', reason },
  })
  // Return the refreshed order with items so the admin UI reflects REFUNDED.
  const order = await getOrderById(id)
  return c.json(order, 200)
}
