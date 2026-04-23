import { z } from 'zod'

export const syncClerkUserSchema = z.object({
  clerkUserId: z.string().trim().min(1, 'clerkUserId is required'),
  fullName: z.string().trim().min(1, 'fullName is required'),
  email: z.string().trim().email('email must be valid'),
})

export const emailParamSchema = z.object({
  email: z.string().trim().email('email must be valid'),
})
