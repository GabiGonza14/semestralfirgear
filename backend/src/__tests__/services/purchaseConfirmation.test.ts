import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing paymentService ----------------------

// Confirmation email — assert it is dispatched with the order summary (HU-30).
const mockDispatch = mock(() => {})
mock.module('../../services/notificationService', () => ({
  dispatchNotification: mockDispatch,
  sendNotification: mock(async () => ({ status: 'sent', attempts: 1 })),
}))

// webhookAuditService is imported at module load — stub it so the import resolves.
mock.module('../../services/webhookAuditService', () => ({
  recordWebhookEvent: mock(async () => ({ isDuplicate: false, alreadyProcessed: false })),
  markWebhookProcessing: mock(async () => {}),
  markWebhookProcessed: mock(async () => {}),
  markWebhookFailed: mock(async () => {}),
}))

// Order model: findById().populate() -> order document.
const fakeOrder: Record<string, unknown> = {}
const mockOrderPopulate = mock(async () => fakeOrder as unknown)
const mockOrderFindById = mock(() => ({ populate: mockOrderPopulate }))
mock.module('../../models/Order', () => ({ OrderModel: { findById: mockOrderFindById } }))

// OrderItem model: find().populate() -> line items with populated product name.
let fakeItems: Array<Record<string, unknown>> = []
const mockItemPopulate = mock(async () => fakeItems)
const mockItemFind = mock(() => ({ populate: mockItemPopulate }))
mock.module('../../models/OrderItem', () => ({ OrderItemModel: { find: mockItemFind } }))

const { notifyCustomerPurchaseConfirmed, estimateDeliveryDate } = await import(
  '../../services/paymentService'
)

describe('notifyCustomerPurchaseConfirmed (HU-30)', () => {
  beforeEach(() => {
    mockDispatch.mockClear()
    mockOrderFindById.mockClear()
    mockOrderPopulate.mockClear()
    mockItemFind.mockClear()
    mockItemPopulate.mockClear()

    Object.keys(fakeOrder).forEach((key) => delete fakeOrder[key])
    Object.assign(fakeOrder, {
      _id: 'order_abcdef',
      status: 'PAID',
      totalAmount: 129.97,
      paidAt: new Date('2026-07-07T12:00:00Z'),
      userId: { email: 'buyer@example.com', fullName: 'Buyer One' },
    })

    fakeItems = [
      { productId: { name: 'Camiseta Pro' }, quantity: 2, size: 'M', subtotal: 59.98 },
      { productId: { name: 'Shaker 700ml' }, quantity: 1, size: null, subtotal: 9.99 },
    ]
  })

  it('dispatches a purchase-confirmation email to the customer', async () => {
    await notifyCustomerPurchaseConfirmed('order_abcdef')

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatch.mock.calls[0] as unknown as [
      { type: string; to: string; orderId: string; subject: string; html: string },
    ]
    expect(payload).toMatchObject({
      type: 'PURCHASE_CONFIRMATION',
      to: 'buyer@example.com',
      orderId: 'order_abcdef',
    })
    expect(payload.subject).toContain('ABCDEF')
  })

  it('includes the order number, products, sizes and total in the email body', async () => {
    await notifyCustomerPurchaseConfirmed('order_abcdef')

    const [payload] = mockDispatch.mock.calls[0] as unknown as [{ html: string }]
    expect(payload.html).toContain('ABCDEF')
    expect(payload.html).toContain('Camiseta Pro')
    expect(payload.html).toContain('Shaker 700ml')
    expect(payload.html).toContain('Talla M')
    expect(payload.html).toContain('$129.97') // order total
    expect(payload.html).toContain('$59.98') // line subtotal
  })

  it('includes an estimated delivery date', async () => {
    await notifyCustomerPurchaseConfirmed('order_abcdef')

    const [payload] = mockDispatch.mock.calls[0] as unknown as [{ html: string }]
    expect(payload.html).toContain('Entrega estimada')
    // paidAt = Tue 2026-07-07; +5 business days -> Tue 2026-07-14.
    expect(payload.html).toContain('14 de julio')
  })

  it('does not dispatch when the order has no customer email', async () => {
    fakeOrder.userId = { fullName: 'No Email' }

    await notifyCustomerPurchaseConfirmed('order_abcdef')

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('does not dispatch when the order does not exist', async () => {
    mockOrderPopulate.mockImplementationOnce(async () => null)

    await notifyCustomerPurchaseConfirmed('order_missing')

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('never throws even if loading the order fails', async () => {
    mockOrderPopulate.mockImplementationOnce(async () => {
      throw new Error('db down')
    })

    // Must resolve, not reject — a confirmation failure cannot break the payment.
    await expect(notifyCustomerPurchaseConfirmed('order_abcdef')).resolves.toBeUndefined()
    expect(mockDispatch).not.toHaveBeenCalled()
  })
})

describe('estimateDeliveryDate (HU-30)', () => {
  it('adds 5 business days, skipping weekends', () => {
    // Monday 2026-07-06 + 5 business days -> Monday 2026-07-13.
    const from = new Date('2026-07-06T10:00:00Z')
    const eta = estimateDeliveryDate(from)
    expect(eta.getFullYear()).toBe(2026)
    expect(eta.getMonth()).toBe(6) // July (0-indexed)
    expect(eta.getDate()).toBe(13)
  })

  it('does not mutate the input date', () => {
    const from = new Date('2026-07-06T10:00:00Z')
    const snapshot = from.getTime()
    estimateDeliveryDate(from)
    expect(from.getTime()).toBe(snapshot)
  })
})
