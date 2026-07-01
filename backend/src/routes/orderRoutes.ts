import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createOrderController,
  getOrder,
  getOrders,
  getOrdersByUser,
} from '../controllers/orderController'
import { requireAuth } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createOrderSchema, userIdParamSchema } from '../validations/orderValidation'

export const orderRouter = new Hono<AppEnv>()

// All order routes require authentication
orderRouter.get('/', requireAuth(), getOrders)
orderRouter.get('/user/:userId', requireAuth(), validateParams(userIdParamSchema), getOrdersByUser)
orderRouter.get('/:id', requireAuth(), validateParams(idParamSchema), getOrder)
orderRouter.post('/', requireAuth(), validateBody(createOrderSchema), createOrderController)
