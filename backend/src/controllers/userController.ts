import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  getUserByEmail,
  getUserById,
  listUsers,
  syncClerkUser,
} from '../services/userService'

export const getUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await listUsers()
  res.status(200).json(users)
})

export const getUser = asyncHandler(async (_req: Request, res: Response) => {
  const { id } = res.locals.validatedParams as { id: string }
  const user = await getUserById(id)
  res.status(200).json(user)
})

export const getUserByEmailController = asyncHandler(async (_req: Request, res: Response) => {
  const { email } = res.locals.validatedParams as { email: string }
  const user = await getUserByEmail(email)
  res.status(200).json(user)
})

export const syncClerkUserController = asyncHandler(async (_req: Request, res: Response) => {
  const payload = res.locals.validatedBody as {
    clerkUserId: string
    fullName: string
    email: string
  }
  const result = await syncClerkUser(payload)
  res.status(result.created ? 201 : 200).json(result.user)
})
