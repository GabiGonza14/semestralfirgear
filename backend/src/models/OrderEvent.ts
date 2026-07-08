import { Schema, Types, model, type InferSchemaType } from 'mongoose'

// Per-order audit trail (HU-29). Records meaningful lifecycle events — starting
// with REFUNDED — so every admin action on an order is traceable: what happened,
// who did it, when, and why. Separate from NotificationLog (which audits emails)
// and StripeWebhookEvent (which audits incoming Stripe deliveries).
const orderEventSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: 'Order', required: true, index: true },
    // Event kind, e.g. 'REFUNDED'. Kept as a string to stay open for future events.
    type: { type: String, required: true, index: true },
    // Clerk userId of the admin who triggered the event (traceability). Absent for
    // system-generated events (e.g. a refund reconciled from a Stripe webhook).
    actorClerkId: { type: String, required: false },
    // Free-text justification supplied by the admin.
    reason: { type: String, required: false },
    // Structured details, e.g. { stripeRefundId, amount }.
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true },
)

export type OrderEventDocument = InferSchemaType<typeof orderEventSchema>
export const OrderEventModel = model<OrderEventDocument>('OrderEvent', orderEventSchema)
