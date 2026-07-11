import { z } from 'zod'
import { requireAuth } from '../../../backend/src/middlewares/requireAuth'
import { listProductReviews } from '../../../backend/src/services/reviewService'
import { HttpError } from '../../../backend/src/utils/httpError'

export const getProductReviewsInputSchema = z.object({
  productId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'productId must be a valid ObjectId'),
  token: z.string().optional(),
})

export type GetProductReviewsInput = z.infer<typeof getProductReviewsInputSchema>

export interface ReviewEntry {
  rating: number
  comment: string | null
  reviewerName: string
  createdAt: Date | string | null
}

export interface ProductReviewsResult {
  found: true
  productId: string
  summary: {
    count: number
    averageRating: number
    distribution: Record<'1' | '2' | '3' | '4' | '5', number>
  }
  reviews: ReviewEntry[]
}

export interface ProductNotFound {
  found: false
  productId: string
  message: string
}

export type GetProductReviewsResult = ProductReviewsResult | ProductNotFound

export async function getProductReviewsTool(raw: unknown): Promise<GetProductReviewsResult> {
  const input = getProductReviewsInputSchema.parse(raw)

  // Public read (AC): a token is accepted but not required. requireAuth is soft
  // and never throws — it just keeps the auth pipeline uniform across tools.
  await requireAuth(input.token)

  try {
    const { summary, reviews } = await listProductReviews(input.productId)
    return {
      found: true,
      productId: input.productId,
      summary,
      reviews: reviews.map((review) => ({
        rating: review.rating,
        comment: review.comment,
        reviewerName: review.reviewerName,
        createdAt: review.createdAt,
      })),
    }
  } catch (err) {
    // Turn the service's 404 into a clean, agent-friendly result instead of a stack.
    if (err instanceof HttpError && err.statusCode === 404) {
      return {
        found: false,
        productId: input.productId,
        message: 'No product exists with the given productId',
      }
    }
    throw err
  }
}
