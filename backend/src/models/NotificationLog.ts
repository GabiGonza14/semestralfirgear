import { Schema, Types, model, type InferSchemaType } from 'mongoose'

// Audit trail for every transactional email the system tries to send. Shared by
// the payment/webhook flows (HU-28/29) and the notification HUs (HU-30/31), so
// there is a single place to see what was sent, when, and whether it failed.
const notificationLogSchema = new Schema(
  {
    // Business event that triggered the email, e.g. PAYMENT_FAILED, ORDER_CONFIRMED.
    type: { type: String, required: true, index: true },
    channel: { type: String, enum: ['EMAIL'], required: true, default: 'EMAIL' },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      // skipped = no provider key configured (graceful fallback, not an error).
      enum: ['pending', 'sent', 'failed', 'skipped'],
      required: true,
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, required: true, default: 0 },
    sentAt: { type: Date, required: false },
    lastError: { type: String, required: false },
    providerMessageId: { type: String, required: false },
    orderId: { type: Types.ObjectId, ref: 'Order', required: false, index: true },
  },
  { timestamps: true },
)

export type NotificationLogDocument = InferSchemaType<typeof notificationLogSchema>
export const NotificationLogModel = model<NotificationLogDocument>(
  'NotificationLog',
  notificationLogSchema,
)
