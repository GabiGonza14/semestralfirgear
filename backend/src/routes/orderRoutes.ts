import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  cancelOrderController,
  createOrderController,
  getOrder,
  getOrderHistoryController,
  getOrders,
  getOrdersByUser,
  refundOrderController,
  selfRefundOrderController,
  shipOrderController,
  updateOrderStatusController,
} from '../controllers/orderController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
  createOrderSchema,
  refundOrderSchema,
  shipOrderSchema,
  updateOrderStatusSchema,
  userIdParamSchema,
} from '../validations/orderValidation'

export const orderRouter = new Hono<AppEnv>()

// Orders expose personal data — every route requires a valid Clerk JWT.
orderRouter.use('*', requireAuthMiddleware())

orderRouter.get('/', getOrders)
orderRouter.get('/user/:userId', validateParams(userIdParamSchema), getOrdersByUser)
orderRouter.get('/:id', validateParams(idParamSchema), getOrder)
orderRouter.post('/', validateBody(createOrderSchema), createOrderController)
orderRouter.patch('/:id/cancel', validateParams(idParamSchema), cancelOrderController)

// Customer self-service (ownership checked inside the controller/service, not
// via requireAdminMiddleware): cancel a PAID order, or approve a return on a
// SHIPPED one — both auto-refund via Stripe immediately.
orderRouter.post('/:id/self-refund', validateParams(idParamSchema), selfRefundOrderController)

// Shipping is an admin action (PAID -> SHIPPED) and emails the customer (HU-31).
// The base router already requires a valid JWT; add the ADMIN role check here.
orderRouter.patch(
  '/:id/ship',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(shipOrderSchema),
  shipOrderController,
)

// Manual admin order status change (HU-42): validates the transition, audits it
// and (on SHIPPED) emails the customer. Admin-only.
orderRouter.patch(
  '/:id/status',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(updateOrderStatusSchema),
  updateOrderStatusController,
)

// Refunding is an admin action (-> REFUNDED via Stripe) and emails the customer
// (HU-29). The base router already requires a valid JWT; add the ADMIN check.
orderRouter.post(
  '/:id/refund',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(refundOrderSchema),
  refundOrderController,
)

// Order event history (refunds, etc.) — admin-only: it exposes the acting admin,
// which must not leak to customers (HU-29).
orderRouter.get(
  '/:id/history',
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  getOrderHistoryController,
)
