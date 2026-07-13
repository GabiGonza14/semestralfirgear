import { z } from 'zod'
import { ORDER_LIFECYCLE_STATUSES } from '../utils/orderStatus'
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

// Refunding an order (HU-29). reason is optional — recorded in the order history
// and shown in the customer email when present. Blank collapses to undefined.
export const refundOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, 'reason must be at most 500 characters')
    .optional()
    .transform((value) => (value ? value : undefined)),
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

// Manual admin status change (HU-42). `status` must be a lifecycle status;
// whether the transition is actually allowed is enforced by the state machine in
// the service. trackingNumber is only meaningful when moving to SHIPPED; reason
// is only meaningful when cancelling a PAID order (triggers a real refund).
export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_LIFECYCLE_STATUSES),
  trackingNumber: z
    .string()
    .trim()
    .max(64, 'trackingNumber must be at most 64 characters')
    .optional()
    .transform((value) => (value ? value : undefined)),
  reason: z
    .string()
    .trim()
    .max(500, 'reason must be at most 500 characters')
    .optional()
    .transform((value) => (value ? value : undefined)),
})
