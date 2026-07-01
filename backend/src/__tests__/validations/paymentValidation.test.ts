import { describe, it, expect } from 'bun:test'
import {
  createCheckoutSessionSchema,
  confirmCheckoutPaymentSchema,
} from '../../validations/paymentValidation'

const VALID_ID = '507f1f77bcf86cd799439011'

describe('createCheckoutSessionSchema', () => {
  it('accepts a valid orderId', () => {
    const result = createCheckoutSessionSchema.safeParse({ orderId: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects invalid orderId format', () => {
    const result = createCheckoutSessionSchema.safeParse({ orderId: 'bad-id' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('orderId')
    }
  })

  it('rejects XSS attempt in orderId', () => {
    const result = createCheckoutSessionSchema.safeParse({
      orderId: '<script>alert(1)</script>',
    })
    expect(result.success).toBe(false)
  })

  it('rejects SQL injection in orderId', () => {
    const result = createCheckoutSessionSchema.safeParse({
      orderId: "'; DROP TABLE orders; --",
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing orderId', () => {
    const result = createCheckoutSessionSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('confirmCheckoutPaymentSchema', () => {
  it('accepts valid orderId with sessionId', () => {
    const result = confirmCheckoutPaymentSchema.safeParse({
      orderId: VALID_ID,
      sessionId: 'cs_test_abc123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid orderId without sessionId', () => {
    const result = confirmCheckoutPaymentSchema.safeParse({ orderId: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects invalid orderId', () => {
    const result = confirmCheckoutPaymentSchema.safeParse({
      orderId: 'not-valid',
      sessionId: 'cs_test_abc',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('orderId')
    }
  })

  it('rejects empty sessionId string', () => {
    const result = confirmCheckoutPaymentSchema.safeParse({
      orderId: VALID_ID,
      sessionId: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('sessionId')
    }
  })

  it('rejects sessionId exceeding 500 characters', () => {
    const result = confirmCheckoutPaymentSchema.safeParse({
      orderId: VALID_ID,
      sessionId: 's'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects XSS in orderId', () => {
    const result = confirmCheckoutPaymentSchema.safeParse({
      orderId: '<script>alert(1)</script>',
    })
    expect(result.success).toBe(false)
  })
})
