import { verifyToken } from '@clerk/backend'
import type { Context, Next } from 'hono'
import type { AppEnv } from '../app'
import { env } from '../config/env'
import { HttpError } from '../utils/httpError'

export type TokenVerifier = (token: string) => Promise<{ sub: string }>

function defaultVerifier(token: string) {
  return verifyToken(token, { secretKey: env.clerkSecretKey })
}

export function requireAuth(verify: TokenVerifier = defaultVerifier) {
  return async (c: Context<AppEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Unauthorized: missing or malformed Authorization header')
    }

    const token = authHeader.slice(7)

    try {
      const payload = await verify(token)
      c.set('clerkUserId', payload.sub)
    } catch {
      throw new HttpError(401, 'Unauthorized: invalid or expired token')
    }

    await next()
  }
}
