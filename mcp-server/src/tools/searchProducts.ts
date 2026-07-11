import { z } from 'zod'
import { requireAuth } from '../../../backend/src/middlewares/requireAuth'
import {
  listProducts,
  suggestProducts,
  type ProductSuggestion,
} from '../../../backend/src/services/productService'

export const searchProductsInputSchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'categoryId must be a valid ObjectId')
    .optional(),
  sortBy: z.enum(['createdAt', 'name', 'price']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  // HU-51: when true, return lightweight type-ahead suggestions (id, name,
  // imageUrl; max 5) instead of the full product summaries — for real-time
  // search assistance in agent conversations.
  autocomplete: z.boolean().optional(),
  token: z.string().optional(),
})

export type SearchProductsInput = z.infer<typeof searchProductsInputSchema>

export interface ProductSummary {
  id: string
  name: string
  price: number
  finalPrice: number
  stock: number
  category: string
  imageUrl: string
}

export async function searchProductsTool(
  raw: unknown,
): Promise<ProductSummary[] | ProductSuggestion[]> {
  const input = searchProductsInputSchema.parse(raw)

  // Auth pipeline runs for all tools — public tools accept unauthenticated calls.
  await requireAuth(input.token)

  // Autocomplete mode (HU-51): lean suggestions, shares the exact backend query
  // the catalog search bar uses, so results stay consistent across both.
  if (input.autocomplete) {
    return suggestProducts(input.search ?? '')
  }

  const products = await listProducts({
    search: input.search,
    categoryId: input.categoryId,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
  })

  return products.slice(0, input.limit).map((p) => {
    const cat = p.categoryId as unknown as { name?: string }
    return {
      id: String(p._id),
      name: p.name,
      price: p.price,
      finalPrice: p.finalPrice ?? p.price,
      stock: p.stock,
      category: cat?.name ?? '',
      imageUrl: p.images?.[0] ?? '',
    }
  })
}
