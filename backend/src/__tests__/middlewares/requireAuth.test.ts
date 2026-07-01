import { describe, expect, it, mock } from 'bun:test'
import { Hono } from 'hono'
import { buildErrorResponse } from '../../middlewares/errorHandler'
import { requireAuth } from '../../middlewares/requireAuth'
import type { AppEnv } from '../../app'

function buildApp(verify: (token: string) => Promise<{ sub: string }>) {
  const app = new Hono<AppEnv>()
  app.get('/protected', requireAuth(verify), (c) => c.json({ userId: c.get('clerkUserId') }))
  app.onError((err, c) => buildErrorResponse(err as Error, c))
  return app
}

const validVerifier = async (_token: string) => ({ sub: 'user_abc123' })
const failingVerifier = async (_token: string): Promise<{ sub: string }> => {
  throw new Error('Token expired')
}

describe('requireAuth middleware', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = buildApp(validVerifier)
    const res = await app.request('/protected')
    expect(res.status).toBe(401)
    const body = await res.json() as { message: string }
    expect(body.message).toContain('missing or malformed')
  })

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const app = buildApp(validVerifier)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic abc123' },
    })
    expect(res.status).toBe(401)
    const body = await res.json() as { message: string }
    expect(body.message).toContain('missing or malformed')
  })

  it('returns 401 when Authorization header is only "Bearer " with no token', async () => {
    const app = buildApp(validVerifier)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer ' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 200 and sets clerkUserId in context for a valid token', async () => {
    const app = buildApp(validVerifier)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer valid.jwt.token' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { userId: string }
    expect(body.userId).toBe('user_abc123')
  })

  it('calls verify with the token extracted from the Bearer header', async () => {
    let capturedToken = ''
    const spyVerifier = async (token: string) => {
      capturedToken = token
      return { sub: 'user_xyz' }
    }
    const app = buildApp(spyVerifier)
    await app.request('/protected', {
      headers: { Authorization: 'Bearer my.test.token' },
    })
    expect(capturedToken).toBe('my.test.token')
  })

  it('returns 401 when token verification throws (invalid token)', async () => {
    const app = buildApp(failingVerifier)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer expired.or.invalid' },
    })
    expect(res.status).toBe(401)
    const body = await res.json() as { message: string }
    expect(body.message).toContain('invalid or expired token')
  })

  it('returns 401 when token is a known injection attempt', async () => {
    const app = buildApp(failingVerifier)
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer <script>alert(1)</script>' },
    })
    expect(res.status).toBe(401)
  })

  it('does not call next when token is invalid', async () => {
    let nextCalled = false
    const app = new Hono<AppEnv>()
    app.get('/protected', requireAuth(failingVerifier), (c) => {
      nextCalled = true
      return c.json({})
    })
    app.onError((err, c) => buildErrorResponse(err as Error, c))
    await app.request('/protected', {
      headers: { Authorization: 'Bearer bad.token' },
    })
    expect(nextCalled).toBe(false)
  })

  it('uses the mock verifier instead of calling Clerk API', async () => {
    const mockedVerify = mock(async (_t: string) => ({ sub: 'user_mocked' }))
    const app = buildApp(mockedVerify)
    await app.request('/protected', {
      headers: { Authorization: 'Bearer anything' },
    })
    expect(mockedVerify).toHaveBeenCalledTimes(1)
  })
})
