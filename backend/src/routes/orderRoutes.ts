import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  cancelOrderController,
  createOrderController,
  getOrder,
  getOrders,
  getOrdersByUser,
} from '../controllers/orderController'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createOrderSchema, userIdParamSchema } from '../validations/orderValidation'

export const orderRouter = new Hono<AppEnv>()

// Orders expose personal data — every route requires a valid Clerk JWT.
orderRouter.use('*', requireAuthMiddleware())

orderRouter.get('/', getOrders)
orderRouter.get('/user/:userId', validateParams(userIdParamSchema), getOrdersByUser)
orderRouter.get('/:id', validateParams(idParamSchema), getOrder)
orderRouter.post('/', validateBody(createOrderSchema), createOrderController)
orderRouter.patch('/:id/cancel', validateParams(idParamSchema), cancelOrderController)
