import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing healthService -----------------------
//
// Mock the narrow probe module rather than `mongoose`/Stripe globally: mocking
// mongoose process-wide would pollute other test files (see the repo's
// mock.module gotcha). Controlling the probes here still exercises the real
// readiness composition without touching a real DB or the Stripe API.
const mockIsMongoConnected = mock(() => true)
const mockCheckStripeReachable = mock(async () => ({ ok: true }) as { ok: boolean; error?: string })
mock.module('../../services/healthChecks', () => ({
  isMongoConnected: mockIsMongoConnected,
  checkStripeReachable: mockCheckStripeReachable,
}))

const { getReadinessStatus, getLivenessStatus } = await import('../../services/healthService')

describe('getReadinessStatus (HU-33)', () => {
  beforeEach(() => {
    mockIsMongoConnected.mockClear()
    mockCheckStripeReachable.mockClear()
    mockIsMongoConnected.mockImplementation(() => true)
    mockCheckStripeReachable.mockImplementation(async () => ({ ok: true }))
  })

  it('is ready when MongoDB and Stripe are both up', async () => {
    const result = await getReadinessStatus()
    expect(result.status).toBe('ready')
    expect(result.dependencies.mongodb.status).toBe('up')
    expect(result.dependencies.stripe.status).toBe('up')
  })

  it('is not ready when MongoDB is down', async () => {
    mockIsMongoConnected.mockImplementation(() => false)
    const result = await getReadinessStatus()
    expect(result.status).toBe('not_ready')
    expect(result.dependencies.mongodb.status).toBe('down')
    expect(result.dependencies.stripe.status).toBe('up')
  })

  it('is not ready when Stripe throws / is unreachable', async () => {
    mockCheckStripeReachable.mockImplementation(async () => ({ ok: false, error: 'stripe unreachable' }))
    const result = await getReadinessStatus()
    expect(result.status).toBe('not_ready')
    expect(result.dependencies.mongodb.status).toBe('up')
    expect(result.dependencies.stripe.status).toBe('down')
    expect(result.dependencies.stripe.error).toBe('stripe unreachable')
  })

  it('is not ready when both dependencies are down', async () => {
    mockIsMongoConnected.mockImplementation(() => false)
    mockCheckStripeReachable.mockImplementation(async () => ({ ok: false, error: 'no key' }))
    const result = await getReadinessStatus()
    expect(result.status).toBe('not_ready')
    expect(result.dependencies.mongodb.status).toBe('down')
    expect(result.dependencies.stripe.status).toBe('down')
  })

  it('always includes uptime (number) and version (string)', async () => {
    const result = await getReadinessStatus()
    expect(typeof result.uptime).toBe('number')
    expect(typeof result.version).toBe('string')
  })
})

describe('getLivenessStatus (HU-33)', () => {
  it('reports OK with uptime and version, no dependency checks', () => {
    mockCheckStripeReachable.mockClear()
    mockIsMongoConnected.mockClear()
    const result = getLivenessStatus()
    expect(result.status).toBe('OK')
    expect(typeof result.uptime).toBe('number')
    expect(typeof result.version).toBe('string')
    // Liveness must not consult the dependency probes.
    expect(mockCheckStripeReachable).not.toHaveBeenCalled()
    expect(mockIsMongoConnected).not.toHaveBeenCalled()
  })
})
