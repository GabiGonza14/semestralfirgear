import { z } from 'zod'
import { stripHtml } from '../utils/sanitize'

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(100, 'name cannot exceed 100 characters')
    .transform(stripHtml),
  description: z
    .string()
    .trim()
    .max(500, 'description cannot exceed 500 characters')
    .transform(stripHtml)
    .optional()
    .default(''),
  requiresSizes: z.boolean().optional().default(false),
})

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'name cannot be empty')
      .max(100, 'name cannot exceed 100 characters')
      .transform(stripHtml)
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'description cannot exceed 500 characters')
      .transform(stripHtml)
      .optional(),
    requiresSizes: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
