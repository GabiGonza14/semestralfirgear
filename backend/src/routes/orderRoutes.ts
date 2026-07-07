import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  cancelOrderController,
  createOrderController,
  getOrder,
  getOrders,
  getOrdersByUser,
  shipOrderController,
} from '../controllers/orderController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import { createOrderSchema, shipOrderSchema, userIdParamSchema } from '../validations/orderValidation'

export const orderRouter = new Hono<AppEnv>()

// Orders expose personal data — every route requires a valid Clerk JWT.
orderRouter.use('*', requireAuthMiddleware())

orderRouter.get('/', getOrders)
orderRouter.get('/user/:userId', validateParams(userIdParamSchema), getOrdersByUser)
orderRouter.get('/:id', validateParams(idParamSchema), getOrder)
orderRouter.post('/', validateBody(createOrderSchema), createOrderController)
orderRouter.patch('/:id/cancel', validateParams(idParamSchema), cancelOrderController)

// Shipping is an admin action (PAID -> SHIPPED) and emails the customer (HU-31).
// The base router already requires a valid JWT; add the ADMIN role check here.
orderRouter.patch(
  '/:id/ship',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(shipOrderSchema),
  shipOrderController,
)
