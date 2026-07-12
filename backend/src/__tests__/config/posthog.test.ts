import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing the module under test ----------------

// Fake posthog-node client that records captureException calls.
interface CaptureCall {
  error: unknown
  distinctId?: string
  props?: Record<string | number, unknown>
}
const captureCalls: CaptureCall[] = []
class FakePostHog {
  constructor(
    public apiKey: string,
    public options: Record<string, unknown>,
  ) {}
  captureException(error: unknown, distinctId?: string, props?: Record<string | number, unknown>) {
    captureCalls.push({ error, distinctId, props })
  }
  async shutdown() {}
}
mock.module('posthog-node', () => ({ PostHog: FakePostHog }))

// Mutable env so we can toggle "configured" vs "not configured" per test.
// NOTE: mock.module replaces the env module process-wide (the documented
// mock.module pollution gotcha), so this MUST be a COMPLETE mirror of the real
// env — a partial object would break any co-running test that reads other fields
// (e.g. notificationService reading sendgridApiKey/emailFrom). Only posthogApiKey
// is toggled per test; every other field carries a benign default.
const fakeEnv = {
  nodeEnv: 'test',
  port: 4000,
  mongodbUri: 'mongodb://127.0.0.1:27017/fitgear-test',
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:4000',
  stripeSecretKey: 'sk_test_dummy',
  stripeWebhookSecret: 'whsec_dummy',
  clerkSecretKey: 'sk_test_clerk_dummy',
  sendgridApiKey: 'SG.test',
  emailFrom: 'FITGEAR <test@example.com>',
  posthogApiKey: 'phc_test' as string | undefined,
  posthogHost: 'https://us.i.posthog.com',
}
mock.module('../../config/env', () => ({ env: fakeEnv }))

const { capturePostHogException } = await import('../../config/posthog')
const { HttpError } = await import('../../utils/httpError')

describe('capturePostHogException (HU-34)', () => {
  beforeEach(() => {
    captureCalls.length = 0
    fakeEnv.posthogApiKey = 'phc_test'
  })

  it('no-ops (no throw, no capture) when PostHog is not configured', () => {
    fakeEnv.posthogApiKey = undefined
    expect(() =>
      capturePostHogException(new Error('boom'), { method: 'GET', path: '/api/x', userId: null }),
    ).not.toThrow()
    expect(captureCalls.length).toBe(0)
  })

  it('uses the userId as distinctId when present', () => {
    capturePostHogException(new Error('boom'), { method: 'POST', path: '/api/orders', userId: 'user_123' })
    expect(captureCalls).toHaveLength(1)
    expect(captureCalls[0]?.distinctId).toBe('user_123')
  })

  it('falls back to a fixed anonymous distinctId on public routes (userId null)', () => {
    capturePostHogException(new Error('boom'), { method: 'GET', path: '/api/health', userId: null })
    expect(captureCalls[0]?.distinctId).toBe('backend-anonymous')
  })

  it('sanitizes request-derived context (strips control chars from path)', () => {
    capturePostHogException(new Error('boom'), {
      method: 'GET',
      // A CRLF-injection attempt in the path must not survive into the sink.
      path: '/api/x\r\nInjected: evil',
      userId: null,
    })
    expect(captureCalls[0]?.props?.path).toBe('/api/xInjected: evil')
    expect(captureCalls[0]?.props?.method).toBe('GET')
  })

  it('passes the original Error through to the client', () => {
    const error = new Error('kaboom')
    capturePostHogException(error, { method: 'GET', path: '/api/x', userId: null })
    expect(captureCalls[0]?.error).toBe(error)
  })

  // Acceptance criterion 1 says "excepciones no controladas" — a 4xx HttpError is
  // the app working as designed (validation, not-found, conflict), not an
  // unexpected failure, and must not flood Error Tracking with routine traffic.
  it('does NOT capture a routine 400 HttpError (expected validation failure)', () => {
    capturePostHogException(new HttpError(400, 'Validation failed'), {
      method: 'POST',
      path: '/api/products',
      userId: 'user_123',
    })
    expect(captureCalls).toHaveLength(0)
  })

  it('does NOT capture a routine 404/409 HttpError (not-found, conflict)', () => {
    capturePostHogException(new HttpError(404, 'Product not found'), { method: 'GET', path: '/api/x', userId: null })
    capturePostHogException(new HttpError(409, 'Insufficient stock'), { method: 'POST', path: '/api/orders', userId: null })
    expect(captureCalls).toHaveLength(0)
  })

  it('DOES capture a 5xx HttpError (a genuine backend failure, not routine)', () => {
    capturePostHogException(new HttpError(500, 'Stripe webhook is not configured'), {
      method: 'POST',
      path: '/api/payments/webhook',
      userId: null,
    })
    expect(captureCalls).toHaveLength(1)
  })

  it('DOES capture a plain (non-HttpError) exception', () => {
    capturePostHogException(new TypeError('cannot read property of undefined'), {
      method: 'GET',
      path: '/api/x',
      userId: null,
    })
    expect(captureCalls).toHaveLength(1)
  })
})
