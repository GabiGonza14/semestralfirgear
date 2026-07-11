import { Types } from 'mongoose'
import { env } from '../config/env'
import { OrderItemModel } from '../models/OrderItem'
import { OrderModel } from '../models/Order'
import { ProductModel } from '../models/Product'
import { ReviewModel } from '../models/Review'
import { UserModel } from '../models/User'
import { HttpError } from '../utils/httpError'
import {
  ACTION_TO_STATUS,
  PUBLIC_REVIEW_STATUS,
  type ModerationAction,
  type ReviewStatus,
} from '../utils/reviewStatus'
import { dispatchNotification } from './notificationService'

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
  // HU-50: the moderation status of the viewer's OWN review, when they have one
  // (null otherwise). Lets the product page tell "en revisión" apart from
  // "ya publicada" apart from "rechazada" instead of one generic thank-you note.
  ownReviewStatus: ReviewStatus | null
}

const ANONYMOUS_VIEWER: ReviewViewerState = {
  authenticated: false,
  purchased: false,
  hasReviewed: false,
  canReview: false,
  ownReviewStatus: null,
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
    return {
      authenticated: true,
      purchased: false,
      hasReviewed: false,
      canReview: false,
      ownReviewStatus: null,
    }
  }

  const [purchased, ownReview] = await Promise.all([
    hasPurchasedProduct(viewer._id, productId),
    ReviewModel.findOne({ userId: viewer._id, productId }).select('status'),
  ])
  const hasReviewed = Boolean(ownReview)

  return {
    authenticated: true,
    purchased,
    hasReviewed,
    canReview: purchased && !hasReviewed,
    ownReviewStatus: ownReview ? (ownReview.status as ReviewStatus) : null,
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
    // HU-50: only APPROVED reviews are public — PENDING/REJECTED/HIDDEN never
    // reach the catalog and are excluded from the rating summary below.
    ReviewModel.find({ productId, status: PUBLIC_REVIEW_STATUS })
      .populate('userId', 'fullName')
      .sort({ createdAt: -1 }),
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
      // status defaults to PENDING (HU-50) — the review is not public until an
      // admin approves it.
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

  // Pass the author's clerkUserId through so the response's `viewer` flags
  // reflect the review just submitted (hasReviewed/ownReviewStatus) instead of
  // the anonymous default — otherwise the product page's "gracias" note doesn't
  // appear until the next unrelated re-fetch.
  return listProductReviews(payload.productId, payload.clerkUserId)
}

// ---------------------------------------------------------------------------
// HU-50: admin moderation
// ---------------------------------------------------------------------------

export interface AdminReviewItem {
  id: string
  productId: string
  productName: string
  reviewerName: string
  reviewerEmail: string
  rating: number
  comment: string | null
  status: ReviewStatus
  rejectionReason: string | null
  createdAt: Date | string | null
  moderatedAt: Date | string | null
}

interface PopulatedReviewerFull {
  fullName?: string
  email?: string
}

interface PopulatedProduct {
  _id?: unknown
  name?: string
}

function mapAdminReview(review: InstanceType<typeof ReviewModel>): AdminReviewItem {
  const reviewer = review.userId as unknown as PopulatedReviewerFull | null
  const product = review.productId as unknown as PopulatedProduct | null

  return {
    id: String(review._id),
    productId:
      product && typeof product === 'object' && product._id
        ? String(product._id)
        : String(review.productId),
    productName: product?.name ?? 'Producto eliminado',
    reviewerName: reviewer?.fullName ?? 'Cliente',
    reviewerEmail: reviewer?.email ?? '',
    rating: review.rating,
    comment: review.comment ?? null,
    status: review.status as ReviewStatus,
    rejectionReason: review.rejectionReason ?? null,
    createdAt: review.createdAt,
    moderatedAt: review.moderatedAt ?? null,
  }
}

/**
 * Admin moderation queue (HU-50). Lists reviews with the product and reviewer
 * joined in, newest first. `statusFilter` optionally narrows to one moderation
 * state (e.g. PENDING) — omitted returns every review.
 */
