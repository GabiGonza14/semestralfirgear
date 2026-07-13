import { createClerkClient, type ClerkClient } from '@clerk/backend'
import { env } from '../config/env'

// Lazily-created Clerk backend client. Instantiated once on first use and only
// when a secret key is configured, so dev/test environments without Clerk
// credentials degrade gracefully (the sync calls below become no-ops) — the
// same philosophy as requireAuth's soft-auth path.
let client: ClerkClient | null = null

function getClerkClient(): ClerkClient | null {
  if (!env.clerkSecretKey) {
    return null
  }
  if (!client) {
    client = createClerkClient({ secretKey: env.clerkSecretKey })
  }
  return client
}

/**
 * Mirrors a user's RBAC role into Clerk's publicMetadata so the identity
 * provider and our database stay in sync (HU-44). No-op when Clerk is not
 * configured. Throws if a configured Clerk call fails, so the caller can abort
 * before persisting a change that couldn't be propagated.
 */
export async function syncUserRoleToClerk(clerkUserId: string, role: 'ADMIN' | 'CUSTOMER') {
  const clerk = getClerkClient()
  if (!clerk) {
    return
  }
  await clerk.users.updateUserMetadata(clerkUserId, { publicMetadata: { role } })
}

/**
 * Enforces account (de)activation at the identity provider: a deactivated user
 * is banned in Clerk so they can no longer sign in; reactivation unbans them
 * (HU-44). No-op when Clerk is not configured.
 */
export async function syncUserActiveToClerk(clerkUserId: string, isActive: boolean) {
  const clerk = getClerkClient()
  if (!clerk) {
    return
  }
  if (isActive) {
    await clerk.users.unbanUser(clerkUserId)
  } else {
    await clerk.users.banUser(clerkUserId)
  }
}
