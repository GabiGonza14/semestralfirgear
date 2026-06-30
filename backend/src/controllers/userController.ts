import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { getUserByEmail, getUserById, listUsers, syncClerkUser } from '../services/userService'

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

export const syncClerkUserController = async (c: Context<AppEnv>) => {
  const payload = c.get('validatedBody') as {
    clerkUserId: string
    fullName: string
    email: string
  }
  const result = await syncClerkUser(payload)
  return c.json(result.user, result.created ? 201 : 200)
}
