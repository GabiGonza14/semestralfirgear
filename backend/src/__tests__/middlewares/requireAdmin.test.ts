import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Control the DB role resolution without a real database. requireAdmin.ts
// imports getUserRoleByClerkId from userService — mock that single boundary.
const mockGetUserRoleByClerkId = mock(
  async (_clerkUserId: string): Promise<'ADMIN' | 'CUSTOMER' | null> => 'ADMIN',
)

mock.module('../../services/userService', () => ({
  getUserRoleByClerkId: mockGetUserRoleByClerkId,
}))

const { HttpError } = await import('../../utils/httpError')
const { requireAdminMiddleware } = await import('../../middlewares/requireAdmin')

// Minimal Hono-like context: only the get/set used by the middleware.
function makeContext(userId: string | null) {
  const store = new Map<string, unknown>()
  store.set('userId', userId)
  return {
    set: (key: string, value: unknown) => store.set(key, value),
    get: (key: string) => store.get(key),
  }
}

describe('requireAdminMiddleware (RBAC gate)', () => {
  beforeEach(() => {
    mockGetUserRoleByClerkId.mockClear()
  })

  it('calls next() and attaches userRole when the resolved user is an ADMIN', async () => {
    mockGetUserRoleByClerkId.mockResolvedValueOnce('ADMIN')
    const ctx = makeContext('clerk_admin')
    const next = mock(async () => {})

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await requireAdminMiddleware()(ctx as any, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(ctx.get('userRole')).toBe('ADMIN')
    expect(mockGetUserRoleByClerkId).toHaveBeenCalledWith('clerk_admin')
  })

  it('rejects an authenticated CUSTOMER with 403 and never calls next()', async () => {
    mockGetUserRoleByClerkId.mockResolvedValueOnce('CUSTOMER')
    const ctx = makeContext('clerk_customer')
    const next = mock(async () => {})

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requireAdminMiddleware()(ctx as any, next),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Acceso denegado: se requiere rol de administrador',
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 403 when the user has no synced profile (role resolves to null)', async () => {
    mockGetUserRoleByClerkId.mockResolvedValueOnce(null)
    const ctx = makeContext('clerk_ghost')
    const next = mock(async () => {})

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requireAdminMiddleware()(ctx as any, next),
    ).rejects.toBeInstanceOf(HttpError)
    expect(next).not.toHaveBeenCalled()
  })

  it('rejects with 401 (before any DB lookup) when no authenticated userId is present', async () => {
    const ctx = makeContext(null)
    const next = mock(async () => {})

    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requireAdminMiddleware()(ctx as any, next),
    ).rejects.toMatchObject({ statusCode: 401 })
    expect(next).not.toHaveBeenCalled()
    // The role lookup must be skipped entirely when there is no identity.
    expect(mockGetUserRoleByClerkId).not.toHaveBeenCalled()
  })
})
