import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { HttpError } from '../../../backend/src/utils/httpError'

// Mock the productService before importing the tool. Export both other product
// fns too so this mock coexists with the other suites (Bun's mock.module is
// global across the run).
const mockUpdateProduct = mock(async () => ({}))

mock.module('../../../backend/src/services/productService', () => ({
  updateProduct: mockUpdateProduct,
  getProductById: mock(async () => ({})),
  listProducts: mock(async () => []),
}))

// Mock the User model — the tool resolves clerkUserId -> role via findOne().select().
const mockSelect = mock(async () => null as unknown)
const mockFindOne = mock(() => ({ select: mockSelect }))

mock.module('../../../backend/src/models/User', () => ({
  UserModel: { findOne: mockFindOne },
}))

// requireAuthStrict is the protected-auth gate — controlled per test.
const mockRequireAuthStrict = mock(async () => ({ userId: 'clerk_admin', authenticated: true }))

mock.module('../../../backend/src/middlewares/requireAuth', () => ({
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mockRequireAuthStrict,
}))

// Import after mocking so the tool picks up the mocked modules.
const { updateStockTool } = await import('../tools/updateStock')

const PRODUCT_ID = '507f1f77bcf86cd799439011'

describe('updateStockTool', () => {
  beforeEach(() => {
    mockUpdateProduct.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    // Default: authenticated user is an ADMIN.
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
  })

  it('flat stock update — forwards only { stock } and returns the updated product', async () => {
    mockUpdateProduct.mockResolvedValueOnce({
      _id: PRODUCT_ID,
      name: 'Pesa rusa 10 kg',
      stock: 42,
      sizes: [],
    })

    const result = await updateStockTool({ productId: PRODUCT_ID, token: 'valid.jwt', stock: 42 })

    expect(result).toEqual({
      found: true,
      id: PRODUCT_ID,
      name: 'Pesa rusa 10 kg',
      stock: 42,
      sizes: [],
    })
    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, { stock: 42 })
  })

  it('sizes-based stock update — forwards only { sizes } and returns derived stock', async () => {
    mockUpdateProduct.mockResolvedValueOnce({
      _id: PRODUCT_ID,
      name: 'Guantes',
      stock: 8,
      sizes: [
        { label: 'M', stock: 5 },
        { label: 'L', stock: 3 },
      ],
    })

    const result = await updateStockTool({
      productId: PRODUCT_ID,
      token: 'valid.jwt',
      sizes: [
        { label: 'M', stock: 5 },
        { label: 'L', stock: 3 },
      ],
    })

    expect(result).toMatchObject({
      found: true,
      stock: 8,
      sizes: [
        { label: 'M', stock: 5 },
        { label: 'L', stock: 3 },
      ],
    })
    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, {
      sizes: [
        { label: 'M', stock: 5 },
        { label: 'L', stock: 3 },
      ],
    })
  })

  it('ignores other product fields — never forwards name/price/etc.', async () => {
    mockUpdateProduct.mockResolvedValueOnce({ _id: PRODUCT_ID, name: 'Kept', stock: 1, sizes: [] })

    await updateStockTool({
      productId: PRODUCT_ID,
      token: 'valid.jwt',
      stock: 1,
      // These extra fields must be dropped, not forwarded to updateProduct.
      name: 'HACKED',
      price: 0.01,
      categoryId: '507f1f77bcf86cd799439022',
    } as unknown as { productId: string; token: string; stock: number })

    expect(mockUpdateProduct).toHaveBeenCalledWith(PRODUCT_ID, { stock: 1 })
  })

  it('rejects when both stock and sizes are provided', async () => {
    await expect(
      updateStockTool({ productId: PRODUCT_ID, token: 'valid.jwt', stock: 1, sizes: [{ label: 'M', stock: 1 }] }),
    ).rejects.toThrow()
    expect(mockUpdateProduct).not.toHaveBeenCalled()
  })

  it('rejects when the resolved user is not ADMIN', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(
      updateStockTool({ productId: PRODUCT_ID, token: 'valid.jwt', stock: 5 }),
    ).rejects.toThrow('admin role required')
    expect(mockUpdateProduct).not.toHaveBeenCalled()
  })

  it('rejects without a valid token', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(
      updateStockTool({ productId: PRODUCT_ID, token: 'bad.jwt', stock: 5 }),
    ).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockUpdateProduct).not.toHaveBeenCalled()
  })

  it('product-not-found — returns clean result instead of throwing', async () => {
    mockUpdateProduct.mockImplementationOnce(async () => {
      throw new HttpError(404, 'Product not found')
    })

    const result = await updateStockTool({ productId: PRODUCT_ID, token: 'valid.jwt', stock: 5 })

    expect(result).toEqual({
      found: false,
      productId: PRODUCT_ID,
      message: 'No product exists with the given productId',
    })
  })

  it('translates a 400 validation error into a readable flat message', async () => {
    mockUpdateProduct.mockImplementationOnce(async () => {
      throw new HttpError(400, 'Validation failed', [
        { path: 'sizes', message: 'Duplicate size labels are not allowed' },
      ])
    })

    await expect(
      updateStockTool({ productId: PRODUCT_ID, token: 'valid.jwt', sizes: [{ label: 'M', stock: 1 }] }),
    ).rejects.toThrow('Duplicate size labels are not allowed')
  })
})
