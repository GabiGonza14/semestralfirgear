import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing reviewService -----------------------
// moderateReview only touches the Review model and the notification dispatcher,
// so those are the only collaborators stubbed here.

const mockSave = mock(async () => {})
let reviewDoc: Record<string, unknown>

// findById(id).populate('userId', ...).populate('productId', ...) — two chained
// populate calls; the second resolves to the document.
const mockPopulate2 = mock(async () => reviewDoc as unknown)
const mockPopulate1 = mock(() => ({ populate: mockPopulate2 }))
const mockReviewFindById = mock(() => ({ populate: mockPopulate1 }))
mock.module('../../models/Review', () => ({ ReviewModel: { findById: mockReviewFindById } }))

const mockDispatch = mock(() => {})
mock.module('../../services/notificationService', () => ({ dispatchNotification: mockDispatch }))

const { moderateReview } = await import('../../services/reviewService')

const ADMIN = 'clerk_admin'

function resetReview() {
  mockSave.mockClear()
  mockPopulate2.mockClear()
  mockPopulate1.mockClear()
  mockReviewFindById.mockClear()
  mockDispatch.mockClear()

  reviewDoc = {
    _id: 'rev1',
    rating: 4,
    comment: 'Buen producto',
    status: 'PENDING',
    rejectionReason: undefined,
    moderatedAt: undefined,
    moderatedByClerkId: undefined,
    userId: { fullName: 'Ana', email: 'ana@example.com' },
    productId: { _id: 'prod1', name: 'Guantes' },
    save: mockSave,
  }
  mockPopulate2.mockImplementation(async () => reviewDoc)
}

describe('moderateReview (HU-50)', () => {
  beforeEach(resetReview)

  it('approves a review without emailing the customer', async () => {
    const result = await moderateReview('rev1', 'approve', { adminClerkId: ADMIN })

    expect(reviewDoc.status).toBe('APPROVED')
    expect(reviewDoc.moderatedByClerkId).toBe(ADMIN)
    expect(reviewDoc.moderatedAt).toBeInstanceOf(Date)
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(result).toMatchObject({ status: 'APPROVED', productName: 'Guantes', reviewerName: 'Ana' })
  })

  it('rejects a review, stores the reason, and emails the customer', async () => {
    await moderateReview('rev1', 'reject', { adminClerkId: ADMIN, reason: 'Contenido ofensivo' })

    expect(reviewDoc.status).toBe('REJECTED')
    expect(reviewDoc.rejectionReason).toBe('Contenido ofensivo')
    expect(mockSave).toHaveBeenCalledTimes(1)

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [message] = mockDispatch.mock.calls[0] as unknown as [
      { type: string; to: string; subject: string; html: string },
    ]
    expect(message).toMatchObject({ type: 'REVIEW_REJECTED', to: 'ana@example.com' })
    expect(message.html).toContain('Contenido ofensivo')
    expect(message.html).toContain('Guantes')
  })

  it('refuses to reject without a reason (no save, no email)', async () => {
    await expect(moderateReview('rev1', 'reject', { adminClerkId: ADMIN })).rejects.toThrow(
      'A rejection reason is required',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('hides a review without emailing the customer', async () => {
    await moderateReview('rev1', 'hide', { adminClerkId: ADMIN })

    expect(reviewDoc.status).toBe('HIDDEN')
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('clears a stale rejection reason when re-approving a rejected review', async () => {
    reviewDoc.status = 'REJECTED'
    reviewDoc.rejectionReason = 'old reason'

    await moderateReview('rev1', 'approve', { adminClerkId: ADMIN })

    expect(reviewDoc.status).toBe('APPROVED')
    expect(reviewDoc.rejectionReason).toBeUndefined()
  })

  it('throws 404 when the review does not exist', async () => {
    mockPopulate2.mockImplementationOnce(async () => null)

    await expect(moderateReview('missing', 'approve', { adminClerkId: ADMIN })).rejects.toThrow(
      'Review not found',
    )
    expect(mockSave).not.toHaveBeenCalled()
  })
})
