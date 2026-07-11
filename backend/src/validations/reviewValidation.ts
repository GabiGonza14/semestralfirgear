import { z } from 'zod'
import { objectIdSchema } from './commonValidation'

// Route param for the per-product review endpoints (GET list / POST create).
export const productIdParamSchema = z.object({
  productId: objectIdSchema,
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
