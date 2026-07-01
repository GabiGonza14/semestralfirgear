import { describe, it, expect } from 'bun:test'
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from '../../validations/productValidation'

const VALID_ID = '507f1f77bcf86cd799439011'

const validProduct = {
  name: 'Running Shoes',
  description: 'High performance running shoes',
  price: 99.99,
  stock: 50,
  imageUrl: '/uploads/products/shoes.jpg',
  categoryId: VALID_ID,
}

describe('createProductSchema', () => {
  it('accepts a valid product', () => {
    const result = createProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
  })

  it('strips HTML tags from name', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      name: '<script>alert("xss")</script>Running Shoes',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Running Shoes')
    }
  })

  it('strips HTML tags from description', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      description: '<b>Great</b> shoes with <img src=x onerror="alert(1)"> support',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Great shoes with  support')
    }
  })

  it('strips script tags entirely from name', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      name: '<script>document.cookie</script>Shoes',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).not.toContain('<script>')
      expect(result.data.name).toBe('Shoes')
    }
  })

  it('strips event handler injection from description', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      description: '<div onmouseover="steal()">Hover me</div>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Hover me')
    }
  })

  it('rejects missing name with 400-level error detail', () => {
    const result = createProductSchema.safeParse({ ...validProduct, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      name: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects description exceeding 2000 characters', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      description: 'A'.repeat(2001),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('description')
    }
  })

  it('rejects price of zero', () => {
    const result = createProductSchema.safeParse({ ...validProduct, price: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('price')
    }
  })

  it('rejects negative price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, price: -5 })
    expect(result.success).toBe(false)
  })

  it('rejects negative stock', () => {
    const result = createProductSchema.safeParse({ ...validProduct, stock: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer stock', () => {
    const result = createProductSchema.safeParse({ ...validProduct, stock: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid categoryId format', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      categoryId: 'not-an-objectid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('categoryId')
    }
  })

  it('rejects XSS in categoryId (not a valid ObjectId)', () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      categoryId: '<script>alert(1)</script>',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateProductSchema', () => {
  it('accepts partial update with only name', () => {
    const result = updateProductSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('rejects empty object (at least one field required)', () => {
    const result = updateProductSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('strips HTML tags from name in update', () => {
    const result = updateProductSchema.safeParse({
      name: '<em>Updated</em> Shoes',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Updated Shoes')
    }
  })

  it('strips HTML tags from description in update', () => {
    const result = updateProductSchema.safeParse({
      description: '<p onclick="bad()">desc</p>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('desc')
    }
  })

  it('rejects name exceeding 100 characters on update', () => {
    const result = updateProductSchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('productQuerySchema', () => {
  it('accepts valid query params', () => {
    const result = productQuerySchema.safeParse({
      categoryId: VALID_ID,
      search: 'shoes',
      sortBy: 'price',
      sortOrder: 'asc',
    })
    expect(result.success).toBe(true)
  })

  it('strips XSS from search query', () => {
    const result = productQuerySchema.safeParse({
      search: '<script>alert(1)</script>shoes',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.search).toBe('shoes')
    }
  })

  it('rejects search exceeding 200 characters', () => {
    const result = productQuerySchema.safeParse({ search: 'A'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sortBy value', () => {
    const result = productQuerySchema.safeParse({ sortBy: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid sortOrder value', () => {
    const result = productQuerySchema.safeParse({ sortOrder: 'ascending' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid categoryId in query', () => {
    const result = productQuerySchema.safeParse({ categoryId: 'bad-id' })
    expect(result.success).toBe(false)
  })
})
