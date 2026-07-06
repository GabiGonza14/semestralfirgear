import type { Context, Next } from 'hono'
import type { AppEnv } from '../app'
import { getUserRoleByClerkId } from '../services/userService'
import { HttpError } from '../utils/httpError'

/**
 * RBAC gate: authorizes only users whose synced profile has the ADMIN role.
 *
 * This is the SECOND half of the "double verification" — it must run AFTER
 * requireAuthMiddleware, which validates the Clerk JWT and attaches the
 * resolved Clerk userId to the context. This middleware then resolves that
 * userId's role from the database (roles are synced from Clerk on login) and
 * re-checks it on every single request, so an ADMIN endpoint can never be
 * reached with only a valid-but-non-admin token.
 *
 * - 401 if no authenticated userId is present (auth gate did not run / failed).
 * - 403 if the user is authenticated but is not an ADMIN (e.g. a CUSTOMER, or
 *   a token whose profile has not been synced yet).
 */
export function requireAdminMiddleware() {
  return async (c: Context<AppEnv>, next: Next) => {
    const clerkUserId = c.get('userId')
    if (!clerkUserId) {
      throw new HttpError(401, 'No se proporcionó token de autenticación')
    }

    const role = await getUserRoleByClerkId(clerkUserId)
    if (role !== 'ADMIN') {
      throw new HttpError(403, 'Acceso denegado: se requiere rol de administrador')
    }

    c.set('userRole', role)
    await next()
  }
}
