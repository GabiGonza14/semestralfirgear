import { describe, it, expect } from 'bun:test'
import {
  syncClerkUserSchema,
  emailParamSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../../validations/userValidation'

describe('syncClerkUserSchema', () => {
  it('accepts valid user data', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: 'John Doe',
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('strips HTML tags from fullName', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: '<script>alert("xss")</script>John Doe',
      email: 'john@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('John Doe')
      expect(result.data.fullName).not.toContain('<script>')
    }
  })

  it('strips HTML event handler injection from fullName', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: '<img src=x onerror="alert(1)">Alice',
      email: 'alice@example.com',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fullName).toBe('Alice')
    }
  })

  it('rejects empty clerkUserId', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: '',
      fullName: 'John Doe',
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('clerkUserId')
    }
  })

  it('rejects clerkUserId exceeding 255 characters', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'u'.repeat(256),
      fullName: 'John',
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty fullName', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: '',
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('fullName')
    }
  })

  it('rejects fullName exceeding 100 characters', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: 'A'.repeat(101),
      email: 'john@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email format', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: 'John Doe',
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('rejects XSS attempt as email', () => {
    const result = syncClerkUserSchema.safeParse({
      clerkUserId: 'user_2abc123',
      fullName: 'John',
      email: '<script>alert(1)</script>@evil.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = syncClerkUserSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})

describe('emailParamSchema', () => {
  it('accepts a valid email', () => {
    const result = emailParamSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = emailParamSchema.safeParse({ email: 'bad-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('email')
    }
  })

  it('rejects XSS attempt in email param', () => {
    const result = emailParamSchema.safeParse({ email: '"><script>alert(1)</script>' })
    expect(result.success).toBe(false)
  })
})

describe('updateUserRoleSchema', () => {
  it('accepts ADMIN and CUSTOMER', () => {
    expect(updateUserRoleSchema.safeParse({ role: 'ADMIN' }).success).toBe(true)
    expect(updateUserRoleSchema.safeParse({ role: 'CUSTOMER' }).success).toBe(true)
  })

  it('rejects an unknown role', () => {
    const result = updateUserRoleSchema.safeParse({ role: 'SUPERADMIN' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('role')
    }
  })

  it('rejects a missing role', () => {
    expect(updateUserRoleSchema.safeParse({}).success).toBe(false)
  })
})

describe('updateUserStatusSchema', () => {
  it('accepts a boolean isActive', () => {
    expect(updateUserStatusSchema.safeParse({ isActive: true }).success).toBe(true)
    expect(updateUserStatusSchema.safeParse({ isActive: false }).success).toBe(true)
  })

  it('rejects a non-boolean isActive', () => {
    const result = updateUserStatusSchema.safeParse({ isActive: 'yes' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('isActive')
    }
  })

  it('rejects a missing isActive', () => {
    expect(updateUserStatusSchema.safeParse({}).success).toBe(false)
  })
})
