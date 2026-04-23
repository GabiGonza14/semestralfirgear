import { Router } from 'express'
import {
  confirmCheckoutPaymentController,
  createCheckoutSessionController,
} from '../controllers/paymentController'
import { validateBody } from '../middlewares/validate'
import {
  confirmCheckoutPaymentSchema,
  createCheckoutSessionSchema,
} from '../validations/paymentValidation'

export const paymentRouter = Router()

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
