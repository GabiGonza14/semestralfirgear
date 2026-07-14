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
    // Set when an admin refunds the order via Stripe (-> REFUNDED). stripeRefundId
    // is the id returned by the Stripe Refunds API, for traceability (HU-29).
    // refundReason is denormalized from the OrderEvent history so customers can
    // see it too — the OrderEvent history itself is admin-only.
    refundedAt: { type: Date, required: false },
    stripeRefundId: { type: String, required: false },
    refundReason: { type: String, required: false },
    // Collected by Stripe Checkout (shipping_address_collection) and copied onto
    // the order once payment completes (PENDING -> PAID).
    shippingAddress: {
      type: {
        name: { type: String, required: false },
        line1: { type: String, required: false },
        line2: { type: String, required: false },
        city: { type: String, required: false },
        state: { type: String, required: false },
        postalCode: { type: String, required: false },
        country: { type: String, required: false },
      },
      required: false,
      _id: false,
    },
  },
  { timestamps: true },
)

export type OrderDocument = InferSchemaType<typeof orderSchema>
export const OrderModel = model<OrderDocument>('Order', orderSchema)
