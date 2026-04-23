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
  },
  { timestamps: true },
)

export type UserDocument = InferSchemaType<typeof userSchema>
export const UserModel = model<UserDocument>('User', userSchema)
