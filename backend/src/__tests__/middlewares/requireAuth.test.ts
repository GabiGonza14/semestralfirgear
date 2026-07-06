import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock @clerk/backend before importing the middleware so it resolves to the
// mocked verifyToken. Its behavior is controlled per test below.
const mockVerifyToken = mock(async (_token: string, _options?: unknown) => ({
  sub: 'clerk_user_1',
}))

mock.module('@clerk/backend', () => ({
  verifyToken: mockVerifyToken,
}))

const { env } = await import('../../config/env')
const { HttpError } = await import('../../utils/httpError')
const { requireAuth, requireAuthStrict, requireAuthMiddleware } = await import(
  '../../middlewares/requireAuth'
)

function makeContext(authHeader?: string) {
  const store = new Map<string, unknown>()
  return {
    req: { header: (name: string) => (name === 'Authorization' ? authHeader : undefined) },
    set: (key: string, value: unknown) => store.set(key, value),
    get: (key: string) => store.get(key),
  }
}

describe('requireAuth (soft)', () => {
  beforeEach(() => {
    mockVerifyToken.mockClear()
    env.clerkSecretKey = 'test_secret_key'
  })

  it('returns unauthenticated when no token is provided', async () => {
    expect(await requireAuth(undefined)).toEqual({ userId: null, authenticated: false })
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('returns unauthenticated when CLERK_SECRET_KEY is not configured', async () => {
    env.clerkSecretKey = undefined
    expect(await requireAuth('Bearer some.jwt')).toEqual({ userId: null, authenticated: false })
    expect(mockVerifyToken).not.toHaveBeenCalled()
  })

  it('returns authenticated with the Clerk userId when the token is valid', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'clerk_user_42' })
    expect(await requireAuth('Bearer valid.jwt.token')).toEqual({
      userId: 'clerk_user_42',
      authenticated: true,
    })
    expect(mockVerifyToken).toHaveBeenCalledWith('valid.jwt.token', { secretKey: 'test_secret_key' })
  })

  it('strips the Bearer prefix case-insensitively before verifying', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'clerk_user_1' })
    await requireAuth('bearer abc.def.ghi')
    expect(mockVerifyToken).toHaveBeenCalledWith('abc.def.ghi', { secretKey: 'test_secret_key' })
  })

  it('returns unauthenticated when the token is invalid or expired', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('expired'))
    expect(await requireAuth('Bearer expired.jwt')).toEqual({
      userId: null,
      authenticated: false,
    })
  })
})

describe('requireAuthStrict', () => {
  beforeEach(() => {
    mockVerifyToken.mockClear()
    env.clerkSecretKey = 'test_secret_key'
  })

  it('throws 401 "No se proporcionó token de autenticación" when the header is absent', async () => {
    await expect(requireAuthStrict(undefined)).rejects.toThrow(
      'No se proporcionó token de autenticación',
    )
  })

  it('throws an HttpError with statusCode 401 (not a generic 500) for a missing token', async () => {
    let caught: unknown
    try {
      await requireAuthStrict(undefined)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(HttpError)
    expect((caught as InstanceType<typeof HttpError>).statusCode).toBe(401)
  })

  it('throws 401 "Token de autenticación inválido o expirado" when the header has no Bearer format', async () => {
    // No "Bearer " prefix — the raw string is sent to verifyToken as-is and fails.
    mockVerifyToken.mockRejectedValueOnce(new Error('malformed'))
    await expect(requireAuthStrict('this-is-not-a-bearer-header')).rejects.toThrow(
      'Token de autenticación inválido o expirado',
    )
  })

  it('throws 401 "Token de autenticación inválido o expirado" when the token is invalid', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('invalid signature'))
    await expect(requireAuthStrict('Bearer invalid.jwt')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Token de autenticación inválido o expirado',
    })
  })

  it('throws 401 "Token de autenticación inválido o expirado" when the token is expired', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('token expired'))
    await expect(requireAuthStrict('Bearer expired.jwt')).rejects.toMatchObject({
      statusCode: 401,
      message: 'Token de autenticación inválido o expirado',
    })
  })

  it('resolves with the auth context when the token is valid', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'clerk_user_7' })
    expect(await requireAuthStrict('Bearer valid.jwt')).toEqual({
      userId: 'clerk_user_7',
      authenticated: true,
    })
  })
})

describe('requireAuthMiddleware', () => {
  beforeEach(() => {
    mockVerifyToken.mockClear()
    env.clerkSecretKey = 'test_secret_key'
  })

  it('attaches the authenticated userId to the context and calls next()', async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: 'clerk_user_9' })
    const middleware = requireAuthMiddleware()
    const ctx = makeContext('Bearer valid.jwt')
    const next = mock(async () => {})

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await middleware(ctx as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(ctx.get('userId')).toBe('clerk_user_9')
  })

  it('rejects with 401 and never calls next() when the Authorization header is missing', async () => {
    const middleware = requireAuthMiddleware()
    const ctx = makeContext(undefined)
    const next = mock(async () => {})

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middleware(ctx as any, next),
    ).rejects.toMatchObject({ statusCode: 401, message: 'No se proporcionó token de autenticación' })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 401 and never calls next() when the token is invalid or expired', async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error('invalid'))
    const middleware = requireAuthMiddleware()
    const ctx = makeContext('Bearer bad.jwt')
    const next = mock(async () => {})

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      middleware(ctx as any, next),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Token de autenticación inválido o expirado',
    })
    expect(next).not.toHaveBeenCalled()
  })
})
