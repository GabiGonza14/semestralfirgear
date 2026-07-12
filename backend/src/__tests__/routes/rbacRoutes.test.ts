import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../../app'

// --- Mocks: registered BEFORE importing the routers ------------------------

// Deterministic Clerk JWT verification: any token resolves to a fixed subject.
// The caller's ROLE is decided by the userService mock below, so these tests
// exercise the exact production chain (requireAuth -> requireAdmin) end to end.
const mockVerifyToken = mock(async (_token: string, _options?: unknown) => ({
  sub: 'clerk_user_1',
}))
mock.module('@clerk/backend', () => ({ verifyToken: mockVerifyToken }))

// RBAC role resolution — flipped per test to simulate different users.
let currentRole: 'ADMIN' | 'CUSTOMER' | null = 'ADMIN'
const mockGetUserRoleByClerkId = mock(async (_clerkUserId: string) => currentRole)
mock.module('../../services/userService', () => ({
  getUserRoleByClerkId: mockGetUserRoleByClerkId,
}))

// Stub the admin dashboard aggregation so the ADMIN happy path never hits Mongo.
const SAMPLE_METRICS = {
  totalRevenue: 150,
  ordersCount: 3,
  activeProductsCount: 5,
  usersCount: 8,
}
mock.module('../../services/adminService', () => ({
  getDashboardMetrics: async () => SAMPLE_METRICS,
}))

const { adminRouter } = await import('../../routes/adminRoutes')
const { productRouter } = await import('../../routes/productRoutes')
const { categoryRouter } = await import('../../routes/categoryRoutes')
const { buildErrorResponse } = await import('../../middlewares/errorHandler')
const { env } = await import('../../config/env')

const testApp = new Hono<AppEnv>()
testApp.route('/admin', adminRouter)
testApp.route('/products', productRouter)
testApp.route('/categories', categoryRouter)
testApp.onError((err, c) => buildErrorResponse(err, c))

const VALID_ID = '507f1f77bcf86cd799439011'
const AUTH_HEADERS = { Authorization: 'Bearer valid.jwt' }

describe('RBAC integration — admin routes verified across roles', () => {
  beforeEach(() => {
    mockVerifyToken.mockClear()
    mockGetUserRoleByClerkId.mockClear()
    env.clerkSecretKey = 'test_secret_key'
    currentRole = 'ADMIN'
  })

  describe('/api/admin/* dedicated admin namespace', () => {
    it('returns 401 without a token (auth gate runs before the role check)', async () => {
      const res = await testApp.request('/admin/metrics')
      expect(res.status).toBe(401)
      expect(mockGetUserRoleByClerkId).not.toHaveBeenCalled()
    })

    it('returns 403 for an authenticated CUSTOMER hitting /api/admin/*', async () => {
      currentRole = 'CUSTOMER'
      const res = await testApp.request('/admin/metrics', { headers: AUTH_HEADERS })
      expect(res.status).toBe(403)
      // HU-35: error envelope { error: { code, message, details } }.
      const body = (await res.json()) as { error: { code: string; message: string } }
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.error.message).toBe('Acceso denegado: se requiere rol de administrador')
    })

    it('returns 200 with dashboard metrics for an ADMIN', async () => {
      currentRole = 'ADMIN'
      const res = await testApp.request('/admin/metrics', { headers: AUTH_HEADERS })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(SAMPLE_METRICS)
    })
  })

  describe('admin write routes validate ADMIN on the server, not only the frontend', () => {
    it('DELETE /products/:id is rejected with 403 for a CUSTOMER token', async () => {
      currentRole = 'CUSTOMER'
      const res = await testApp.request(`/products/${VALID_ID}`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      })
      expect(res.status).toBe(403)
    })

    it('DELETE /categories/:id is rejected with 403 for a CUSTOMER token', async () => {
      currentRole = 'CUSTOMER'
      const res = await testApp.request(`/categories/${VALID_ID}`, {
        method: 'DELETE',
        headers: AUTH_HEADERS,
      })
      expect(res.status).toBe(403)
    })

    it('POST /products with no token is rejected with 401 before any role lookup', async () => {
      const res = await testApp.request('/products', { method: 'POST' })
      expect(res.status).toBe(401)
      expect(mockGetUserRoleByClerkId).not.toHaveBeenCalled()
    })
  })
})
