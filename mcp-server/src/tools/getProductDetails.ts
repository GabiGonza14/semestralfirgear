import { z } from 'zod'
import { requireAuth } from '../../../backend/src/middlewares/requireAuth'
import { getProductById } from '../../../backend/src/services/productService'
import { HttpError } from '../../../backend/src/utils/httpError'

export const getProductDetailsInputSchema = z.object({
  productId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'productId must be a valid ObjectId'),
  token: z.string().optional(),
})

export type GetProductDetailsInput = z.infer<typeof getProductDetailsInputSchema>

export interface ProductDetail {
  found: true
  id: string
  name: string
  description: string
  price: number
  finalPrice: number
  discount: { percentage: number; amount: number } | null
  stock: number
  isActive: boolean
  category: string
  images: string[]
}

export interface ProductNotFound {
  found: false
  productId: string
  message: string
}

export type GetProductDetailsResult = ProductDetail | ProductNotFound

export async function getProductDetailsTool(raw: unknown): Promise<GetProductDetailsResult> {
  const input = getProductDetailsInputSchema.parse(raw)

  // Auth pipeline runs for all tools — public tools accept unauthenticated calls.
  await requireAuth(input.token)

  try {
    const p = await getProductById(input.productId)
    const cat = p.categoryId as unknown as { name?: string }

    return {
      found: true,
      id: String(p._id),
      name: p.name,
      description: p.description,
      price: p.price,
      finalPrice: p.finalPrice ?? p.price,
      discount: p.hasDiscount
        ? { percentage: p.discountPercentage, amount: p.discountAmount }
        : null,
      stock: p.stock,
      isActive: p.isActive,
      category: cat?.name ?? '',
      images: p.images ?? [],
    }
  } catch (err) {
    // Turn the service's 404 into a clean, agent-friendly result instead of a stack.
    if (err instanceof HttpError && err.statusCode === 404) {
      return {
        found: false,
        productId: input.productId,
        message: 'No product exists with the given productId',
      }
    }
    throw err
  }
}
