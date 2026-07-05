import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock the orderService before importing the tool so the module resolves
// to the mocked version.
const mockListOrdersByUserId = mock(async () => [] as unknown[])

// Export both order-service fns so this mock coexists with the getSalesMetrics /
// list_orders suites — Bun's mock.module is global across the run.
mock.module('../../services/orderService', () => ({
  listOrdersByUserId: mockListOrdersByUserId,
  listOrders: mock(async () => []),
}))

// Mock the User model — the tool resolves clerkUserId -> Mongo _id via findOne().select().
const mockSelect = mock(async () => null as unknown)
const mockFindOne = mock(() => ({ select: mockSelect }))

mock.module('../../models/User', () => ({
  UserModel: { findOne: mockFindOne },
}))

// requireAuthStrict is the protected-auth gate — controlled per test.
const mockRequireAuthStrict = mock(async () => ({ userId: 'clerk_abc', authenticated: true }))

mock.module('../../middlewares/requireAuth', () => ({
  // Keep soft-auth identical to the other suites so coexistence is safe.
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mockRequireAuthStrict,
}))

// Import after mocking so the tool picks up the mocked modules.
const { getOrderStatusTool } = await import('../../mcp/tools/getOrderStatus')

const USER_ID = '507f1f77bcf86cd799439099'

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  status: 'PAID',
  totalAmount: 104.97,
  createdAt: '2026-07-01T10:00:00.000Z',
  paidAt: '2026-07-01T10:05:00.000Z',
  items: [
    {
      productId: { name: 'Pesa rusa 10 kg' },
      quantity: 2,
      size: null,
      unitPrice: 44.99,
      subtotal: 89.98,
    },
  ],
  ...overrides,
})

describe('getOrderStatusTool', () => {
  beforeEach(() => {
    mockListOrdersByUserId.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    // Default: authenticated user resolves to a linked Mongo profile.
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_abc', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ _id: USER_ID }))
  })

  it('happy path — returns the caller\'s mapped orders', async () => {
    mockListOrdersByUserId.mockResolvedValueOnce([makeOrder()])

    const result = await getOrderStatusTool({ token: 'valid.jwt' })

    expect(result.authenticated).toBe(true)
    expect(result.orders).toHaveLength(1)
    expect(result.orders[0]).toEqual({
      id: '507f1f77bcf86cd799439011',
      status: 'PAID',
      totalAmount: 104.97,
      createdAt: '2026-07-01T10:00:00.000Z',
      paidAt: '2026-07-01T10:05:00.000Z',
      items: [
        { product: 'Pesa rusa 10 kg', quantity: 2, size: null, unitPrice: 44.99, subtotal: 89.98 },
      ],
    })
    // Orders must be scoped to the resolved Mongo _id, never the raw Clerk id.
    expect(mockFindOne).toHaveBeenCalledWith({ clerkUserId: 'clerk_abc' })
    expect(mockListOrdersByUserId).toHaveBeenCalledWith(USER_ID)
  })

  it('authenticated customer with zero orders — returns empty list', async () => {
    mockListOrdersByUserId.mockResolvedValueOnce([])

    const result = await getOrderStatusTool({ token: 'valid.jwt' })

    expect(result).toEqual({ authenticated: true, orders: [] })
  })

  it('authenticated but no linked Mongo profile — returns empty list without calling orders', async () => {
    mockSelect.mockImplementationOnce(async () => null)

    const result = await getOrderStatusTool({ token: 'valid.jwt' })

    expect(result).toEqual({ authenticated: true, orders: [] })
    expect(mockListOrdersByUserId).not.toHaveBeenCalled()
  })

  it('rejects when no valid token is provided', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(getOrderStatusTool({})).rejects.toThrow('Unauthorized')
    expect(mockListOrdersByUserId).not.toHaveBeenCalled()
  })

  it('maps orders with sized items correctly', async () => {
    mockListOrdersByUserId.mockResolvedValueOnce([
      makeOrder({
        items: [
          { productId: { name: 'Guantes' }, quantity: 1, size: 'M', unitPrice: 19.99, subtotal: 19.99 },
        ],
      }),
    ])

    const result = await getOrderStatusTool({ token: 'valid.jwt' })

    expect(result.orders[0].items[0]).toEqual({
      product: 'Guantes',
      quantity: 1,
      size: 'M',
      unitPrice: 19.99,
      subtotal: 19.99,
    })
  })
})
