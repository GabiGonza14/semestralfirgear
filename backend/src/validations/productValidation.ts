import { z } from 'zod'
import { objectIdSchema } from './commonValidation'

const booleanFromFormSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }

  return value
}, z.boolean())

const baseProductSchema = {
  name: z.string().trim().min(1, 'name is required'),
  description: z.string().trim().min(1, 'description is required'),
  price: z.coerce.number().gt(0, 'price must be greater than 0'),
  stock: z.coerce.number().min(0, 'stock must be greater than or equal to 0'),
  imageUrl: z.string().trim().min(1, 'imageUrl is required'),
  categoryId: objectIdSchema,
  isActive: booleanFromFormSchema.optional().default(true),
}

export const createProductSchema = z.object(baseProductSchema)

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1, 'name cannot be empty').optional(),
    description: z.string().trim().min(1, 'description cannot be empty').optional(),
    price: z.coerce.number().gt(0, 'price must be greater than 0').optional(),
    stock: z.coerce.number().min(0, 'stock must be greater than or equal to 0').optional(),
    imageUrl: z.string().trim().min(1, 'imageUrl cannot be empty').optional(),
    categoryId: objectIdSchema.optional(),
    isActive: booleanFromFormSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const productQuerySchema = z.object({
  categoryId: objectIdSchema.optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['createdAt', 'name', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
