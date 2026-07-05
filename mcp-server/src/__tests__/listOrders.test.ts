import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock the orderService before importing the tool.
const mockListOrders = mock(async () => [] as unknown[])

mock.module('../../../backend/src/services/orderService', () => ({
  listOrders: mockListOrders,
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
const { listOrdersTool } = await import('../tools/listOrders')

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  userId: { fullName: 'Ana Cliente', email: 'ana@example.com' },
  status: 'PAID',
  totalAmount: 104.97,
  createdAt: '2026-07-01T10:00:00.000Z',
  items: [{}, {}],
  ...overrides,
})

describe('listOrdersTool', () => {
  beforeEach(() => {
    mockListOrders.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
  })

  it('unfiltered listing — maps every order to a compact entry', async () => {
    mockListOrders.mockResolvedValueOnce([
      makeOrder(),
      makeOrder({ _id: '507f1f77bcf86cd799439012', status: 'PENDING', items: [{}] }),
    ])

    const result = await listOrdersTool({ token: 'valid.jwt' })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      orderId: '507f1f77bcf86cd799439011',
      createdAt: '2026-07-01T10:00:00.000Z',
      customerName: 'Ana Cliente',
      customerEmail: 'ana@example.com',
      status: 'PAID',
      totalAmount: 104.97,
      itemsCount: 2,
    })
    expect(result[1].itemsCount).toBe(1)
  })

  it('filters by status', async () => {
    mockListOrders.mockResolvedValueOnce([
      makeOrder({ status: 'PAID' }),
      makeOrder({ _id: '507f1f77bcf86cd799439012', status: 'CANCELLED' }),
      makeOrder({ _id: '507f1f77bcf86cd799439013', status: 'PAID' }),
    ])

    const result = await listOrdersTool({ token: 'valid.jwt', status: 'PAID' })

    expect(result).toHaveLength(2)
    expect(result.every((o) => o.status === 'PAID')).toBe(true)
  })

  it('respects limit', async () => {
    const orders = Array.from({ length: 10 }, (_, i) =>
      makeOrder({ _id: `507f1f77bcf86cd79943901${i}` }),
    )
    mockListOrders.mockResolvedValueOnce(orders)

    const result = await listOrdersTool({ token: 'valid.jwt', limit: 3 })

    expect(result).toHaveLength(3)
  })

  it('handles an order with no populated customer', async () => {
    mockListOrders.mockResolvedValueOnce([makeOrder({ userId: null, items: [] })])

    const result = await listOrdersTool({ token: 'valid.jwt' })

    expect(result[0]).toMatchObject({ customerName: '', customerEmail: '', itemsCount: 0 })
  })

  it('rejects when the resolved user is not ADMIN', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(listOrdersTool({ token: 'valid.jwt' })).rejects.toThrow('admin role required')
    expect(mockListOrders).not.toHaveBeenCalled()
  })

  it('rejects without a valid token', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(listOrdersTool({ token: 'bad.jwt' })).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockListOrders).not.toHaveBeenCalled()
  })
})
