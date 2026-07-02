import { z } from 'zod'
import { objectIdSchema } from './commonValidation'
import { stripHtml } from '../utils/sanitize'

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

export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'name is required')
    .max(100, 'name cannot exceed 100 characters')
    .transform(stripHtml),
  description: z
    .string()
    .trim()
    .min(1, 'description is required')
    .max(2000, 'description cannot exceed 2000 characters')
    .transform(stripHtml),
  price: z.coerce.number().gt(0, 'price must be greater than 0'),
  stock: z.coerce
    .number()
    .int('stock must be an integer')
    .min(0, 'stock must be greater than or equal to 0'),
  imageUrl: z.string().trim().min(1, 'imageUrl is required').max(500, 'imageUrl is too long'),
  categoryId: objectIdSchema,
  isActive: booleanFromFormSchema.optional().default(true),
  hasDiscount: booleanFromFormSchema.optional().default(false),
  discountPercentage: z.coerce
    .number()
    .min(0, 'discountPercentage must be greater than or equal to 0')
    .max(100, 'discountPercentage must be less than or equal to 100')
    .optional()
    .default(0),
})

export const updateProductSchema = z
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
      .min(1, 'description cannot be empty')
      .max(2000, 'description cannot exceed 2000 characters')
      .transform(stripHtml)
      .optional(),
    price: z.coerce.number().gt(0, 'price must be greater than 0').optional(),
    stock: z.coerce
      .number()
      .int('stock must be an integer')
      .min(0, 'stock must be greater than or equal to 0')
      .optional(),
    imageUrl: z
      .string()
      .trim()
      .min(1, 'imageUrl cannot be empty')
      .max(500, 'imageUrl is too long')
      .optional(),
    categoryId: objectIdSchema.optional(),
    isActive: booleanFromFormSchema.optional(),
    hasDiscount: booleanFromFormSchema.optional(),
    discountPercentage: z.coerce
      .number()
      .min(0, 'discountPercentage must be greater than or equal to 0')
      .max(100, 'discountPercentage must be less than or equal to 100')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  })

export const productQuerySchema = z.object({
  categoryId: objectIdSchema.optional(),
  search: z
    .string()
    .trim()
    .max(200, 'search cannot exceed 200 characters')
    .transform(stripHtml)
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
