import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock the three aggregation services before importing the tool.
const mockListOrders = mock(async () => [] as unknown[])
const mockListProducts = mock(async () => [] as unknown[])
const mockListUsers = mock(async () => [] as unknown[])

// Export every order-service fn any suite may import so this mock coexists with
// the get_order_status / list_orders / update_order_status suites — Bun's
// mock.module is global across the run.
mock.module('../../../backend/src/services/orderService', () => ({
  listOrders: mockListOrders,
  listOrdersByUserId: mock(async () => []),
  updateOrderStatus: mock(async () => ({})),
}))

// Export every product-service fn any suite may import so this mock coexists —
// Bun's mock.module is global across the run.
mock.module('../../../backend/src/services/productService', () => ({
  listProducts: mockListProducts,
  getProductById: mock(async () => ({})),
  updateProduct: mock(async () => ({})),
  // Global mock.module: searchProducts.ts imports suggestProducts, so keep it
  // here too or that tool's import breaks when this mock wins the run.
  suggestProducts: mock(async () => []),
}))

mock.module('../../../backend/src/services/userService', () => ({
  listUsers: mockListUsers,
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
const { getSalesMetricsTool } = await import('../tools/getSalesMetrics')

const order = (status: string, totalAmount: number) => ({ status, totalAmount })

describe('getSalesMetricsTool', () => {
  beforeEach(() => {
    mockListOrders.mockClear()
    mockListProducts.mockClear()
    mockListUsers.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    // Default: authenticated user is an ADMIN.
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
  })

  it('happy path — computes the four metrics from a mix of order statuses', async () => {
    mockListOrders.mockResolvedValueOnce([
      order('PAID', 100),
      order('SHIPPED', 50),
      order('DELIVERED', 25),
      order('PENDING', 999), // excluded from revenue
      order('CANCELLED', 888), // excluded from revenue
    ])
    mockListProducts.mockResolvedValueOnce([
      { isActive: true },
      { isActive: true },
      { isActive: false }, // not counted as active
    ])
    mockListUsers.mockResolvedValueOnce([{}, {}, {}, {}])

    const result = await getSalesMetricsTool({ token: 'valid.jwt' })

    expect(result).toEqual({
      totalRevenue: 175, // 100 + 50 + 25, PENDING/CANCELLED excluded
      ordersCount: 5,
      activeProductsCount: 2,
      usersCount: 4,
    })
    // includeInactive must be passed so inactive products are still counted correctly.
    expect(mockListProducts).toHaveBeenCalledWith({ includeInactive: true })
  })

  it('zero data — returns all-zero metrics', async () => {
    mockListOrders.mockResolvedValueOnce([])
    mockListProducts.mockResolvedValueOnce([])
    mockListUsers.mockResolvedValueOnce([])

    const result = await getSalesMetricsTool({ token: 'valid.jwt' })

    expect(result).toEqual({
      totalRevenue: 0,
      ordersCount: 0,
      activeProductsCount: 0,
      usersCount: 0,
    })
  })

  it('rejects when the resolved user is not an ADMIN', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(getSalesMetricsTool({ token: 'valid.jwt' })).rejects.toThrow('admin role required')
    expect(mockListOrders).not.toHaveBeenCalled()
  })

  it('rejects when the user has no linked Mongo profile', async () => {
    mockSelect.mockImplementationOnce(async () => null)

    await expect(getSalesMetricsTool({ token: 'valid.jwt' })).rejects.toThrow('admin role required')
    expect(mockListOrders).not.toHaveBeenCalled()
  })

  it('rejects without a valid token', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(getSalesMetricsTool({})).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockListOrders).not.toHaveBeenCalled()
  })
})
