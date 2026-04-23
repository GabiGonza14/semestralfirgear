import { z } from 'zod'
import { objectIdSchema } from './commonValidation'

export const createOrderSchema = z.object({
  userId: objectIdSchema,
  items: z
    .array(
      z.object({
        productId: objectIdSchema,
        quantity: z.number().int().gt(0, 'quantity must be greater than 0'),
      }),
    )
    .min(1, 'items must contain at least one item'),
})

export const userIdParamSchema = z.object({
  userId: objectIdSchema,
})
