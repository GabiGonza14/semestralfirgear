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

/**
 * Resolves the RBAC role for a Clerk-authenticated user. Clerk's `sub`
 * (the JWT subject) is NOT the Mongo _id, so we look the profile up by
 * clerkUserId. Returns null when no synced profile exists yet — callers
 * treat "no profile" the same as "not authorized".
 */
export async function getUserRoleByClerkId(
  clerkUserId: string,
): Promise<'ADMIN' | 'CUSTOMER' | null> {
  const user = await UserModel.findOne({ clerkUserId }).select('role')
  return user ? (user.role as 'ADMIN' | 'CUSTOMER') : null
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
