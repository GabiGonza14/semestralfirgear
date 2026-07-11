import { describe, it, expect } from 'bun:test'
import { formatLogLine, sanitizeContext } from '../../utils/logger'

describe('sanitizeContext — redaction (acceptance criterion 4)', () => {
  it('redacts a top-level sensitive key', () => {
    const result = sanitizeContext({ password: 'hunter2', userId: 'u1' })
    expect(result).toEqual({ password: '[REDACTED]', userId: 'u1' })
  })

  it('redacts sensitive keys case-insensitively', () => {
    const result = sanitizeContext({ Authorization: 'Bearer x', Token: 'abc' })
    expect(result).toEqual({ Authorization: '[REDACTED]', Token: '[REDACTED]' })
  })

  it('redacts compound secret keys (stripeSecretKey, clerkSecretKey)', () => {
    const result = sanitizeContext({ stripeSecretKey: 'sk_live_x', clerkSecretKey: 'sk_x' })
    expect(result).toEqual({ stripeSecretKey: '[REDACTED]', clerkSecretKey: '[REDACTED]' })
  })

  it('redacts card data keys', () => {
    const result = sanitizeContext({ cardNumber: '4242424242424242', cvv: '123' })
    expect(result).toEqual({ cardNumber: '[REDACTED]', cvv: '[REDACTED]' })
  })

  it('redacts a nested sensitive key', () => {
    const result = sanitizeContext({
      user: { id: 'u1', password: 'secret' },
      payment: { card: { cardNumber: '4242', cvv: '999' } },
    })
    expect(result).toEqual({
      user: { id: 'u1', password: '[REDACTED]' },
      payment: { card: { cardNumber: '[REDACTED]', cvv: '[REDACTED]' } },
    })
  })

  it('redacts sensitive keys inside arrays', () => {
    const result = sanitizeContext({ items: [{ token: 't1' }, { token: 't2' }] })
    expect(result).toEqual({ items: [{ token: '[REDACTED]' }, { token: '[REDACTED]' }] })
  })

  it('passes non-sensitive context through unchanged', () => {
    const context = { orderId: 'o1', status: 'PAID', from: 'PENDING', to: 'PAID', count: 3 }
    expect(sanitizeContext(context)).toEqual(context)
  })

  it('serializes an Error into { name, message, stack } instead of {}', () => {
    const error = new Error('boom')
    const result = sanitizeContext({ error }) as { error: Record<string, unknown> }
    expect(result.error.name).toBe('Error')
    expect(result.error.message).toBe('boom')
    expect(typeof result.error.stack).toBe('string')
  })

  it('does not blow up on circular references', () => {
    const circular: Record<string, unknown> = { id: 'x' }
    circular.self = circular
    const result = sanitizeContext(circular) as Record<string, unknown>
    expect(result.id).toBe('x')
    expect(result.self).toBe('[Circular]')
  })
})

describe('formatLogLine — JSON shape (acceptance criteria 1 & 2)', () => {
  it('emits a valid JSON line with timestamp, level and message', () => {
    const line = formatLogLine('info', 'hello')
    const parsed = JSON.parse(line)
    expect(parsed.level).toBe('info')
    expect(parsed.message).toBe('hello')
    expect(typeof parsed.timestamp).toBe('string')
    // ISO 8601 timestamp round-trips through Date
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp)
  })

  it('merges a context object under the `context` key', () => {
    const line = formatLogLine('info', 'request', { method: 'GET', path: '/api/products', status: 200, durationMs: 12 })
    const parsed = JSON.parse(line)
    expect(parsed.context).toEqual({ method: 'GET', path: '/api/products', status: 200, durationMs: 12 })
  })

  it('omits the context key entirely when no context is given', () => {
    const parsed = JSON.parse(formatLogLine('warn', 'no ctx'))
    expect('context' in parsed).toBe(false)
  })

  it('redacts sensitive context before serializing', () => {
    const parsed = JSON.parse(formatLogLine('error', 'oops', { authorization: 'Bearer leak', orderId: 'o1' }))
    expect(parsed.context.authorization).toBe('[REDACTED]')
    expect(parsed.context.orderId).toBe('o1')
  })

  it('captures a full stack trace for a logged error', () => {
    const parsed = JSON.parse(formatLogLine('error', 'unhandled', { error: new Error('kaboom') }))
    expect(parsed.context.error.message).toBe('kaboom')
    expect(parsed.context.error.stack).toContain('kaboom')
  })
})
