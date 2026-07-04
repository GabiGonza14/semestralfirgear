import { Schema, model, type InferSchemaType } from 'mongoose'

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '', trim: true },
    requiresSizes: { type: Boolean, default: false, required: true },
  },
  { timestamps: true },
)

export type CategoryDocument = InferSchemaType<typeof categorySchema>
export const CategoryModel = model<CategoryDocument>('Category', categorySchema)
