import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { requireAuth } from '../middlewares/requireAuth'
import { createReview, listProductReviews } from '../services/reviewService'
import { HttpError } from '../utils/httpError'

export const getProductReviewsController = async (c: Context<AppEnv>) => {
  const { productId } = c.get('validatedParams') as { productId: string }
  // Soft-auth: the list is public, but if the caller happens to be signed in we
  // resolve their Clerk id so the response can carry their review-eligibility
  // flags. A missing/invalid token just yields anonymous viewer state.
  const auth = await requireAuth(c.req.header('Authorization') ?? undefined)
  const result = await listProductReviews(productId, auth.userId)
  return c.json(result, 200)
}

export const createReviewController = async (c: Context<AppEnv>) => {
  const { productId } = c.get('validatedParams') as { productId: string }
  const { rating, comment } = c.get('validatedBody') as { rating: number; comment?: string }
  // requireAuthMiddleware put the Clerk userId on the context; the service maps
  // it to the FITGEAR profile and enforces the verified-purchase / one-per-
  // product rules.
  const clerkUserId = c.get('userId')
  if (!clerkUserId) {
    throw new HttpError(401, 'No se proporcionó token de autenticación')
  }

  const result = await createReview({ clerkUserId, productId, rating, comment })
  return c.json(result, 201)
}
