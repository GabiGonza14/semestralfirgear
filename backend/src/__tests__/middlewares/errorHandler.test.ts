import { describe, it, expect } from 'bun:test'
import { Hono } from 'hono'
import { Error as MongooseError } from 'mongoose'
import { z, ZodError } from 'zod'
import type { AppEnv } from '../../app'
import { buildErrorResponse } from '../../middlewares/errorHandler'
import { HttpError } from '../../utils/httpError'

// Drives buildErrorResponse through a real Hono context and returns the parsed
// JSON body + status, so tests assert the actual wire shape (HU-35 envelope).
async function run(error: Error): Promise<{ status: number; body: any }> {
  const app = new Hono<AppEnv>()
  app.get('/boom', () => {
    throw error
  })
  app.onError((err, c) => buildErrorResponse(err, c))
  const res = await app.request('/boom')
  return { status: res.status, body: await res.json() }
}

describe('buildErrorResponse — envelope (HU-35)', () => {
  it('wraps an HttpError with details into { error: { code, message, details } }', async () => {
    const { status, body } = await run(
      new HttpError(400, 'Validation failed', [{ path: 'name', message: 'name is required' }]),
    )
    expect(status).toBe(400)
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: [{ path: 'name', message: 'name is required' }],
      },
    })
  })

  it('omits details for an HttpError without .errors', async () => {
    const { status, body } = await run(new HttpError(404, 'Product not found'))
    expect(status).toBe(404)
    expect(body).toEqual({ error: { code: 'NOT_FOUND', message: 'Product not found' } })
    expect('details' in body.error).toBe(false)
  })

  it('maps status codes to stable machine-readable codes', async () => {
    expect((await run(new HttpError(401, 'x'))).body.error.code).toBe('UNAUTHORIZED')
    expect((await run(new HttpError(403, 'x'))).body.error.code).toBe('FORBIDDEN')
    expect((await run(new HttpError(409, 'x'))).body.error.code).toBe('CONFLICT')
  })

  it('maps a ZodError to 400 VALIDATION_ERROR with field details', async () => {
    let zodError: ZodError
    try {
      z.object({ email: z.string().email(), age: z.number() }).parse({ email: 'nope', age: 'x' })
      throw new Error('expected zod to throw')
    } catch (e) {
      zodError = e as ZodError
    }
    const { status, body } = await run(zodError)
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.message).toBe('Validation failed')
    expect(Array.isArray(body.error.details)).toBe(true)
    // Each detail names the failing field.
    expect(body.error.details.map((d: any) => d.path)).toEqual(expect.arrayContaining(['email', 'age']))
    expect(body.error.details[0]).toHaveProperty('message')
  })

  it('maps a Mongoose CastError to 400 VALIDATION_ERROR with the bad path', async () => {
    const castError = new MongooseError.CastError('ObjectId', 'not-an-id', '_id')
    const { status, body } = await run(castError)
    expect(status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual([{ path: '_id', message: 'Invalid id format' }])
  })

  it('maps a duplicate-key (11000) error to 409 CONFLICT', async () => {
    const dupError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    const { status, body } = await run(dupError)
    expect(status).toBe(409)
    expect(body.error.code).toBe('CONFLICT')
    expect(body.error.message).toBe('Resource conflict')
  })
})

describe('buildErrorResponse — internal errors never leak a stack (HU-35 criterion 4)', () => {
  it('maps a plain unexpected Error to 500 INTERNAL_ERROR', async () => {
    const { status, body } = await run(new TypeError('cannot read property of undefined'))
    expect(status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('does NOT include a stack field in the 500 body', async () => {
    const err = new Error('secret internals here')
    const { body } = await run(err)
    expect('stack' in body.error).toBe(false)
    expect('stack' in body).toBe(false)
    // The serialized body must not contain the stack anywhere.
    expect(JSON.stringify(body)).not.toContain('at ')
    expect(JSON.stringify(body)).not.toContain(err.stack?.split('\n')[1]?.trim() ?? '###no-stack###')
  })

  // CWE-209: an uncaught exception's own message is uncurated (could be a DB
  // driver string, an internal path, a dependency's error text) and must not
  // reach the client any more than the stack does.
  it('does NOT leak the raw error.message of an unexpected exception', async () => {
    const { body } = await run(new Error('ECONNREFUSED 10.0.4.2:27017 secret internals here'))
    expect(body.error.message).not.toContain('secret internals here')
    expect(body.error.message).not.toContain('ECONNREFUSED')
    expect(body.error.message).toBe('Ocurrió un error interno inesperado.')
  })

  // A deliberately-thrown HttpError(500, "...") is an authored, client-safe
  // message (e.g. "Stripe webhook is not configured") — unlike an uncaught
  // exception, it must NOT be genericized.
  it('DOES keep the authored message of a deliberate HttpError(500, ...)', async () => {
    const { status, body } = await run(new HttpError(500, 'Stripe webhook is not configured'))
    expect(status).toBe(500)
    expect(body.error.message).toBe('Stripe webhook is not configured')
  })

  it('does NOT leak a stack even when NODE_ENV is not production (no dev carve-out)', async () => {
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      const { body } = await run(new Error('dev error'))
      expect('stack' in body.error).toBe(false)
      expect(JSON.stringify(body)).not.toContain('stack')
    } finally {
      process.env.NODE_ENV = prev
    }
  })
})
