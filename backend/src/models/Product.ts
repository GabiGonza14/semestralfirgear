import { Schema, Types, model, type InferSchemaType } from 'mongoose'
import { SIZE_OPTIONS } from '../utils/sizes'

const productSizeSchema = new Schema(
  {
    label: { type: String, enum: SIZE_OPTIONS, required: true },
    stock: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    // Direct stock count for products without sizes. For products whose
    // category requires sizes, this is the auto-computed sum of `sizes`.
    stock: { type: Number, required: true, min: 0, default: 0 },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => value.length >= 1 && value.length <= 4,
        message: 'A product must have between 1 and 4 images',
      },
    },
    // Cloudinary public_id per entry in `images`, same index, kept in sync by
    // productService. Needed to delete the right asset from Cloudinary later
    // (a URL alone isn't enough). Empty string at an index means that image
    // predates the Cloudinary migration (local file, nothing to delete there).
    imagePublicIds: { type: [String], default: [] },
    sizes: { type: [productSizeSchema], default: [] },
    // HU-46: per-product low-stock threshold. When stock drops to at-or-below
    // this value the product is flagged as low on the admin dashboard and, on the
    // downward crossing, admins are emailed. Defaults to 5 so pre-existing
    // products (which never stored this field) behave sensibly without a migration.
    lowStockThreshold: { type: Number, default: 5, min: 0, required: true },
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
