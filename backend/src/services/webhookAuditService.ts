import type Stripe from 'stripe'
import { StripeWebhookEventModel } from '../models/StripeWebhookEvent'

export interface WebhookEventData {
  orderId?: string
  customerId?: string
  customerEmail?: string
  amountTotal?: number
  currency?: string
  sessionId?: string
  paymentIntentId?: string
  paymentStatus?: string
  rawObjectType?: string
}

export interface RecordWebhookResult {
  isDuplicate: boolean
  alreadyProcessed: boolean
}

/**
 * Persists a received Stripe event in the audit log. Idempotent on Stripe's
 * event id (Stripe retries deliveries): a first receipt inserts the record,
 * a redelivery just bumps deliveryCount. The returned `alreadyProcessed` lets
 * callers skip duplicate side effects.
 */
export async function recordWebhookEvent(
  event: Stripe.Event,
  data: WebhookEventData = {},
): Promise<RecordWebhookResult> {
  const existing = await StripeWebhookEventModel.findOne({ eventId: event.id })

  if (existing) {
    existing.deliveryCount += 1
    existing.lastReceivedAt = new Date()
    await existing.save()
    return { isDuplicate: true, alreadyProcessed: existing.processingState === 'processed' }
  }

  await StripeWebhookEventModel.create({
    eventId: event.id,
    eventType: event.type,
    apiVersion: event.api_version ?? undefined,
    stripeCreatedAt: new Date(event.created * 1000),
    livemode: event.livemode,
    processingState: 'received',
    deliveryCount: 1,
    lastReceivedAt: new Date(),
    data,
    payload: event as unknown as Record<string, unknown>,
  })

  return { isDuplicate: false, alreadyProcessed: false }
}

export async function markWebhookProcessing(eventId: string): Promise<void> {
  await StripeWebhookEventModel.findOneAndUpdate(
    { eventId },
    { processingState: 'processing', processingStartedAt: new Date() },
  )
}

export async function markWebhookProcessed(eventId: string): Promise<void> {
  await StripeWebhookEventModel.findOneAndUpdate(
    { eventId },
    { processingState: 'processed', processedAt: new Date(), errorMessage: undefined },
  )
}

export async function markWebhookFailed(eventId: string, errorMessage: string): Promise<void> {
  await StripeWebhookEventModel.findOneAndUpdate(
    { eventId },
    { processingState: 'failed', errorMessage },
  )
}
