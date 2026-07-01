import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  confirmCheckoutPaymentController,
  createCheckoutSessionController,
} from '../controllers/paymentController'
import { requireAuth } from '../middlewares/requireAuth'
import { validateBody } from '../middlewares/validate'
import {
  confirmCheckoutPaymentSchema,
  createCheckoutSessionSchema,
} from '../validations/paymentValidation'

export const paymentRouter = new Hono<AppEnv>()

// All payment routes require authentication
paymentRouter.post(
  '/create-checkout-session',
  requireAuth(),
  validateBody(createCheckoutSessionSchema),
  createCheckoutSessionController,
)

paymentRouter.post(
  '/confirm-checkout-payment',
  requireAuth(),
  validateBody(confirmCheckoutPaymentSchema),
  confirmCheckoutPaymentController,
)
