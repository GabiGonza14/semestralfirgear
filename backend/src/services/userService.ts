import { UserModel } from '../models/User'
import { HttpError } from '../utils/httpError'

interface SyncClerkUserPayload {
  clerkUserId: string
  fullName: string
  email: string
}

function resolveRole(email: string): 'ADMIN' | 'CUSTOMER' {
  return email.trim().toLowerCase() === 'gabigonza449@gmail.com' ? 'ADMIN' : 'CUSTOMER'
}

export async function listUsers() {
  return UserModel.find().sort({ createdAt: -1 })
}

export async function getUserById(id: string) {
  const user = await UserModel.findById(id)
  if (!user) {
    throw new HttpError(404, 'User not found')
  }
  return user
}

export async function getUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const user = await UserModel.findOne({ email: normalizedEmail })
  if (!user) {
    throw new HttpError(404, 'User not found')
  }
  return user
}

export async function syncClerkUser(payload: SyncClerkUserPayload) {
  const normalizedEmail = payload.email.trim().toLowerCase()
  const role = resolveRole(normalizedEmail)

  const [byClerkId, byEmail] = await Promise.all([
    UserModel.findOne({ clerkUserId: payload.clerkUserId }),
    UserModel.findOne({ email: normalizedEmail }),
  ])

  if (byClerkId && byEmail && byClerkId.id !== byEmail.id) {
    throw new HttpError(409, 'User conflict: clerkUserId and email belong to different users')
  }

  const existingUser = byClerkId ?? byEmail

  if (!existingUser) {
    const createdUser = await UserModel.create({
      clerkUserId: payload.clerkUserId,
      fullName: payload.fullName,
      email: normalizedEmail,
      role,
    })

    return { user: createdUser, created: true }
  }

  existingUser.clerkUserId = payload.clerkUserId
  existingUser.fullName = payload.fullName
  existingUser.email = normalizedEmail
  existingUser.role = role
  await existingUser.save()

  return { user: existingUser, created: false }
}
