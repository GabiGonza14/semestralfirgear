import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  confirmCheckoutPaymentController,
  createCheckoutSessionController,
} from '../controllers/paymentController'
import { validateBody } from '../middlewares/validate'
import {
  confirmCheckoutPaymentSchema,
  createCheckoutSessionSchema,
} from '../validations/paymentValidation'

export const paymentRouter = new Hono<AppEnv>()

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
