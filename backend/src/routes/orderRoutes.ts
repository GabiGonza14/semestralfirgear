import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createOrderController,
  getOrder,
  getOrders,
  getOrdersByUser,
} from '../controllers/orderController'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createOrderSchema, userIdParamSchema } from '../validations/orderValidation'

export const orderRouter = new Hono<AppEnv>()

orderRouter.get('/', getOrders)
orderRouter.get('/user/:userId', validateParams(userIdParamSchema), getOrdersByUser)
orderRouter.get('/:id', validateParams(idParamSchema), getOrder)
orderRouter.post('/', validateBody(createOrderSchema), createOrderController)
