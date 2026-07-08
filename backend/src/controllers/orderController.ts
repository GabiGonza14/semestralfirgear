import type { Context } from 'hono'
import type { AppEnv } from '../app'
import {
  cancelOrder,
  createOrder,
  getOrderById,
  listOrderEvents,
  listOrders,
  listOrdersByUserId,
  markOrderAsShipped,
} from '../services/orderService'
import { refundOrder } from '../services/paymentService'

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

export const shipOrderController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const { trackingNumber } = c.get('validatedBody') as { trackingNumber?: string }
  const order = await markOrderAsShipped(id, trackingNumber)
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
  // Return the refreshed order with items so the admin UI reflects REFUNDED.
  const order = await getOrderById(id)
  return c.json(order, 200)
}
