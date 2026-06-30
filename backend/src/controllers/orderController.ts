import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { createOrder, getOrderById, listOrders, listOrdersByUserId } from '../services/orderService'

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
    items: Array<{ productId: string; quantity: number }>
  }
  const order = await createOrder(payload)
  return c.json(order, 201)
}
