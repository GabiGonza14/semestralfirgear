import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  description: z.string().trim().optional().default(''),
})

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1, 'name cannot be empty').optional(),
    description: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })
