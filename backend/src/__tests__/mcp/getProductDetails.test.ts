import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { HttpError } from '../../utils/httpError'

// Mock the productService before importing the tool so the module
// resolves to the mocked version.
const mockGetProductById = mock(async () => ({}))

// Export both service fns so this mock coexists with searchProducts.test.ts —
// Bun's mock.module is global across the run, so a partial mock would break
// the other suite's import.
mock.module('../../services/productService', () => ({
  getProductById: mockGetProductById,
  listProducts: mock(async () => []),
  updateProduct: mock(async () => ({})),
}))

// requireAuth is a soft-auth — always resolves for public tools.
mock.module('../../middlewares/requireAuth', () => ({
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mock(async () => { throw new Error('Unauthorized') }),
}))

// Import after mocking so the tool picks up the mocked modules.
const { getProductDetailsTool } = await import('../../mcp/tools/getProductDetails')

const VALID_ID = '507f1f77bcf86cd799439011'

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  _id: VALID_ID,
  name: 'Test Kettlebell',
  description: 'A solid cast-iron kettlebell',
  price: 49.99,
  finalPrice: 44.99,
  stock: 10,
  images: ['/uploads/products/test.webp', '/uploads/products/test-2.webp'],
  categoryId: { name: 'Pesas' },
  isActive: true,
  hasDiscount: true,
  discountPercentage: 10,
  discountAmount: 5,
  ...overrides,
})

describe('getProductDetailsTool', () => {
  beforeEach(() => {
    mockGetProductById.mockClear()
  })

  it('happy path — returns full mapped product detail', async () => {
    mockGetProductById.mockResolvedValueOnce(makeProduct())

    const result = await getProductDetailsTool({ productId: VALID_ID })

    expect(result).toEqual({
      found: true,
      id: VALID_ID,
      name: 'Test Kettlebell',
      description: 'A solid cast-iron kettlebell',
      price: 49.99,
      finalPrice: 44.99,
      discount: { percentage: 10, amount: 5 },
      stock: 10,
      isActive: true,
      category: 'Pesas',
      images: ['/uploads/products/test.webp', '/uploads/products/test-2.webp'],
    })
    expect(mockGetProductById).toHaveBeenCalledWith(VALID_ID)
  })

  it('discount null when product has no discount', async () => {
    mockGetProductById.mockResolvedValueOnce(
      makeProduct({ hasDiscount: false, discountPercentage: 0, discountAmount: 0 }),
    )

    const result = await getProductDetailsTool({ productId: VALID_ID })

    expect(result).toMatchObject({ found: true, discount: null })
  })

  it('not-found — returns clean result instead of throwing', async () => {
    mockGetProductById.mockImplementationOnce(async () => {
      throw new HttpError(404, 'Product not found')
    })

    const result = await getProductDetailsTool({ productId: VALID_ID })

    expect(result).toEqual({
      found: false,
      productId: VALID_ID,
      message: 'No product exists with the given productId',
    })
  })

  it('rethrows non-404 service errors', async () => {
    mockGetProductById.mockImplementationOnce(async () => {
      throw new HttpError(500, 'Database exploded')
    })

    await expect(getProductDetailsTool({ productId: VALID_ID })).rejects.toThrow('Database exploded')
  })

  it('throws ZodError on invalid ObjectId input', async () => {
    await expect(getProductDetailsTool({ productId: 'not-an-objectid' })).rejects.toThrow()
    expect(mockGetProductById).not.toHaveBeenCalled()
  })

  it('throws ZodError when productId is missing', async () => {
    await expect(getProductDetailsTool({})).rejects.toThrow()
  })

  it('product without populated category returns empty category string', async () => {
    mockGetProductById.mockResolvedValueOnce(makeProduct({ categoryId: null }))

    const result = await getProductDetailsTool({ productId: VALID_ID })

    expect(result).toMatchObject({ found: true, category: '' })
  })
})
