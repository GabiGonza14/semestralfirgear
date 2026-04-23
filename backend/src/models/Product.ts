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
  },
  { timestamps: true },
)

export type ProductDocument = InferSchemaType<typeof productSchema>
export const ProductModel = model<ProductDocument>('Product', productSchema)
