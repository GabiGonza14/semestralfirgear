import { Types } from 'mongoose'
import { OrderItemModel } from '../models/OrderItem'
import { OrderModel } from '../models/Order'
import { ProductModel } from '../models/Product'
import { ReviewModel } from '../models/Review'
import { UserModel } from '../models/User'
import { HttpError } from '../utils/httpError'

type ObjectIdLike = Types.ObjectId | string

// A review may only be left once the purchase has actually gone through. These
// are the same statuses that count as realized revenue (see adminService
// REVENUE_STATUSES): a PENDING/FAILED/CANCELLED/REFUNDED order is not a
// completed purchase and must not unlock reviewing.
const PURCHASED_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED'] as const

interface CreateReviewPayload {
  clerkUserId: string
  productId: string
  rating: number
  comment?: string
}

export interface ReviewSummary {
  count: number
  // Mean rating rounded to one decimal, or 0 when there are no reviews.
  averageRating: number
  // How many reviews gave each star value (1..5), for a ratings breakdown.
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
}

interface PopulatedReviewer {
  fullName?: string
}

// Whether a given customer owns a completed order containing the product — the
// verified-purchase check, shared by the write path (createReview) and the
// viewer-eligibility flags on the public read path (listProductReviews).
async function hasPurchasedProduct(userId: ObjectIdLike, productId: ObjectIdLike): Promise<boolean> {
  const purchasedOrderIds = await OrderModel.find({
    userId,
    status: { $in: [...PURCHASED_STATUSES] },
  }).distinct('_id')

  if (purchasedOrderIds.length === 0) {
    return false
  }

  const line = await OrderItemModel.exists({
    orderId: { $in: purchasedOrderIds },
    productId,
  })
  return Boolean(line)
}

function summarize(reviews: Array<{ rating: number }>): ReviewSummary {
  const distribution: ReviewSummary['distribution'] = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  let total = 0

  for (const review of reviews) {
    total += review.rating
    const key = String(review.rating) as keyof ReviewSummary['distribution']
    if (key in distribution) {
      distribution[key] += 1
    }
  }

  const count = reviews.length
  const averageRating = count === 0 ? 0 : Math.round((total / count) * 10) / 10

  return { count, averageRating, distribution }
}

// Eligibility flags for the (optional) authenticated viewer of the review list.
// Drives the product page's write UI without leaking anything or needing extra
// round trips: purchased but not yet reviewed -> show the form; already reviewed
// -> show a "gracias" note; not purchased -> no form.
export interface ReviewViewerState {
  authenticated: boolean
  purchased: boolean
  hasReviewed: boolean
  canReview: boolean
}

const ANONYMOUS_VIEWER: ReviewViewerState = {
  authenticated: false,
  purchased: false,
  hasReviewed: false,
  canReview: false,
}

async function resolveViewerState(
  productId: ObjectIdLike,
  viewerClerkId?: string | null,
): Promise<ReviewViewerState> {
  if (!viewerClerkId) {
    return ANONYMOUS_VIEWER
  }

  const viewer = await UserModel.findOne({ clerkUserId: viewerClerkId }).select('_id')
  if (!viewer) {
    // A valid token but no synced FITGEAR profile yet — treat as signed-in but
    // unable to review.
    return { authenticated: true, purchased: false, hasReviewed: false, canReview: false }
  }

  const [purchased, hasReviewed] = await Promise.all([
    hasPurchasedProduct(viewer._id, productId),
    ReviewModel.exists({ userId: viewer._id, productId }).then(Boolean),
  ])

  return {
    authenticated: true,
    purchased,
    hasReviewed,
    canReview: purchased && !hasReviewed,
  }
}

/**
 * Lists a product's reviews (newest first) together with an aggregate summary
 * (count, average, per-star distribution). Public read — used by the product
 * detail page and the get_product_reviews MCP tool. Verifies the product exists
 * so a bad id is a clean 404 rather than a silently empty list.
 *
 * `viewerClerkId` is optional (soft-auth): when the caller is signed in, the
 * result also carries their eligibility flags so the UI knows whether to show
 * the write form — anonymous callers just get the public data.
 */
export async function listProductReviews(productId: string, viewerClerkId?: string | null) {
  const productExists = await ProductModel.exists({ _id: productId })
  if (!productExists) {
    throw new HttpError(404, 'Product not found')
  }

  const [reviews, viewer] = await Promise.all([
    ReviewModel.find({ productId }).populate('userId', 'fullName').sort({ createdAt: -1 }),
    resolveViewerState(productId, viewerClerkId),
  ])

  const summary = summarize(reviews)

  const items = reviews.map((review) => {
    const reviewer = review.userId as unknown as PopulatedReviewer | null
    return {
      id: String(review._id),
      rating: review.rating,
      comment: review.comment ?? null,
      // Reviewer's name for display; falls back gracefully if the user record
      // was removed. The userId itself is intentionally not exposed publicly.
      reviewerName:
        typeof review.userId === 'string' ? 'Cliente' : reviewer?.fullName ?? 'Cliente',
      createdAt: review.createdAt,
    }
  })

  return { summary, reviews: items, viewer }
}

/**
 * Creates a product review on behalf of the authenticated customer. Enforces the
 * two HU-49 write rules the schema can't fully guarantee on its own:
 *  1. verified purchase — the customer must have a completed (PAID/SHIPPED/
 *     DELIVERED) order containing this product;
 *  2. one review per product — a duplicate is rejected with a clean 409 (the
 *     compound unique index is the race-safe backstop).
 */
export async function createReview(payload: CreateReviewPayload) {
  const user = await UserModel.findOne({ clerkUserId: payload.clerkUserId }).select('_id')
  if (!user) {
    throw new HttpError(404, 'User not found')
  }

  const product = await ProductModel.findById(payload.productId).select('_id')
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  // Verified-purchase gate: the customer must own a completed order that
  // includes this product.
  const purchased = await hasPurchasedProduct(user._id, product._id)
  if (!purchased) {
    throw new HttpError(403, 'You can only review products you have purchased')
  }

  const alreadyReviewed = await ReviewModel.exists({ userId: user._id, productId: product._id })
  if (alreadyReviewed) {
    throw new HttpError(409, 'You have already reviewed this product')
  }

  try {
    await ReviewModel.create({
      userId: user._id,
      productId: product._id,
      rating: payload.rating,
      comment: payload.comment,
    })
  } catch (error) {
    // Race backstop: two concurrent submits can both pass the pre-check above;
    // the unique index then rejects the second with a duplicate-key error, which
    // we surface as the same clean 409.
    if (error instanceof Error && error.message.includes('E11000')) {
      throw new HttpError(409, 'You have already reviewed this product')
    }
    throw error
  }

  return listProductReviews(payload.productId)
}
