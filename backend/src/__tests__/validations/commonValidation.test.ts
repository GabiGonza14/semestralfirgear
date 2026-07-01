import { describe, it, expect } from 'bun:test'
import { objectIdSchema, idParamSchema } from '../../validations/commonValidation'

const VALID_ID = '507f1f77bcf86cd799439011'

describe('objectIdSchema', () => {
  it('accepts a valid 24-char hex ObjectId', () => {
    expect(objectIdSchema.safeParse(VALID_ID).success).toBe(true)
  })

  it('rejects a string that is too short', () => {
    const result = objectIdSchema.safeParse('507f1f77bcf86cd79943901')
    expect(result.success).toBe(false)
  })

  it('rejects a string that is too long', () => {
    const result = objectIdSchema.safeParse('507f1f77bcf86cd7994390110')
    expect(result.success).toBe(false)
  })

  it('rejects non-hex characters', () => {
    const result = objectIdSchema.safeParse('507f1f77bcf86cd79943901z')
    expect(result.success).toBe(false)
  })

  it('rejects SQL injection attempt', () => {
    const result = objectIdSchema.safeParse("1'; DROP TABLE users; --")
    expect(result.success).toBe(false)
  })

  it('rejects XSS attempt in id field', () => {
    const result = objectIdSchema.safeParse('<script>alert(1)</script>')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    expect(objectIdSchema.safeParse('').success).toBe(false)
  })
})

describe('idParamSchema', () => {
  it('accepts valid id param', () => {
    const result = idParamSchema.safeParse({ id: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects invalid id param with descriptive error', () => {
    const result = idParamSchema.safeParse({ id: 'not-an-id' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('id')
    }
  })
})
