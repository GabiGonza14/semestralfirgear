import { describe, it, expect, mock, beforeEach } from 'bun:test'

// --- Mocks registered before importing userService -------------------------

const mockSave = mock(async () => {})
const fakeUser: Record<string, unknown> = {}
const mockFindById = mock(async () => fakeUser as unknown)
mock.module('../../models/User', () => ({ UserModel: { findById: mockFindById } }))

// Audit trail writes (HU-44 UserAuditEvent).
const mockAuditCreate = mock(async () => ({}))
mock.module('../../models/UserAuditEvent', () => ({
  UserAuditEventModel: { create: mockAuditCreate },
}))

// Clerk propagation (publicMetadata role + ban/unban). Kept as spies so we can
// assert the sync happens without hitting the network.
const mockSyncRole = mock(async () => {})
const mockSyncActive = mock(async () => {})
mock.module('../../services/clerkUserSync', () => ({
  syncUserRoleToClerk: mockSyncRole,
  syncUserActiveToClerk: mockSyncActive,
}))

const { updateUserRole, setUserActive } = await import('../../services/userAdminService')

const ADMIN_CLERK_ID = 'clerk_admin'
const TARGET_CLERK_ID = 'clerk_target'

describe('updateUserRole (HU-44)', () => {
  beforeEach(() => {
    mockSave.mockClear()
    mockFindById.mockClear()
    mockAuditCreate.mockClear()
    mockSyncRole.mockClear()
    mockSyncActive.mockClear()

    Object.keys(fakeUser).forEach((key) => delete fakeUser[key])
    Object.assign(fakeUser, {
      id: 'user_target_id',
      clerkUserId: TARGET_CLERK_ID,
      role: 'CUSTOMER',
      isActive: true,
      save: mockSave,
    })
    mockFindById.mockImplementation(async () => fakeUser)
  })

  it('promotes a user, syncs Clerk, and records the change in the audit log', async () => {
    await updateUserRole(ADMIN_CLERK_ID, 'user_target_id', 'ADMIN')

    expect(fakeUser.role).toBe('ADMIN')
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSyncRole).toHaveBeenCalledWith(TARGET_CLERK_ID, 'ADMIN')

    expect(mockAuditCreate).toHaveBeenCalledTimes(1)
    const [event] = mockAuditCreate.mock.calls[0] as unknown as [
      { type: string; actorClerkId?: string; metadata?: Record<string, unknown> },
    ]
    expect(event).toMatchObject({ type: 'ROLE_CHANGED', actorClerkId: ADMIN_CLERK_ID })
    expect(event.metadata).toMatchObject({ from: 'CUSTOMER', to: 'ADMIN' })
  })

  it('blocks an admin from changing their OWN role', async () => {
    fakeUser.clerkUserId = ADMIN_CLERK_ID

    await expect(updateUserRole(ADMIN_CLERK_ID, 'user_target_id', 'CUSTOMER')).rejects.toThrow(
      'No puedes cambiar tu propio rol',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSyncRole).not.toHaveBeenCalled()
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('is a no-op (no save/sync/audit) when the role is unchanged', async () => {
    await updateUserRole(ADMIN_CLERK_ID, 'user_target_id', 'CUSTOMER')

    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSyncRole).not.toHaveBeenCalled()
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('blocks an admin from changing ANOTHER admin\'s role (no admin-on-admin management)', async () => {
    fakeUser.role = 'ADMIN'

    await expect(updateUserRole(ADMIN_CLERK_ID, 'user_target_id', 'CUSTOMER')).rejects.toThrow(
      'No puedes cambiar el rol de otro administrador',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSyncRole).not.toHaveBeenCalled()
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('throws 404 when the target user does not exist', async () => {
    mockFindById.mockImplementationOnce(async () => null)

    await expect(updateUserRole(ADMIN_CLERK_ID, 'missing_id', 'ADMIN')).rejects.toThrow(
      'User not found',
    )
    expect(mockSyncRole).not.toHaveBeenCalled()
  })

  it('does not persist the DB change if Clerk propagation fails', async () => {
    mockSyncRole.mockImplementationOnce(async () => {
      throw new Error('Clerk down')
    })

    await expect(updateUserRole(ADMIN_CLERK_ID, 'user_target_id', 'ADMIN')).rejects.toThrow(
      'Clerk down',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })
})

describe('setUserActive (HU-44)', () => {
  beforeEach(() => {
    mockSave.mockClear()
    mockFindById.mockClear()
    mockAuditCreate.mockClear()
    mockSyncRole.mockClear()
    mockSyncActive.mockClear()

    Object.keys(fakeUser).forEach((key) => delete fakeUser[key])
    Object.assign(fakeUser, {
      id: 'user_target_id',
      clerkUserId: TARGET_CLERK_ID,
      role: 'CUSTOMER',
      isActive: true,
      save: mockSave,
    })
    mockFindById.mockImplementation(async () => fakeUser)
  })

  it('deactivates an account, bans it in Clerk, and records the change', async () => {
    await setUserActive(ADMIN_CLERK_ID, 'user_target_id', false)

    expect(fakeUser.isActive).toBe(false)
    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSyncActive).toHaveBeenCalledWith(TARGET_CLERK_ID, false)

    expect(mockAuditCreate).toHaveBeenCalledTimes(1)
    const [event] = mockAuditCreate.mock.calls[0] as unknown as [
      { type: string; actorClerkId?: string; metadata?: Record<string, unknown> },
    ]
    expect(event).toMatchObject({ type: 'STATUS_CHANGED', actorClerkId: ADMIN_CLERK_ID })
    expect(event.metadata).toMatchObject({ isActive: false })
  })

  it('reactivates an account (unban) when moving inactive -> active', async () => {
    fakeUser.isActive = false

    await setUserActive(ADMIN_CLERK_ID, 'user_target_id', true)

    expect(fakeUser.isActive).toBe(true)
    expect(mockSyncActive).toHaveBeenCalledWith(TARGET_CLERK_ID, true)
    expect(mockAuditCreate).toHaveBeenCalledTimes(1)
  })

  it('blocks an admin from deactivating their OWN account', async () => {
    fakeUser.clerkUserId = ADMIN_CLERK_ID

    await expect(setUserActive(ADMIN_CLERK_ID, 'user_target_id', false)).rejects.toThrow(
      'No puedes desactivar tu propia cuenta',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSyncActive).not.toHaveBeenCalled()
  })

  it('is a no-op when the account is already in the requested state', async () => {
    await setUserActive(ADMIN_CLERK_ID, 'user_target_id', true)

    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSyncActive).not.toHaveBeenCalled()
    expect(mockAuditCreate).not.toHaveBeenCalled()
  })

  it('blocks an admin from deactivating ANOTHER admin (no admin-on-admin management)', async () => {
    fakeUser.role = 'ADMIN'

    await expect(setUserActive(ADMIN_CLERK_ID, 'user_target_id', false)).rejects.toThrow(
      'No puedes desactivar a otro administrador',
    )
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockSyncActive).not.toHaveBeenCalled()
  })

  it('still allows reactivating another admin (recovery, not privilege escalation)', async () => {
    fakeUser.role = 'ADMIN'
    fakeUser.isActive = false

    await setUserActive(ADMIN_CLERK_ID, 'user_target_id', true)

    expect(fakeUser.isActive).toBe(true)
    expect(mockSyncActive).toHaveBeenCalledWith(TARGET_CLERK_ID, true)
    expect(mockAuditCreate).toHaveBeenCalledTimes(1)
  })

  it('throws 404 when the target user does not exist', async () => {
    mockFindById.mockImplementationOnce(async () => null)

    await expect(setUserActive(ADMIN_CLERK_ID, 'missing_id', false)).rejects.toThrow(
      'User not found',
    )
    expect(mockSyncActive).not.toHaveBeenCalled()
  })
})
