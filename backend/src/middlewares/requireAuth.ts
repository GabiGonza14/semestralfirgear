import { verifyToken as clerkVerifyToken } from '@clerk/backend'
import type { Context, Next } from 'hono'
import type { AppEnv } from '../app'
import { env } from '../config/env'
import { HttpError } from '../utils/httpError'

export interface AuthContext {
  userId: string | null
  authenticated: boolean
}

/**
 * Soft-auth: extracts and validates a Clerk JWT when present.
 * Returns { authenticated: false } if no token is provided or if CLERK_SECRET_KEY
 * is not configured — does NOT throw. Use requireAuthStrict for protected routes/tools.
 *
 * `verifyToken` is a standalone function exported by @clerk/backend (it takes
 * the secret key per call) — NOT a method on the client returned by
 * createClerkClient(), which has no `verifyToken` member.
 */
export async function requireAuth(bearerToken?: string): Promise<AuthContext> {
  if (!bearerToken) return { userId: null, authenticated: false }
  if (!env.clerkSecretKey) return { userId: null, authenticated: false }

  try {
    const token = bearerToken.replace(/^Bearer\s+/i, '')
    const payload = await clerkVerifyToken(token, { secretKey: env.clerkSecretKey })
    return { userId: payload.sub, authenticated: true }
  } catch {
    return { userId: null, authenticated: false }
  }
}

/**
 * Strict-auth: throws an HttpError(401) when the token is missing, malformed,
 * invalid, or expired. This is the single cross-cutting auth gate — shared
 * by every protected backend route (via requireAuthMiddleware) and every
 * protected MCP tool, so the JWT validation logic never gets duplicated.
 */
export async function requireAuthStrict(bearerToken?: string): Promise<AuthContext> {
  if (!bearerToken) {
    throw new HttpError(401, 'No se proporcionó token de autenticación')
  }

  const ctx = await requireAuth(bearerToken)
  if (!ctx.authenticated) {
    throw new HttpError(401, 'Token de autenticación inválido o expirado')
  }
  return ctx
}

/**
 * Hono middleware: validates the Authorization header's Clerk JWT before
 * letting the request reach the route handler, and attaches the resolved
 * Clerk userId to the request context for downstream handlers to use.
 * Rejects with 401 (via requireAuthStrict) when the token is missing,
 * malformed, invalid, or expired.
 */
export function requireAuthMiddleware() {
  return async (c: Context<AppEnv>, next: Next) => {
    const ctx = await requireAuthStrict(c.req.header('Authorization') ?? undefined)
    c.set('userId', ctx.userId)
    await next()
  }
}
