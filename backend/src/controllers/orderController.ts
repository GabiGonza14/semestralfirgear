import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createOrder,
  getOrderById,
  listOrders,
  listOrdersByUserId,
} from '../services/orderService'

export const getOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await listOrders()
  res.status(200).json(orders)
})

export const getOrder = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = res.locals.validatedParams as { id: string }
  const order = await getOrderById(id)
  res.status(200).json(order)
})

export const getOrdersByUser = asyncHandler(async (_req: Request, res: Response) => {
  const { userId } = res.locals.validatedParams as { userId: string }
  const orders = await listOrdersByUserId(userId)
  res.status(200).json(orders)
})

export const createOrderController = asyncHandler(async (_req: Request, res: Response) => {
  const payload = res.locals.validatedBody as {
    userId: string
    items: Array<{ productId: string; quantity: number }>
  }

  const order = await createOrder(payload)
  res.status(201).json(order)
})
