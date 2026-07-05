import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock the productService before importing the tool so the module
// resolves to the mocked version.
const mockListProducts = mock(async () => [])

// Export both service fns so this mock coexists with getProductDetails.test.ts —
// Bun's mock.module is global across the run, so a partial mock would break
// the other suite's import.
mock.module('../../../backend/src/services/productService', () => ({
  listProducts: mockListProducts,
  getProductById: mock(async () => ({})),
  updateProduct: mock(async () => ({})),
}))

// requireAuth is a soft-auth — always resolves for public tools.
mock.module('../../../backend/src/middlewares/requireAuth', () => ({
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mock(async () => { throw new Error('Unauthorized') }),
}))

// Import after mocking so the tool picks up the mocked modules.
const { searchProductsTool } = await import('../tools/searchProducts')

const makeProduct = (overrides: Record<string, unknown> = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  name: 'Test Kettlebell',
  price: 49.99,
  finalPrice: 44.99,
  stock: 10,
  images: ['/uploads/products/test.webp'],
  categoryId: { name: 'Pesas' },
  isActive: true,
  ...overrides,
})

describe('searchProductsTool', () => {
  beforeEach(() => {
    mockListProducts.mockClear()
  })

  it('happy path — returns mapped product summaries', async () => {
    mockListProducts.mockResolvedValueOnce([makeProduct()])

    const results = await searchProductsTool({ limit: 20 })

    expect(results).toHaveLength(1)
    expect(results[0]).toEqual({
      id: '507f1f77bcf86cd799439011',
      name: 'Test Kettlebell',
      price: 49.99,
      finalPrice: 44.99,
      stock: 10,
      category: 'Pesas',
      imageUrl: '/uploads/products/test.webp',
    })
  })

  it('empty results — returns empty array without throwing', async () => {
    mockListProducts.mockResolvedValueOnce([])

    const results = await searchProductsTool({})

    expect(results).toEqual([])
  })

  it('respects limit — trims results to requested count', async () => {
    const products = Array.from({ length: 5 }, (_, i) =>
      makeProduct({ _id: `507f1f77bcf86cd79943901${i}`, name: `Product ${i}` }),
    )
    mockListProducts.mockResolvedValueOnce(products)

    const results = await searchProductsTool({ limit: 3 })

    expect(results).toHaveLength(3)
  })

  it('forwards search and categoryId to listProducts', async () => {
    mockListProducts.mockResolvedValueOnce([])

    await searchProductsTool({ search: 'pesa', categoryId: '507f1f77bcf86cd799439011', sortBy: 'price', sortOrder: 'asc' })

    expect(mockListProducts).toHaveBeenCalledWith({
      search: 'pesa',
      categoryId: '507f1f77bcf86cd799439011',
      sortBy: 'price',
      sortOrder: 'asc',
    })
  })

  it('throws ZodError on invalid categoryId format', async () => {
    await expect(searchProductsTool({ categoryId: 'not-an-objectid' })).rejects.toThrow()
  })

  it('product without images returns empty imageUrl', async () => {
    mockListProducts.mockResolvedValueOnce([makeProduct({ images: [] })])

    const results = await searchProductsTool({})

    expect(results[0].imageUrl).toBe('')
  })

  it('product without populated category returns empty category string', async () => {
    mockListProducts.mockResolvedValueOnce([makeProduct({ categoryId: null })])

    const results = await searchProductsTool({})

    expect(results[0].category).toBe('')
  })
})
