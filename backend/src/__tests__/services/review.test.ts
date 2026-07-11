import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing reviewService -----------------------
// Each Mongoose model is stubbed so the service's business rules (verified
// purchase, one-per-product, summary math, viewer flags) can be exercised
// without a database.

// User: findOne(...).select('_id')
const mockUserSelect = mock(async () => ({ _id: 'user1' }) as unknown)
const mockUserFindOne = mock(() => ({ select: mockUserSelect }))
mock.module('../../models/User', () => ({ UserModel: { findOne: mockUserFindOne } }))

// Product: exists(...) and findById(...).select('_id')
const mockProductExists = mock(async () => ({ _id: 'prod1' }) as unknown)
const mockProductSelect = mock(async () => ({ _id: 'prod1' }) as unknown)
const mockProductFindById = mock(() => ({ select: mockProductSelect }))
mock.module('../../models/Product', () => ({
  ProductModel: { exists: mockProductExists, findById: mockProductFindById },
}))

// Order: find(...).distinct('_id')
const mockOrderDistinct = mock(async () => ['order1'] as unknown[])
const mockOrderFind = mock(() => ({ distinct: mockOrderDistinct }))
mock.module('../../models/Order', () => ({ OrderModel: { find: mockOrderFind } }))

// OrderItem: exists(...)
const mockOrderItemExists = mock(async () => ({ _id: 'oi1' }) as unknown)
mock.module('../../models/OrderItem', () => ({ OrderItemModel: { exists: mockOrderItemExists } }))

// Review: find(...).populate(...).sort(...), exists(...), create(...),
// findOne(...).select(...) (viewer's own review, for resolveViewerState).
let reviewDocs: unknown[] = []
const mockReviewSort = mock(async () => reviewDocs)
const mockReviewPopulate = mock(() => ({ sort: mockReviewSort }))
const mockReviewFind = mock(() => ({ populate: mockReviewPopulate }))
const mockReviewExists = mock(async () => null as unknown)
const mockReviewCreate = mock(async () => ({}) as unknown)
const mockOwnReviewSelect = mock(async () => null as unknown)
const mockReviewFindOne = mock(() => ({ select: mockOwnReviewSelect }))
mock.module('../../models/Review', () => ({
  ReviewModel: {
    find: mockReviewFind,
    exists: mockReviewExists,
    create: mockReviewCreate,
    findOne: mockReviewFindOne,
  },
}))

const { createReview, listProductReviews } = await import('../../services/reviewService')

const CLERK_ID = 'clerk_customer'
const PRODUCT_ID = '6a45b10c734e87ac028fc97e'

function resetToHappyPath() {
  for (const m of [
    mockUserSelect,
    mockUserFindOne,
    mockProductExists,
    mockProductSelect,
    mockProductFindById,
    mockOrderDistinct,
    mockOrderFind,
    mockOrderItemExists,
    mockReviewSort,
    mockReviewPopulate,
    mockReviewFind,
    mockReviewExists,
    mockReviewCreate,
    mockOwnReviewSelect,
    mockReviewFindOne,
  ]) {
    m.mockClear()
  }

  reviewDocs = []
  mockUserSelect.mockImplementation(async () => ({ _id: 'user1' }))
  mockProductExists.mockImplementation(async () => ({ _id: 'prod1' }))
  mockProductSelect.mockImplementation(async () => ({ _id: 'prod1' }))
  mockOrderDistinct.mockImplementation(async () => ['order1'])
  mockOrderItemExists.mockImplementation(async () => ({ _id: 'oi1' }))
  mockReviewExists.mockImplementation(async () => null)
  mockOwnReviewSelect.mockImplementation(async () => null)
  mockReviewCreate.mockImplementation(async () => ({}))
}

