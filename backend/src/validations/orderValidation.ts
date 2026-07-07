import { z } from 'zod'
import { objectIdSchema } from './commonValidation'

const sizeLabelSchema = z.enum(['XS', 'S', 'M', 'L', 'XL', 'XXL'])

export const createOrderSchema = z.object({
  userId: objectIdSchema,
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        quantity: z.number().int().gt(0, 'quantity must be greater than 0'),
        size: sizeLabelSchema.optional(),
      }),
    )
    .min(1, 'items must contain at least one item'),
})

export const userIdParamSchema = z.object({
  userId: objectIdSchema,
})

// Shipping an order (HU-31). trackingNumber is optional — included in the
// customer email only "if available". Empty/whitespace collapses to undefined so
// a blank field never renders an empty tracking line in the email.
export const shipOrderSchema = z.object({
  trackingNumber: z
    .string()
    .trim()
    .max(64, 'trackingNumber must be at most 64 characters')
    .optional()
    .transform((value) => (value ? value : undefined)),
})
