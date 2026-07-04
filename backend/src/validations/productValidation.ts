import { z } from 'zod'
import { objectIdSchema } from './commonValidation'
import { stripHtml } from '../utils/sanitize'
import { SIZE_OPTIONS } from '../utils/sizes'

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

const sizeEntrySchema = z.object({
  label: z.enum(SIZE_OPTIONS),
  stock: z.coerce.number().int('stock must be an integer').min(0, 'stock must be greater than or equal to 0'),
})

// The upload middleware sends form fields as strings — sizes arrives as a
// JSON-encoded array under one form field, so it needs parsing before zod
// can validate its shape.
const sizesFromFormSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
  return value
}, z.array(sizeEntrySchema))
  .refine((sizes) => new Set(sizes.map((size) => size.label)).size === sizes.length, {
    message: 'Duplicate size labels are not allowed',
  })

const imagesFromFormSchema = z
  .array(z.string().trim().min(1, 'image path cannot be empty'))
  .min(1, 'at least one image is required')
  .max(4, 'a product can have at most 4 images')

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
  images: imagesFromFormSchema,
  sizes: sizesFromFormSchema.optional().default([]),
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
    images: imagesFromFormSchema.optional(),
    sizes: sizesFromFormSchema.optional(),
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
  // Public catalog only sees active products; admin opts into the full list.
  includeInactive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})
