import { Schema, Types, model, type InferSchemaType } from 'mongoose'

const orderSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
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
  },
  { timestamps: true },
)

export type OrderDocument = InferSchemaType<typeof orderSchema>
export const OrderModel = model<OrderDocument>('Order', orderSchema)
