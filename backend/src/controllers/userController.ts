import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { recordAuditAction } from '../services/auditLogService'
import { getUserByEmail, getUserById, listUsers, syncClerkUser } from '../services/userService'
import { setUserActive, updateUserRole } from '../services/userAdminService'
import { HttpError } from '../utils/httpError'

export const getUsers = async (c: Context<AppEnv>) => {
  const users = await listUsers()
  return c.json(users, 200)
}

export const getUser = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const user = await getUserById(id)
  return c.json(user, 200)
}

export const getUserByEmailController = async (c: Context<AppEnv>) => {
  const { email } = c.get('validatedParams') as { email: string }
  const user = await getUserByEmail(email)
  return c.json(user, 200)
}

export const updateUserRoleController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const { role } = c.get('validatedBody') as { role: 'ADMIN' | 'CUSTOMER' }
  const actorClerkId = c.get('userId')
  if (!actorClerkId) {
    throw new HttpError(401, 'No se proporcionó token de autenticación')
  }
  const user = await updateUserRole(actorClerkId, id, role)
  await recordAuditAction({
    actorClerkId,
    action: 'USER_ROLE_CHANGED',
    entityType: 'USER',
    entityId: id,
    changes: { role },
  })
  return c.json(user, 200)
}

export const updateUserStatusController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const { isActive } = c.get('validatedBody') as { isActive: boolean }
  const actorClerkId = c.get('userId')
  if (!actorClerkId) {
    throw new HttpError(401, 'No se proporcionó token de autenticación')
  }
  const user = await setUserActive(actorClerkId, id, isActive)
  await recordAuditAction({
    actorClerkId,
    action: 'USER_STATUS_CHANGED',
    entityType: 'USER',
    entityId: id,
    changes: { isActive },
  })
  return c.json(user, 200)
}

export const syncClerkUserController = async (c: Context<AppEnv>) => {
  const payload = c.get('validatedBody') as {
    clerkUserId: string
    fullName: string
    email: string
  }
  const result = await syncClerkUser(payload)
  return c.json(result.user, result.created ? 201 : 200)
}
