import { z } from 'zod'
import { objectIdSchema } from './commonValidation'

export const createCheckoutSessionSchema = z.object({
  orderId: objectIdSchema,
})

export const confirmCheckoutPaymentSchema = z.object({
  orderId: objectIdSchema,
  sessionId: z
    .string()
    .trim()
    .min(1, 'sessionId cannot be empty')
    .max(500, 'sessionId is too long')
    .optional(),
})
