import { Schema, Types, model, type InferSchemaType } from 'mongoose'

const orderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      // FAILED: payment_intent.payment_failed (HU-28). REFUNDED reserved for HU-29.
      enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ['STRIPE'],
      required: false,
    },
    stripeCheckoutSessionId: { type: String, required: false },
    stripePaymentIntentId: { type: String, required: false },
    paidAt: { type: Date, required: false },
    // Set when an admin ships the order (PAID -> SHIPPED). trackingNumber is
    // optional — carriers are not integrated, so it's filled in by hand (HU-31).
    shippedAt: { type: Date, required: false },
    trackingNumber: { type: String, required: false },
  },
  { timestamps: true },
)

export type OrderDocument = InferSchemaType<typeof orderSchema>
export const OrderModel = model<OrderDocument>('Order', orderSchema)
