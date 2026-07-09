import { UserModel } from '../models/User'
import { UserAuditEventModel } from '../models/UserAuditEvent'
import { syncUserActiveToClerk, syncUserRoleToClerk } from './clerkUserSync'
import { HttpError } from '../utils/httpError'

// Admin-only user account management (HU-44): role changes and (de)activation.
// Kept in its own service — separate from userService's login-time sync — so
// its dependency surface is exactly UserModel + UserAuditEvent + clerkUserSync.

type Role = 'ADMIN' | 'CUSTOMER'

async function findUserOrThrow(targetUserId: string) {
  const user = await UserModel.findById(targetUserId)
  if (!user) {
    throw new HttpError(404, 'User not found')
  }
  return user
}

/**
 * Changes a user's RBAC role. An admin cannot change their OWN role — this
 * prevents an admin from accidentally locking themselves out of the panel and
 * is the ticket's explicit rule. The change is mirrored to Clerk and recorded
 * in the user audit log. Clerk sync runs before persisting so a failed
 * propagation aborts without leaving the DB and Clerk out of sync.
 */
export async function updateUserRole(actorClerkId: string, targetUserId: string, role: Role) {
  const user = await findUserOrThrow(targetUserId)

  if (user.clerkUserId === actorClerkId) {
    throw new HttpError(403, 'No puedes cambiar tu propio rol')
  }

  const previousRole = user.role as Role
  if (previousRole === role) {
    return user
  }

  await syncUserRoleToClerk(user.clerkUserId, role)

  user.role = role
  await user.save()

  await UserAuditEventModel.create({
    targetUserId: user.id,
    type: 'ROLE_CHANGED',
    actorClerkId,
    metadata: { from: previousRole, to: role },
  })

  return user
}

/**
 * Activates or deactivates a user account without deleting it. A deactivated
 * account is retained for history but banned in Clerk so it can no longer sign
 * in. An admin cannot deactivate their OWN account (self-lockout guard). The
 * change is mirrored to Clerk and recorded in the audit log.
 */
export async function setUserActive(actorClerkId: string, targetUserId: string, isActive: boolean) {
  const user = await findUserOrThrow(targetUserId)

  if (user.clerkUserId === actorClerkId && !isActive) {
    throw new HttpError(403, 'No puedes desactivar tu propia cuenta')
  }

  if (user.isActive === isActive) {
    return user
  }

  await syncUserActiveToClerk(user.clerkUserId, isActive)

  user.isActive = isActive
  await user.save()

  await UserAuditEventModel.create({
    targetUserId: user.id,
    type: 'STATUS_CHANGED',
    actorClerkId,
    metadata: { isActive },
  })

  return user
}
