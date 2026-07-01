import { z } from 'zod'
import { stripHtml } from '../utils/sanitize'

export const syncClerkUserSchema = z.object({
  clerkUserId: z
    .string()
    .trim()
    .min(1, 'clerkUserId is required')
    .max(255, 'clerkUserId is too long'),
  fullName: z
    .string()
    .trim()
    .min(1, 'fullName is required')
    .max(100, 'fullName cannot exceed 100 characters')
    .transform(stripHtml),
  email: z.string().trim().email('email must be valid').max(254, 'email is too long'),
})

export const emailParamSchema = z.object({
  email: z.string().trim().email('email must be valid').max(254, 'email is too long'),
})
