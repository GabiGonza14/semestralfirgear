import { Schema, Types, model, type InferSchemaType } from 'mongoose'

const orderItemSchema = new Schema(
  {
    orderId: { type: Types.ObjectId, ref: 'Order', required: true },
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { timestamps: false },
)

export type OrderItemDocument = InferSchemaType<typeof orderItemSchema>
export const OrderItemModel = model<OrderItemDocument>('OrderItem', orderItemSchema)
