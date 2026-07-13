import { z } from 'zod'
import { MODERATION_ACTIONS, REVIEW_STATUSES } from '../utils/reviewStatus'
import { objectIdSchema } from './commonValidation'

// Route param for the per-product review endpoints (GET list / POST create).
export const productIdParamSchema = z.object({
  productId: objectIdSchema,
})

// HU-50: optional ?status= filter for the admin moderation queue.
export const reviewModerationQuerySchema = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
})

// HU-50: body for moderating a review. `reason` is required (and enforced again
// in the service) only when rejecting — that's the text emailed to the customer.
export const moderateReviewSchema = z
  .object({
    action: z.enum(MODERATION_ACTIONS),
    reason: z
      .string()
      .trim()
      .max(500, 'reason must be at most 500 characters')
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .refine((data) => data.action !== 'reject' || Boolean(data.reason), {
    path: ['reason'],
    message: 'A reason is required when rejecting a review',
  })

// Body for creating a review (HU-49). Rating is a required integer 1–5; comment
// is optional and blank/whitespace collapses to undefined so an empty box never
// stores as a real comment.
export const createReviewSchema = z.object({
  rating: z
    .number()
    .int('rating must be an integer')
    .min(1, 'rating must be between 1 and 5')
    .max(5, 'rating must be between 1 and 5'),
  comment: z
    .string()
    .trim()
    .max(1000, 'comment must be at most 1000 characters')
    .optional()
    .transform((value) => (value ? value : undefined)),
})
