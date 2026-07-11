import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createReviewController,
  getProductReviewsController,
} from '../controllers/reviewController'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams } from '../middlewares/validate'
import { createReviewSchema, productIdParamSchema } from '../validations/reviewValidation'

export const reviewRouter = new Hono<AppEnv>()

// Reading a product's reviews + rating summary is public (AC: shown on the
// product detail page for everyone). No auth middleware on this route.
reviewRouter.get(
  '/product/:productId',
  validateParams(productIdParamSchema),
  getProductReviewsController,
)

// Creating a review requires a valid Clerk JWT; the service then enforces the
// verified-purchase and one-per-product rules (a signed-in customer who hasn't
// bought the product still gets 403).
reviewRouter.post(
  '/product/:productId',
  requireAuthMiddleware(),
  validateParams(productIdParamSchema),
  validateBody(createReviewSchema),
  createReviewController,
)
