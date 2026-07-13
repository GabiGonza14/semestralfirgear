import { Schema, model, type InferSchemaType } from 'mongoose'

const userSchema = new Schema(
  {
    clerkUserId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ['ADMIN', 'CUSTOMER'],
      default: 'CUSTOMER',
      required: true,
    },
    // Soft-deactivation (HU-44): an inactive account is kept for history/audit
    // but is banned in Clerk so it can no longer sign in. Defaults to true so
    // every existing and newly-synced user is active.
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
)

export type UserDocument = InferSchemaType<typeof userSchema>
export const UserModel = model<UserDocument>('User', userSchema)
