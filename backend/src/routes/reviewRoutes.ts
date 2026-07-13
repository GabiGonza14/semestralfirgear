import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  createReviewController,
  getProductReviewsController,
  getReviewsForModerationController,
  moderateReviewController,
} from '../controllers/reviewController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate'
import { idParamSchema } from '../validations/commonValidation'
import {
  createReviewSchema,
  moderateReviewSchema,
  productIdParamSchema,
  reviewModerationQuerySchema,
} from '../validations/reviewValidation'

export const reviewRouter = new Hono<AppEnv>()

// HU-50: admin moderation queue — list every review (optionally filtered by
// status). Admin-only; registered before the public product route so the bare
// GET / never falls through to it.
reviewRouter.get(
  '/',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateQuery(reviewModerationQuerySchema),
  getReviewsForModerationController,
)

// HU-50: approve / reject / hide a review. Admin-only; a rejection emails the
// customer with the reason.
reviewRouter.patch(
  '/:id/moderate',
  requireAuthMiddleware(),
  requireAdminMiddleware(),
  validateParams(idParamSchema),
  validateBody(moderateReviewSchema),
  moderateReviewController,
)

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
