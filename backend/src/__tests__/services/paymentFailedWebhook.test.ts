import { describe, it, expect, mock, beforeEach } from 'bun:test'
import type Stripe from 'stripe'

// --- Mocks registered before importing paymentService ----------------------

// Audit log helper (StripeWebhookEventModel wrapper).
const mockRecordWebhookEvent = mock(async () => ({ isDuplicate: false, alreadyProcessed: false }))
const mockMarkProcessing = mock(async () => {})
const mockMarkProcessed = mock(async () => {})
const mockMarkFailed = mock(async () => {})
mock.module('../../services/webhookAuditService', () => ({
  recordWebhookEvent: mockRecordWebhookEvent,
  markWebhookProcessing: mockMarkProcessing,
  markWebhookProcessed: mockMarkProcessed,
  markWebhookFailed: mockMarkFailed,
}))

// Customer notification — assert it is dispatched with retry instructions.
const mockDispatch = mock(() => {})
mock.module('../../services/notificationService', () => ({
  dispatchNotification: mockDispatch,
  sendNotification: mock(async () => ({ status: 'sent', attempts: 1 })),
}))

// Order model: findById().populate() -> order document with save().
const mockSave = mock(async () => {})
const fakeOrder: Record<string, unknown> = {}
const mockPopulate = mock(async () => fakeOrder)
const mockFindById = mock(() => ({ populate: mockPopulate }))
mock.module('../../models/Order', () => ({ OrderModel: { findById: mockFindById } }))

const { handleStripeEvent } = await import('../../services/paymentService')

function paymentFailedEvent(metadata: Record<string, string> = { orderId: 'order_abc123' }): Stripe.Event {
  return {
    id: 'evt_1',
    type: 'payment_intent.payment_failed',
    api_version: '2024-06-20',
    created: 1_700_000_000,
    livemode: false,
    data: {
      object: {
        id: 'pi_1',
        object: 'payment_intent',
        amount: 10000,
        currency: 'usd',
        status: 'requires_payment_method',
        metadata,
        last_payment_error: { message: 'Your card was declined.' },
      },
    },
  } as unknown as Stripe.Event
}

describe('handleStripeEvent — payment_intent.payment_failed (HU-28)', () => {
  beforeEach(() => {
    mockRecordWebhookEvent.mockClear()
    mockRecordWebhookEvent.mockImplementation(async () => ({ isDuplicate: false, alreadyProcessed: false }))
    mockMarkProcessing.mockClear()
    mockMarkProcessed.mockClear()
    mockMarkFailed.mockClear()
    mockDispatch.mockClear()
    mockSave.mockClear()
    mockFindById.mockClear()
    mockPopulate.mockClear()

    // Reset the shared order document to a fresh PENDING order each test.
    Object.keys(fakeOrder).forEach((key) => delete fakeOrder[key])
    Object.assign(fakeOrder, {
      _id: 'order_abc123',
      status: 'PENDING',
      totalAmount: 100,
      userId: { email: 'buyer@example.com', fullName: 'Buyer One' },
      save: mockSave,
    })
  })

  it('records the event in the audit log', async () => {
    await handleStripeEvent(paymentFailedEvent())

    expect(mockRecordWebhookEvent).toHaveBeenCalledTimes(1)
    const [, data] = mockRecordWebhookEvent.mock.calls[0] as unknown as [Stripe.Event, { orderId?: string }]
    expect(data).toMatchObject({ orderId: 'order_abc123', paymentIntentId: 'pi_1' })
    expect(mockMarkProcessed).toHaveBeenCalledWith('evt_1')
  })

  it('updates the associated order to FAILED', async () => {
    await handleStripeEvent(paymentFailedEvent())

    expect(mockFindById).toHaveBeenCalledWith('order_abc123')
    expect(fakeOrder.status).toBe('FAILED')
    expect(fakeOrder.stripePaymentIntentId).toBe('pi_1')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('dispatches a retry-instructions notification to the customer', async () => {
    await handleStripeEvent(paymentFailedEvent())

    expect(mockDispatch).toHaveBeenCalledTimes(1)
    const [payload] = mockDispatch.mock.calls[0] as unknown as [
      { type: string; to: string; orderId: string; subject: string; html: string },
    ]
    expect(payload).toMatchObject({
      type: 'PAYMENT_FAILED',
      to: 'buyer@example.com',
      orderId: 'order_abc123',
    })
    expect(payload.html).toContain('Reintentar')
  })

  it('is idempotent: an already-processed redelivery does no work', async () => {
    mockRecordWebhookEvent.mockImplementationOnce(async () => ({ isDuplicate: true, alreadyProcessed: true }))

    await handleStripeEvent(paymentFailedEvent())

    expect(mockFindById).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
    expect(mockMarkProcessing).not.toHaveBeenCalled()
  })

  it('does not fail an order that already moved past PENDING', async () => {
    fakeOrder.status = 'PAID'

    await handleStripeEvent(paymentFailedEvent())

    expect(fakeOrder.status).toBe('PAID')
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('skips gracefully when the payment intent has no orderId metadata', async () => {
    await handleStripeEvent(paymentFailedEvent({}))

    expect(mockFindById).not.toHaveBeenCalled()
    expect(mockDispatch).not.toHaveBeenCalled()
    // Still marked processed — a malformed event is not a processing failure.
    expect(mockMarkProcessed).toHaveBeenCalledWith('evt_1')
  })
})
