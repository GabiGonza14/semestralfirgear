import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { HttpError } from '../../../backend/src/utils/httpError'

// Mock the orderService before importing the tool. Export the other order fns
// the tool's module graph might touch so this mock coexists with other suites
// (Bun's mock.module is global across the run).
const mockUpdateOrderStatus = mock(async () => ({ status: 'SHIPPED' }))

mock.module('../../../backend/src/services/orderService', () => ({
  updateOrderStatus: mockUpdateOrderStatus,
  markOrderAsShipped: mock(async () => ({})),
  listOrders: mock(async () => []),
  listOrdersByUserId: mock(async () => []),
  getOrderById: mock(async () => ({})),
  listOrderEvents: mock(async () => []),
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

const { updateOrderStatusTool } = await import('../tools/updateOrderStatus')

const ORDER_ID = '507f1f77bcf86cd799439011'

describe('updateOrderStatusTool', () => {
  beforeEach(() => {
    mockUpdateOrderStatus.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    // Default: authenticated user is an ADMIN.
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
    mockUpdateOrderStatus.mockImplementation(async () => ({ status: 'SHIPPED' }))
  })

  it('updates the status and forwards the acting admin + tracking number', async () => {
    const result = await updateOrderStatusTool({
      orderId: ORDER_ID,
      token: 'valid.jwt',
      status: 'SHIPPED',
      trackingNumber: 'TRACK-1',
    })

    expect(result).toEqual({ ok: true, orderId: ORDER_ID, status: 'SHIPPED' })
    expect(mockUpdateOrderStatus).toHaveBeenCalledWith(ORDER_ID, 'SHIPPED', {
      actorClerkId: 'clerk_admin',
      trackingNumber: 'TRACK-1',
    })
  })

  it('rejects when the resolved user is not ADMIN', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(
      updateOrderStatusTool({ orderId: ORDER_ID, token: 'valid.jwt', status: 'DELIVERED' }),
    ).rejects.toThrow('admin role required')
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('rejects without a valid token (never touches the DB)', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(
      updateOrderStatusTool({ orderId: ORDER_ID, token: 'bad.jwt', status: 'SHIPPED' }),
    ).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('rejects an invalid status value at the schema level', async () => {
    await expect(
      updateOrderStatusTool({ orderId: ORDER_ID, token: 'valid.jwt', status: 'REFUNDED' }),
    ).rejects.toThrow()
    expect(mockUpdateOrderStatus).not.toHaveBeenCalled()
  })

  it('returns a clean result for an invalid transition (400) instead of throwing', async () => {
    mockUpdateOrderStatus.mockImplementationOnce(async () => {
      throw new HttpError(400, 'Invalid status transition: DELIVERED -> PENDING')
    })

    const result = await updateOrderStatusTool({
      orderId: ORDER_ID,
      token: 'valid.jwt',
      status: 'PENDING',
    })

    expect(result).toEqual({
      ok: false,
      orderId: ORDER_ID,
      message: 'Invalid status transition: DELIVERED -> PENDING',
    })
  })

  it('returns a clean result when the order does not exist (404)', async () => {
    mockUpdateOrderStatus.mockImplementationOnce(async () => {
      throw new HttpError(404, 'Order not found')
    })

    const result = await updateOrderStatusTool({
      orderId: ORDER_ID,
      token: 'valid.jwt',
      status: 'SHIPPED',
    })

    expect(result).toEqual({ ok: false, orderId: ORDER_ID, message: 'Order not found' })
  })
})
