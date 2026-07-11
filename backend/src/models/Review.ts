import { Schema, Types, model, type InferSchemaType } from 'mongoose'

// HU-49: a product review left by a verified purchaser. Write access (creating a
// review) is gated in the service layer by an actual paid purchase; this schema
// just models the stored shape and enforces the "one review per product per
// customer" rule at the database level via the compound unique index below.
const reviewSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    // Comment is optional (AC: "comentario opcional"). Trimmed and length-capped
    // so a blank string never stores as a "real" comment and long text can't
    // bloat the document.
    comment: { type: String, required: false, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
)

// One review per (customer, product). This is the authoritative guard for the
// "máximo una reseña por producto" rule — the service pre-checks for a clean
// 409, but this index is what makes the rule race-safe.
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true })

export type ReviewDocument = InferSchemaType<typeof reviewSchema>
export const ReviewModel = model<ReviewDocument>('Review', reviewSchema)
