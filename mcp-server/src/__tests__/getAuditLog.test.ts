import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock the audit-log service before importing the tool.
const mockListAuditLog = mock(async () => [] as unknown[])

mock.module('../../../backend/src/services/auditLogService', () => ({
  listAuditLog: mockListAuditLog,
  recordAuditAction: mock(async () => undefined),
}))

// Mock the User model — the tool resolves clerkUserId -> role via findOne().select().
const mockSelect = mock(async () => null as unknown)
const mockFindOne = mock(() => ({ select: mockSelect }))

mock.module('../../../backend/src/models/User', () => ({
  UserModel: { findOne: mockFindOne },
}))

// requireAuthStrict is the protected-auth gate — controlled per test.
const mockRequireAuthStrict = mock(async () => ({ userId: 'clerk_admin', authenticated: true }))

mock.module('../../../backend/src/middlewares/requireAuth', () => ({
  requireAuth: mock(async () => ({ userId: null, authenticated: false })),
  requireAuthStrict: mockRequireAuthStrict,
}))

// Import after mocking so the tool picks up the mocked modules.
const { getAuditLogTool } = await import('../tools/getAuditLog')

describe('getAuditLogTool', () => {
  beforeEach(() => {
    mockListAuditLog.mockClear()
    mockFindOne.mockClear()
    mockSelect.mockClear()
    // Default: authenticated user is an ADMIN.
    mockRequireAuthStrict.mockImplementation(async () => ({ userId: 'clerk_admin', authenticated: true }))
    mockSelect.mockImplementation(async () => ({ role: 'ADMIN' }))
  })

  it('happy path — maps records to a compact shape', async () => {
    mockListAuditLog.mockResolvedValueOnce([
      {
        _id: 'a1',
        actorClerkId: 'clerk_admin',
        actorEmail: 'admin@fitgear.com',
        action: 'ORDER_REFUNDED',
        entityType: 'ORDER',
        entityId: 'order123',
        changes: { status: 'REFUNDED' },
        createdAt: '2026-07-11T10:00:00.000Z',
      },
    ])

    const result = await getAuditLogTool({ token: 'valid.jwt' })

    expect(result).toEqual([
      {
        id: 'a1',
        actorClerkId: 'clerk_admin',
        actorEmail: 'admin@fitgear.com',
        action: 'ORDER_REFUNDED',
        entityType: 'ORDER',
        entityId: 'order123',
        changes: { status: 'REFUNDED' },
        createdAt: '2026-07-11T10:00:00.000Z',
      },
    ])
  })

  it('passes filters through, extending dateTo to end-of-day', async () => {
    await getAuditLogTool({
      token: 'valid.jwt',
      action: 'PRODUCT_UPDATED',
      actor: 'admin@fitgear.com',
      entityType: 'PRODUCT',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-11',
      limit: 25,
    })

    expect(mockListAuditLog).toHaveBeenCalledTimes(1)
    const filters = mockListAuditLog.mock.calls[0]![0] as {
      action?: string
      actor?: string
      entityType?: string
      dateFrom?: Date
      dateTo?: Date
      limit?: number
    }
    expect(filters.action).toBe('PRODUCT_UPDATED')
    expect(filters.actor).toBe('admin@fitgear.com')
    expect(filters.entityType).toBe('PRODUCT')
    expect(filters.limit).toBe(25)
    // dateFrom at start of day, dateTo extended to the last millisecond of the day.
    expect(filters.dateFrom?.toISOString()).toBe(new Date('2026-07-01').toISOString())
    expect(filters.dateTo?.getHours()).toBe(23)
    expect(filters.dateTo?.getMinutes()).toBe(59)
  })

  it('rejects an unparseable date with 400', async () => {
    await expect(getAuditLogTool({ token: 'valid.jwt', dateFrom: 'not-a-date' })).rejects.toThrow(
      'Invalid date',
    )
    expect(mockListAuditLog).not.toHaveBeenCalled()
  })

  it('rejects when the resolved user is not an ADMIN', async () => {
    mockSelect.mockImplementationOnce(async () => ({ role: 'CUSTOMER' }))

    await expect(getAuditLogTool({ token: 'valid.jwt' })).rejects.toThrow('admin role required')
    expect(mockListAuditLog).not.toHaveBeenCalled()
  })

  it('rejects when the user has no linked Mongo profile', async () => {
    mockSelect.mockImplementationOnce(async () => null)

    await expect(getAuditLogTool({ token: 'valid.jwt' })).rejects.toThrow('admin role required')
    expect(mockListAuditLog).not.toHaveBeenCalled()
  })

  it('rejects without a valid token', async () => {
    mockRequireAuthStrict.mockImplementationOnce(async () => {
      throw new Error('Unauthorized: valid Clerk JWT required')
    })

    await expect(getAuditLogTool({ token: 'valid.jwt' })).rejects.toThrow('Unauthorized')
    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockListAuditLog).not.toHaveBeenCalled()
  })
})
