import { describe, it, expect, mock } from 'bun:test'
import { Hono } from 'hono'
import type { AppEnv } from '../../app'

// The controllers hit Mongoose models via productService — mock it so these
// route-wiring tests don't need a real database.
mock.module('../../services/productService', () => ({
  listProducts: async () => [{ _id: '1', name: 'Producto de prueba' }],
  getProductById: async () => ({ _id: '1', name: 'Producto de prueba' }),
  createProduct: async () => ({ _id: '1', name: 'Producto de prueba' }),
  updateProduct: async () => ({ _id: '1', name: 'Producto de prueba' }),
  deleteProduct: async () => undefined,
}))

const { productRouter } = await import('../../routes/productRoutes')
const { buildErrorResponse } = await import('../../middlewares/errorHandler')
const { env } = await import('../../config/env')

// Mount the real router behind the real error formatter (the same shape
// app.ts wires up) without pulling in the full app graph (Mongo, Stripe,
// upload directories) — this is what turns a thrown HttpError(401) into an
// actual 401 response instead of Hono's generic 500 default.
const testApp = new Hono<AppEnv>()
testApp.route('/products', productRouter)
testApp.onError((err, c) => buildErrorResponse(err, c))

const VALID_ID = '507f1f77bcf86cd799439011'

describe('productRoutes — public catalog vs protected admin writes', () => {
  it('GET /products (catalog) works without an Authorization header', async () => {
    const res = await testApp.request('/products')
    expect(res.status).toBe(200)
  })

  it('GET /products/:id (catalog) works without an Authorization header', async () => {
    const res = await testApp.request(`/products/${VALID_ID}`)
    expect(res.status).toBe(200)
  })

  it('POST /products (admin write) is rejected with 401 without a token', async () => {
    const res = await testApp.request('/products', { method: 'POST' })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { message: string }
    expect(body.message).toBe('No se proporcionó token de autenticación')
  })

  it('PUT /products/:id (admin write) is rejected with 401 without a token', async () => {
    const res = await testApp.request(`/products/${VALID_ID}`, { method: 'PUT' })
    expect(res.status).toBe(401)
  })

  it('DELETE /products/:id (admin write) is rejected with 401 without a token', async () => {
    const res = await testApp.request(`/products/${VALID_ID}`, { method: 'DELETE' })
    expect(res.status).toBe(401)
  })

  it('POST /products with an invalid token is rejected with 401, not passed through to validation', async () => {
    // Other test files mock.module('@clerk/backend') globally for the whole
    // bun test run, so a real verifyToken call here could hit a leftover
    // mock. Forcing no Clerk client is the same "unauthenticated" code path
    // as a real invalid/expired token, and stays deterministic regardless of
    // run order.
    const previousSecret = env.clerkSecretKey
    env.clerkSecretKey = undefined
    try {
      const res = await testApp.request('/products', {
        method: 'POST',
        headers: { Authorization: 'Bearer not-a-real-jwt' },
      })
      expect(res.status).toBe(401)
      const body = (await res.json()) as { message: string }
      expect(body.message).toBe('Token de autenticación inválido o expirado')
    } finally {
      env.clerkSecretKey = previousSecret
    }
  })
})
