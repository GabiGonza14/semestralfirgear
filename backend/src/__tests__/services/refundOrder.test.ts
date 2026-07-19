import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing paymentService ----------------------

// Stripe client: getStripeClient().refunds.create(...) -> a refund object.
const mockRefundCreate = mock(async () => ({ id: 're_test_123' }))
mock.module('../../config/stripe', () => ({
  getStripeClient: () => ({ refunds: { create: mockRefundCreate } }),
}))

// Customer notification — assert the refund email is dispatched.
const mockDispatch = mock(() => {})
mock.module('../../services/notificationService', () => ({
  dispatchNotification: mockDispatch,
  sendNotification: mock(async () => ({ status: 'sent', attempts: 1 })),
}))

// Order history model (HU-29).
const mockEventCreate = mock(async () => ({}))
mock.module('../../models/OrderEvent', () => ({ OrderEventModel: { create: mockEventCreate } }))

// Order model: findById().populate() -> order document with save().
const mockSave = mock(async () => {})
const fakeOrder: Record<string, unknown> = {}
const mockPopulate = mock(async () => fakeOrder as unknown)
const mockFindById = mock(() => ({ populate: mockPopulate }))
mock.module('../../models/Order', () => ({ OrderModel: { findById: mockFindById } }))

const { refundOrder } = await import('../../services/paymentService')

describe('refundOrder (HU-29)', () => {
  beforeEach(() => {
    mockRefundCreate.mockClear()
    mockRefundCreate.mockImplementation(async () => ({ id: 're_test_123' }))
    mockDispatch.mockClear()
    mockEventCreate.mockClear()
    mockSave.mockClear()
    mockFindById.mockClear()
    mockPopulate.mockClear()
    mockPopulate.mockImplementation(async () => fakeOrder)

    Object.keys(fakeOrder).forEach((key) => delete fakeOrder[key])
    Object.assign(fakeOrder, {
      _id: 'order_abcdef',
      status: 'PAID',
      totalAmount: 129.97,
      stripePaymentIntentId: 'pi_123',
      userId: { email: 'buyer@example.com', fullName: 'Buyer One' },
      save: mockSave,
    })
  })

  it('refunds via Stripe and marks the order REFUNDED', async () => {
    await refundOrder('order_abcdef', { reason: 'Producto defectuoso', actorClerkId: 'user_admin' })

    // Stripe called with the payment intent and an order-scoped idempotency key.
    expect(mockRefundCreate).toHaveBeenCalledTimes(1)
    const [args, opts] = mockRefundCreate.mock.calls[0] as unknown as [
      { payment_intent: string },
      { idempotencyKey: string },
    ]
    expect(args.payment_intent).toBe('pi_123')
    expect(opts.idempotencyKey).toBe('refund_order_order_abcdef')

    expect(fakeOrder.status).toBe('REFUNDED')
    expect(fakeOrder.refundedAt).toBeInstanceOf(Date)
    expect(fakeOrder.stripeRefundId).toBe('re_test_123')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('records the refund in the order history with actor, reason and refund id', async () => {
    await refundOrder('order_abcdef', { reason: 'Producto defectuoso', actorClerkId: 'user_admin' })

    expect(mockEventCreate).toHaveBeenCalledTimes(1)
    const [event] = mockEventCreate.mock.calls[0] as unknown as [
      { type: string; actorClerkId?: string; reason?: string; metadata?: Record<string, unknown> },
    ]
    expect(event).toMatchObject({
      type: 'REFUNDED',
      actorClerkId: 'user_admin',
      reason: 'Producto defectuoso',
    })
    expect(event.metadata).toMatchObject({ stripeRefundId: 're_test_123', amount: 129.97 })
  })

  it('emails the customer the refund detail', async () => {
    await refundOrder('order_abcdef', {})

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatch.mock.calls[0] as unknown as [
      { type: string; to: string; orderId: string; html: string },
    ]
    expect(payload).toMatchObject({
      type: 'ORDER_REFUNDED',
      to: 'buyer@example.com',
      orderId: 'order_abcdef',
    })
    expect(payload.html).toContain('$129.97')
  })

  it('refunds a SHIPPED order too (with a reason)', async () => {
    mockRefundCreate.mockClear()
    mockSave.mockClear()
    fakeOrder.status = 'SHIPPED'

    // SHIPPED requires a reason (see paymentService.ts's "already shipped" guard).
    await refundOrder('order_abcdef', { reason: 'Producto defectuoso' })

    expect(mockRefundCreate).toHaveBeenCalledTimes(1)
    expect(fakeOrder.status).toBe('REFUNDED')
  })

  it('refuses to refund a DELIVERED order — a completed sale is final', async () => {
    fakeOrder.status = 'DELIVERED'

    await expect(refundOrder('order_abcdef', { reason: 'Producto defectuoso' })).rejects.toThrow(
      'Only paid or shipped',
    )
    expect(mockRefundCreate).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('is idempotent: refuses to refund an already-refunded order', async () => {
    fakeOrder.status = 'REFUNDED'

    await expect(refundOrder('order_abcdef', {})).rejects.toThrow('already refunded')
    expect(mockRefundCreate).not.toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('refuses to refund an order that is not paid or shipped', async () => {
    fakeOrder.status = 'PENDING'

    await expect(refundOrder('order_abcdef', {})).rejects.toThrow('Only paid or shipped')
    expect(mockRefundCreate).not.toHaveBeenCalled()
  })

  it('refuses to refund an order with no Stripe payment intent', async () => {
    fakeOrder.stripePaymentIntentId = undefined

    await expect(refundOrder('order_abcdef', {})).rejects.toThrow('no Stripe payment')
    expect(mockRefundCreate).not.toHaveBeenCalled()
  })

  it('atomicity: a Stripe failure leaves the order untouched', async () => {
    mockRefundCreate.mockImplementationOnce(async () => {
      throw new Error('card_declined')
    })

    await expect(refundOrder('order_abcdef', {})).rejects.toThrow('Stripe refund failed')

    // Order must NOT be marked REFUNDED and must NOT be saved.
    expect(fakeOrder.status).toBe('PAID')
    expect(fakeOrder.stripeRefundId).toBeUndefined()
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockEventCreate).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('throws 404 when the order does not exist', async () => {
    mockPopulate.mockImplementationOnce(async () => null)

    await expect(refundOrder('order_missing', {})).rejects.toThrow('Order not found')
    expect(mockRefundCreate).not.toHaveBeenCalled()
  })
})
