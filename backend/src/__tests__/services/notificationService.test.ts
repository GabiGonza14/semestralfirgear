import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test'

// Audit writes go to Mongo in production — mock the model so tests need no DB.
const mockCreate = mock(async () => ({ id: 'log_1' }))
const mockFindByIdAndUpdate = mock(async () => ({}))
mock.module('../../models/NotificationLog', () => ({
  NotificationLogModel: { create: mockCreate, findByIdAndUpdate: mockFindByIdAndUpdate },
}))

const { env } = await import('../../config/env')
const { sendNotification } = await import('../../services/notificationService')

interface FakeResponse {
  ok: boolean
  status: number
  headers: { get: (key: string) => string | null }
  text: () => Promise<string>
}
// SendGrid returns 202 Accepted with an empty body; the id is in the X-Message-Id header.
const okResponse = (id = 'email_123'): FakeResponse => ({
  ok: true,
  status: 202,
  headers: { get: (key) => (key.toLowerCase() === 'x-message-id' ? id : null) },
  text: async () => '',
})
const errResponse = (status = 500): FakeResponse => ({
  ok: false,
  status,
  headers: { get: () => null },
  text: async () => 'provider error',
})

const originalFetch = globalThis.fetch
const mockFetch = mock(async () => okResponse())

const message = { type: 'TEST', to: 'user@example.com', subject: 'Hola', html: '<p>hola</p>' }

describe('sendNotification (email + retry/backoff + graceful fallback)', () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockFindByIdAndUpdate.mockClear()
    mockFetch.mockClear()
    mockFetch.mockImplementation(async () => okResponse())
    // @ts-expect-error test override of the global fetch
    globalThis.fetch = mockFetch
    env.sendgridApiKey = 'test_sendgrid_key'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('graceful fallback: skips the send (no fetch) when SENDGRID_API_KEY is missing', async () => {
    env.sendgridApiKey = undefined

    const result = await sendNotification(message)

    expect(result.status).toBe('skipped')
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      'log_1',
      expect.objectContaining({ status: 'skipped' }),
    )
  })

  it('sends successfully on the first attempt and records the provider id', async () => {
    const result = await sendNotification(message, { baseBackoffMs: 1 })

    expect(result).toMatchObject({ status: 'sent', attempts: 1, providerMessageId: 'email_123' })
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFindByIdAndUpdate).toHaveBeenLastCalledWith(
      'log_1',
      expect.objectContaining({ status: 'sent', attempts: 1 }),
    )
  })

  it('retries with backoff and succeeds on the second attempt', async () => {
    mockFetch.mockImplementationOnce(async () => errResponse(500))

    const result = await sendNotification(message, { baseBackoffMs: 1 })

    expect(result).toMatchObject({ status: 'sent', attempts: 2 })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('gives up as failed after exactly 3 attempts on transient (5xx) errors', async () => {
    mockFetch.mockImplementation(async () => errResponse(500))

    const result = await sendNotification(message, { baseBackoffMs: 1 })

    expect(result.status).toBe('failed')
    expect(result.attempts).toBe(3)
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(mockFindByIdAndUpdate).toHaveBeenLastCalledWith(
      'log_1',
      expect.objectContaining({ status: 'failed', attempts: 3 }),
    )
  })

  it('does NOT retry a permanent 4xx error (fails after a single attempt)', async () => {
    mockFetch.mockImplementation(async () => errResponse(403))

    const result = await sendNotification(message, { baseBackoffMs: 1 })

    expect(result.status).toBe('failed')
    expect(result.attempts).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
