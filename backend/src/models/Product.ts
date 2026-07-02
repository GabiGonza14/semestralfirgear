import { Schema, Types, model, type InferSchemaType } from 'mongoose'

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, required: true, trim: true },
    categoryId: { type: Types.ObjectId, ref: 'Category', required: true },
    isActive: { type: Boolean, default: true, required: true },
    hasDiscount: { type: Boolean, default: false, required: true },
    discountPercentage: { type: Number, default: 0, min: 0, max: 100, required: true },
    discountAmount: { type: Number, default: 0, min: 0, required: true },
    finalPrice: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true },
)

export type ProductDocument = InferSchemaType<typeof productSchema>
export const ProductModel = model<ProductDocument>('Product', productSchema)
