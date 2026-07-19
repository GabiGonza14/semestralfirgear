import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing orderService ------------------------

const mockDispatch = mock(() => {})
mock.module('../../services/notificationService', () => ({
  dispatchNotification: mockDispatch,
  sendNotification: mock(async () => ({ status: 'sent', attempts: 1 })),
}))

const mockSave = mock(async () => {})
const fakeOrder: Record<string, unknown> = {}
const mockPopulate = mock(async () => fakeOrder as unknown)
const mockFindById = mock(() => ({ populate: mockPopulate }))
mock.module('../../models/Order', () => ({ OrderModel: { findById: mockFindById } }))

mock.module('../../models/OrderItem', () => ({
  OrderItemModel: { find: mock(() => ({ populate: mock(async () => []) })) },
}))

// Audit history writes (HU-29 OrderEvent, reused by HU-42 STATUS_CHANGED).
const mockEventCreate = mock(async () => ({}))
mock.module('../../models/OrderEvent', () => ({ OrderEventModel: { create: mockEventCreate } }))

mock.module('../../models/Product', () => ({ ProductModel: {} }))
mock.module('../../models/User', () => ({ UserModel: {} }))

const { updateOrderStatus } = await import('../../services/orderService')

describe('updateOrderStatus (HU-42)', () => {
  beforeEach(() => {
    mockDispatch.mockClear()
    mockSave.mockClear()
    mockFindById.mockClear()
    mockPopulate.mockClear()
    mockEventCreate.mockClear()

    Object.keys(fakeOrder).forEach((key) => delete fakeOrder[key])
    Object.assign(fakeOrder, {
      _id: 'order_abcdef',
      status: 'PAID',
      userId: { email: 'buyer@example.com', fullName: 'Buyer One' },
      save: mockSave,
    })
    mockPopulate.mockImplementation(async () => fakeOrder)
  })

  it('applies a valid transition and records the change in the audit history', async () => {
    await updateOrderStatus('order_abcdef', 'SHIPPED', { actorClerkId: 'clerk_admin' })

    expect(fakeOrder.status).toBe('SHIPPED')
    expect(mockSave).toHaveBeenCalledTimes(1)

    expect(mockEventCreate).toHaveBeenCalledTimes(1)
    const [event] = mockEventCreate.mock.calls[0] as unknown as [
      { type: string; actorClerkId?: string; metadata?: Record<string, unknown> },
    ]
    expect(event).toMatchObject({ type: 'STATUS_CHANGED', actorClerkId: 'clerk_admin' })
    expect(event.metadata).toMatchObject({ from: 'PAID', to: 'SHIPPED' })
  })

  it('sends the shipping email (and stamps shippedAt) only when moving to SHIPPED', async () => {
    await updateOrderStatus('order_abcdef', 'SHIPPED', { trackingNumber: 'TRACK-9' })

    expect(fakeOrder.shippedAt).toBeInstanceOf(Date)
    expect(fakeOrder.trackingNumber).toBe('TRACK-9')
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatch.mock.calls[0] as unknown as [{ type: string; html: string }]
    expect(payload.type).toBe('ORDER_SHIPPED')
    expect(payload.html).toContain('TRACK-9')
  })

  it('sends the delivery email when moving to DELIVERED', async () => {
    fakeOrder.status = 'SHIPPED'

    await updateOrderStatus('order_abcdef', 'DELIVERED', {})

    expect(fakeOrder.status).toBe('DELIVERED')
    expect(mockEventCreate).toHaveBeenCalledTimes(1)
    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatch.mock.calls[0] as unknown as [
      { type: string; to: string; orderId: string; html: string },
    ]
    expect(payload).toMatchObject({
      type: 'ORDER_DELIVERED',
      to: 'buyer@example.com',
      orderId: 'order_abcdef',
    })
    expect(payload.html).toContain('entregada')
  })

  it('allows cancelling from PENDING', async () => {
    fakeOrder.status = 'PENDING'

    await updateOrderStatus('order_abcdef', 'CANCELLED', {})

    expect(fakeOrder.status).toBe('CANCELLED')
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('rejects an invalid transition (DELIVERED -> PENDING) and leaves the order untouched', async () => {
    fakeOrder.status = 'DELIVERED'

    await expect(updateOrderStatus('order_abcdef', 'PENDING', {})).rejects.toThrow(
      'Invalid status transition: DELIVERED -> PENDING',
    )
    expect(fakeOrder.status).toBe('DELIVERED')
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('blocks marking PAID manually (payment comes from Stripe only)', async () => {
    fakeOrder.status = 'PENDING'

    await expect(updateOrderStatus('order_abcdef', 'PAID', {})).rejects.toThrow(
      'Invalid status transition: PENDING -> PAID',
    )
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('rejects a no-op transition to the same status', async () => {
    await expect(updateOrderStatus('order_abcdef', 'PAID', {})).rejects.toThrow('already PAID')
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('throws 404 when the order does not exist', async () => {
    mockPopulate.mockImplementationOnce(async () => null)

    await expect(updateOrderStatus('order_missing', 'SHIPPED', {})).rejects.toThrow('Order not found')
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
