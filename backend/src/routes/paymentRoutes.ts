import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  confirmCheckoutPaymentController,
  createCheckoutSessionController,
} from '../controllers/paymentController'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody } from '../middlewares/validate'
import {
  confirmCheckoutPaymentSchema,
  createCheckoutSessionSchema,
} from '../validations/paymentValidation'

export const paymentRouter = new Hono<AppEnv>()

// Checkout actions require a valid Clerk JWT (the Stripe webhook is
// registered separately in app.ts, before this router, and is unauthenticated).
paymentRouter.use('*', requireAuthMiddleware())

paymentRouter.post(
  '/create-checkout-session',
  validateBody(createCheckoutSessionSchema),
  createCheckoutSessionController,
)

paymentRouter.post(
  '/confirm-checkout-payment',
  validateBody(confirmCheckoutPaymentSchema),
  confirmCheckoutPaymentController,
)
