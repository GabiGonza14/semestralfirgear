import { Schema, Types, model, type InferSchemaType } from 'mongoose'
import { SIZE_OPTIONS } from '../utils/sizes'

const orderItemSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    // Only set for products whose category requires sizes.
    size: { type: String, enum: SIZE_OPTIONS, required: false },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: false },
)

export type OrderItemDocument = InferSchemaType<typeof orderItemSchema>
export const OrderItemModel = model<OrderItemDocument>('OrderItem', orderItemSchema)
