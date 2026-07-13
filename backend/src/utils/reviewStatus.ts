// HU-50: review moderation lifecycle. Single source of truth for the set of
// statuses and the admin action -> status mapping, shared by the model, the
// validation schema and the service.
//
// Reviews are pre-moderated: a newly created review starts PENDING and is NOT
// shown in the catalog until an admin APPROVES it. REJECTED (with a reason,
// emailed to the customer) and HIDDEN are also invisible in the catalog; only
// APPROVED reviews are public and counted in a product's rating.

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] as const

export type ReviewStatus = (typeof REVIEW_STATUSES)[number]

// The only status that is publicly visible / counted in the rating summary.
export const PUBLIC_REVIEW_STATUS: ReviewStatus = 'APPROVED'

export const MODERATION_ACTIONS = ['approve', 'reject', 'hide'] as const

export type ModerationAction = (typeof MODERATION_ACTIONS)[number]

export const ACTION_TO_STATUS: Record<ModerationAction, ReviewStatus> = {
  approve: 'APPROVED',
  reject: 'REJECTED',
  hide: 'HIDDEN',
}
