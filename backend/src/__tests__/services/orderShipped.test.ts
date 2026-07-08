import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing orderService ------------------------

// Shipping notification — assert it is dispatched with the order summary (HU-31).
const mockDispatch = mock(() => {})
mock.module('../../services/notificationService', () => ({
  dispatchNotification: mockDispatch,
  sendNotification: mock(async () => ({ status: 'sent', attempts: 1 })),
}))

// Order model: findById().populate() -> order document with save().
const mockSave = mock(async () => {})
const fakeOrder: Record<string, unknown> = {}
const mockPopulate = mock(async () => fakeOrder as unknown)
const mockFindById = mock(() => ({ populate: mockPopulate }))
mock.module('../../models/Order', () => ({ OrderModel: { findById: mockFindById } }))

// OrderItem model is only touched by loadOrderWithItems after a successful ship.
mock.module('../../models/OrderItem', () => ({
  OrderItemModel: { find: mock(() => ({ populate: mock(async () => []) })) },
}))

// markOrderAsShipped now delegates to updateOrderStatus, which audits the change.
mock.module('../../models/OrderEvent', () => ({ OrderEventModel: { create: mock(async () => ({})) } }))

// Unused by the ship path but imported at module load — stub so the import works.
mock.module('../../models/Product', () => ({ ProductModel: {} }))
mock.module('../../models/User', () => ({ UserModel: {} }))

const { markOrderAsShipped } = await import('../../services/orderService')

describe('markOrderAsShipped (HU-31)', () => {
  beforeEach(() => {
    mockDispatch.mockClear()
    mockSave.mockClear()
    mockFindById.mockClear()
    mockPopulate.mockClear()

    Object.keys(fakeOrder).forEach((key) => delete fakeOrder[key])
    Object.assign(fakeOrder, {
      _id: 'order_abcdef',
      status: 'PAID',
      userId: { email: 'buyer@example.com', fullName: 'Buyer One' },
      save: mockSave,
    })
    // Second findById() (inside loadOrderWithItems) resolves to the same order.
    mockPopulate.mockImplementation(async () => fakeOrder)
  })

  it('transitions a PAID order to SHIPPED and stamps shippedAt', async () => {
    await markOrderAsShipped('order_abcdef')

    expect(fakeOrder.status).toBe('SHIPPED')
    expect(fakeOrder.shippedAt).toBeInstanceOf(Date)
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('dispatches a shipping notification to the customer', async () => {
    await markOrderAsShipped('order_abcdef')

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatch.mock.calls[0] as unknown as [
      { type: string; to: string; orderId: string; subject: string; html: string },
    ]
    expect(payload).toMatchObject({
      type: 'ORDER_SHIPPED',
      to: 'buyer@example.com',
      orderId: 'order_abcdef',
    })
    expect(payload.subject).toContain('ABCDEF')
    expect(payload.html).toContain('ABCDEF') // order number
    expect(payload.html).toContain('en camino')
  })

  it('includes the tracking number in the email when provided', async () => {
    await markOrderAsShipped('order_abcdef', 'TRACK-123XYZ')

    expect(fakeOrder.trackingNumber).toBe('TRACK-123XYZ')
    const [payload] = mockDispatch.mock.calls[0] as unknown as [{ html: string }]
    expect(payload.html).toContain('Número de rastreo')
    expect(payload.html).toContain('TRACK-123XYZ')
  })

  it('omits the tracking block when no tracking number is provided', async () => {
    await markOrderAsShipped('order_abcdef')

    const [payload] = mockDispatch.mock.calls[0] as unknown as [{ html: string }]
    expect(payload.html).not.toContain('Número de rastreo')
    expect(fakeOrder.trackingNumber).toBeUndefined()
  })

  it('rejects shipping an order that is not PAID (invalid transition)', async () => {
    fakeOrder.status = 'PENDING'

    await expect(markOrderAsShipped('order_abcdef')).rejects.toThrow(
      'Invalid status transition: PENDING -> SHIPPED',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('throws 404 when the order does not exist', async () => {
    mockPopulate.mockImplementationOnce(async () => null)

    await expect(markOrderAsShipped('order_missing')).rejects.toThrow('Order not found')
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('ships but does not dispatch when the order has no customer email', async () => {
    fakeOrder.userId = { fullName: 'No Email' }

    await markOrderAsShipped('order_abcdef')

    expect(fakeOrder.status).toBe('SHIPPED')
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})
