import { describe, it, expect } from 'bun:test'
import { createOrderSchema, userIdParamSchema } from '../../validations/orderValidation'

const VALID_ID = '507f1f77bcf86cd799439011'
const VALID_PRODUCT_ID = '507f1f77bcf86cd799439022'

describe('createOrderSchema', () => {
  it('accepts a valid order', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [{ productId: VALID_PRODUCT_ID, quantity: 2 }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple items', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [
        { productId: VALID_PRODUCT_ID, quantity: 1 },
        { productId: '507f1f77bcf86cd799439033', quantity: 3 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid userId format', () => {
    const result = createOrderSchema.safeParse({
      userId: 'not-an-id',
      items: [{ productId: VALID_PRODUCT_ID, quantity: 1 }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('userId')
    }
  })

  it('rejects XSS in userId (not valid ObjectId)', () => {
    const result = createOrderSchema.safeParse({
      userId: '<script>alert(1)</script>',
      items: [{ productId: VALID_PRODUCT_ID, quantity: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects SQL injection in userId', () => {
    const result = createOrderSchema.safeParse({
      userId: "1 OR '1'='1",
      items: [{ productId: VALID_PRODUCT_ID, quantity: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty items array', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('items')
    }
  })

  it('rejects quantity of zero', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [{ productId: VALID_PRODUCT_ID, quantity: 0 }],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const quantityIssue = result.error.issues.find((i) => i.path.includes('quantity'))
      expect(quantityIssue).toBeDefined()
    }
  })

  it('rejects negative quantity', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [{ productId: VALID_PRODUCT_ID, quantity: -1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer quantity', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [{ productId: VALID_PRODUCT_ID, quantity: 1.5 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid productId in items', () => {
    const result = createOrderSchema.safeParse({
      userId: VALID_ID,
      items: [{ productId: 'bad-id', quantity: 1 }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing items field', () => {
    const result = createOrderSchema.safeParse({ userId: VALID_ID })
    expect(result.success).toBe(false)
  })
})

describe('userIdParamSchema', () => {
  it('accepts valid userId param', () => {
    const result = userIdParamSchema.safeParse({ userId: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects invalid userId param', () => {
    const result = userIdParamSchema.safeParse({ userId: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('userId')
    }
  })

  it('rejects XSS in userId param', () => {
    const result = userIdParamSchema.safeParse({ userId: '<img onerror=alert(1) src=x>' })
    expect(result.success).toBe(false)
  })
})