export async function listReviewsForModeration(statusFilter?: ReviewStatus): Promise<AdminReviewItem[]> {
  const query = statusFilter ? { status: statusFilter } : {}
  const reviews = await ReviewModel.find(query)
    .populate('userId', 'fullName email')
    .populate('productId', 'name')
    .sort({ createdAt: -1 })

  return reviews.map(mapAdminReview)
}

interface ModerateReviewOptions {
  adminClerkId?: string | null
  reason?: string
}

/**
 * Applies a moderation action (approve / reject / hide) to a review (HU-50).
 * Records who acted and when; a rejection additionally stores the reason and
 * emails the customer. Only APPROVED reviews remain visible in the catalog, so
 * rejecting or hiding a previously-approved review takes it down immediately.
 */
export async function moderateReview(
  reviewId: string,
  action: ModerationAction,
  options: ModerateReviewOptions = {},
): Promise<AdminReviewItem> {
  const review = await ReviewModel.findById(reviewId)
    .populate('userId', 'fullName email')
    .populate('productId', 'name')

  if (!review) {
    throw new HttpError(404, 'Review not found')
  }

  const reason = options.reason?.trim()
  if (action === 'reject' && !reason) {
    throw new HttpError(400, 'A rejection reason is required')
  }

  review.status = ACTION_TO_STATUS[action]
  review.moderatedAt = new Date()
  review.moderatedByClerkId = options.adminClerkId ?? undefined
  // The reason only belongs to a rejection; clear it for approve/hide so a later
  // re-moderation never shows a stale reason.
  review.rejectionReason = action === 'reject' ? reason : undefined
  await review.save()

  if (action === 'reject' && reason) {
    notifyCustomerReviewRejected(review, reason)
  }

  return mapAdminReview(review)
}

// Side effect for a rejected review (AC): email the author with the reason.
// Fire-and-forget via dispatchNotification so it never blocks the response.
function notifyCustomerReviewRejected(
  review: InstanceType<typeof ReviewModel>,
  reason: string,
) {
  const reviewer = review.userId as unknown as PopulatedReviewerFull | null
  const product = review.productId as unknown as PopulatedProduct | null
  const email = reviewer?.email

  if (!email) {
    console.warn('[review-rejected] cannot notify: review author has no email', {
      reviewId: String(review._id),
    })
    return
  }

  dispatchNotification({
    type: 'REVIEW_REJECTED',
    to: email,
    subject: 'Tu reseña en FITGEAR no fue publicada',
    html: buildReviewRejectedEmailHtml({
      name: reviewer?.fullName,
      productName: product?.name,
      reason,
    }),
  })
}

function buildReviewRejectedEmailHtml(params: {
  name?: string
  productName?: string
  reason: string
}): string {
  const greeting = params.name ? `Hola ${params.name},` : 'Hola,'
  const productLine = params.productName
    ? `tu reseña sobre <strong>${params.productName}</strong>`
    : 'tu reseña'
  const shopUrl = `${env.frontendUrl}/shop`

  return `
  <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
    <h2 style="color: #b91c1c;">Tu reseña no fue publicada</h2>
    <p>${greeting}</p>
    <p>Revisamos ${productLine} y no pudimos publicarla en la tienda por la siguiente razón:</p>
    <p style="background:#fef2f2; border-radius:8px; padding:12px 16px; color:#991b1b;">
      ${params.reason}
    </p>
    <p>Puedes escribir una nueva reseña que cumpla con nuestras normas de la comunidad.</p>
    <p style="margin: 24px 0;">
      <a href="${shopUrl}"
         style="background:#84cc16; color:#0f172a; padding:12px 24px; border-radius:9999px;
                text-decoration:none; font-weight:bold;">Ir a la tienda</a>
    </p>
    <p style="color:#94a3b8; font-size:12px;">Gracias por ser parte de FITGEAR. — Equipo FITGEAR</p>
  </div>`
}