describe('createReview (HU-49)', () => {
  beforeEach(resetToHappyPath)

  it('creates a review when the customer purchased the product and has none yet', async () => {
    await createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 5, comment: 'Great' })

    expect(mockReviewCreate).toHaveBeenCalledTimes(1)
    const [doc] = mockReviewCreate.mock.calls[0] as unknown as [
      { userId: unknown; productId: unknown; rating: number; comment?: string },
    ]
    expect(doc).toMatchObject({ rating: 5, comment: 'Great' })
    expect(doc.userId).toBe('user1')
    expect(doc.productId).toBe('prod1')
  })

  it('returns the AUTHOR\'s viewer state (hasReviewed: true) right away, not the anonymous default', async () => {
    // Regression: createReview used to call listProductReviews without the
    // author's clerkUserId, so the "gracias por tu reseña" note never showed
    // immediately after submitting — only on a later, unrelated re-fetch.
    mockOwnReviewSelect.mockImplementation(async () => ({ status: 'PENDING' }))

    const result = await createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 5 })

    expect(result.viewer).toMatchObject({
      authenticated: true,
      hasReviewed: true,
      canReview: false,
      ownReviewStatus: 'PENDING',
    })
  })

  it('rejects with 403 when the customer never purchased the product', async () => {
    // No qualifying order line for this product.
    mockOrderItemExists.mockImplementation(async () => null)

    await expect(
      createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 4 }),
    ).rejects.toThrow('You can only review products you have purchased')
    expect(mockReviewCreate).not.toHaveBeenCalled()
  })

  it('rejects with 403 when the customer has no completed orders at all', async () => {
    mockOrderDistinct.mockImplementation(async () => [])

    await expect(
      createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 4 }),
    ).rejects.toThrow('You can only review products you have purchased')
    // Short-circuits before even querying order items.
    expect(mockOrderItemExists).not.toHaveBeenCalled()
    expect(mockReviewCreate).not.toHaveBeenCalled()
  })

  it('rejects with 409 when the customer already reviewed the product', async () => {
    mockReviewExists.mockImplementation(async () => ({ _id: 'existing' }))

    await expect(
      createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 3 }),
    ).rejects.toThrow('You have already reviewed this product')
    expect(mockReviewCreate).not.toHaveBeenCalled()
  })

  it('rejects with 404 when the signed-in user has no FITGEAR profile', async () => {
    mockUserSelect.mockImplementation(async () => null)

    await expect(
      createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 5 }),
    ).rejects.toThrow('User not found')
    expect(mockReviewCreate).not.toHaveBeenCalled()
  })

  it('rejects with 404 when the product does not exist', async () => {
    mockProductSelect.mockImplementation(async () => null)

    await expect(
      createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 5 }),
    ).rejects.toThrow('Product not found')
    expect(mockReviewCreate).not.toHaveBeenCalled()
  })

  it('maps a duplicate-key race to a clean 409', async () => {
    mockReviewCreate.mockImplementation(async () => {
      throw new Error('E11000 duplicate key error')
    })

    await expect(
      createReview({ clerkUserId: CLERK_ID, productId: PRODUCT_ID, rating: 5 }),
    ).rejects.toThrow('You have already reviewed this product')
  })
})

describe('listProductReviews (HU-49)', () => {
  beforeEach(resetToHappyPath)

  it('computes count, average (1 decimal) and per-star distribution', async () => {
    reviewDocs = [
      { _id: 'r1', rating: 5, comment: 'A', userId: { fullName: 'Ana' }, createdAt: new Date() },
      { _id: 'r2', rating: 4, comment: null, userId: { fullName: 'Ben' }, createdAt: new Date() },
      { _id: 'r3', rating: 4, comment: 'C', userId: { fullName: 'Cy' }, createdAt: new Date() },
      { _id: 'r4', rating: 2, comment: 'D', userId: { fullName: 'Di' }, createdAt: new Date() },
    ]

    const result = await listProductReviews(PRODUCT_ID)

    expect(result.summary.count).toBe(4)
    // (5+4+4+2)/4 = 3.75 -> 3.8
    expect(result.summary.averageRating).toBe(3.8)
    expect(result.summary.distribution).toMatchObject({ '5': 1, '4': 2, '2': 1, '3': 0, '1': 0 })
    expect(result.reviews[0]).toMatchObject({ reviewerName: 'Ana', rating: 5 })
  })

  it('returns a zeroed summary and anonymous viewer when there are no reviews', async () => {
    reviewDocs = []

    const result = await listProductReviews(PRODUCT_ID)

    expect(result.summary).toMatchObject({ count: 0, averageRating: 0 })
    expect(result.viewer).toMatchObject({
      authenticated: false,
      purchased: false,
      hasReviewed: false,
      canReview: false,
    })
  })

  it('flags canReview for a signed-in purchaser who has not reviewed yet', async () => {
    reviewDocs = []

    const result = await listProductReviews(PRODUCT_ID, CLERK_ID)

    expect(result.viewer).toMatchObject({
      authenticated: true,
      purchased: true,
      hasReviewed: false,
      canReview: true,
    })
  })

  it('does not allow a second review: purchased but already reviewed -> canReview false', async () => {
    reviewDocs = []
    mockOwnReviewSelect.mockImplementation(async () => ({ status: 'PENDING' }))

    const result = await listProductReviews(PRODUCT_ID, CLERK_ID)

    expect(result.viewer).toMatchObject({
      purchased: true,
      hasReviewed: true,
      canReview: false,
      ownReviewStatus: 'PENDING',
    })
  })

  it('rejects with 404 when the product does not exist', async () => {
    mockProductExists.mockImplementation(async () => null)

    await expect(listProductReviews(PRODUCT_ID)).rejects.toThrow('Product not found')
  })
})
