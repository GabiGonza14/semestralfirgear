import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { recordAuditAction } from '../../../backend/src/services/auditLogService'
import { updateProduct } from '../../../backend/src/services/productService'
import { HttpError } from '../../../backend/src/utils/httpError'

// This tool intentionally exposes ONLY stock management — never create/delete or
// editing name/price/images/category/discount. A full CRUD write surface is too
// large and risky for an agent-facing tool.
const sizeEntrySchema = z.object({
  label: z.string().trim().min(1, 'size label is required'),
  stock: z.number().int().min(0, 'size stock must be >= 0'),
})

export const updateStockInputSchema = z
  .object({
    productId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, 'productId must be a valid ObjectId'),
    token: z.string().min(1, 'token is required'),
    // Exactly one of these must be provided.
    stock: z.number().min(0, 'stock must be >= 0').optional(),
    sizes: z.array(sizeEntrySchema).min(1, 'sizes must have at least one entry').optional(),
  })
  .refine((data) => (data.stock !== undefined) !== (data.sizes !== undefined), {
    message: 'Provide exactly one of `stock` (flat) or `sizes` (per-size breakdown)',
  })

export type UpdateStockInput = z.infer<typeof updateStockInputSchema>

export interface UpdateStockSuccess {
  found: true
  id: string
  name: string
  stock: number
  sizes: Array<{ label: string; stock: number }>
}

export interface UpdateStockNotFound {
  found: false
  productId: string
  message: string
}

export type UpdateStockResult = UpdateStockSuccess | UpdateStockNotFound

export async function updateStockTool(raw: unknown): Promise<UpdateStockResult> {
  const input = updateStockInputSchema.parse(raw)

  // Protected admin-only tool.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId

  // Clerk's `sub` is not the Mongo _id — resolve the profile to check the role.
  const user = clerkUserId
    ? await UserModel.findOne({ clerkUserId }).select('role')
    : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  // Forward ONLY the stock field the caller chose — never any other product
  // field, even if extra keys were passed. updateProduct owns the
  // sizes-vs-flat-stock branching and its validation.
  const payload = input.stock !== undefined ? { stock: input.stock } : { sizes: input.sizes }

  try {
    const product = await updateProduct(input.productId, payload)
    // HU-52: record the admin action in the audit trail (same trail the REST
    // admin actions write to), so MCP-driven stock changes are traceable too.
    await recordAuditAction({
      actorClerkId: clerkUserId,
      action: 'PRODUCT_STOCK_UPDATED',
      entityType: 'PRODUCT',
      entityId: input.productId,
      changes: { stock: product.stock, sizes: product.sizes, via: 'mcp:update_stock' },
    })
    return {
      found: true,
      id: String(product._id),
      name: product.name,
      stock: product.stock,
      sizes: (product.sizes ?? []).map((s) => ({ label: s.label, stock: s.stock })),
    }
  } catch (err) {
    // Translate the service's thrown errors into readable tool responses.
    if (err instanceof HttpError && err.statusCode === 404) {
      return {
        found: false,
        productId: input.productId,
        message: 'No product exists with the given productId',
      }
    }
    if (err instanceof HttpError && err.statusCode === 400) {
      const detail = Array.isArray(err.errors) && err.errors.length
        ? (err.errors as Array<{ message: string }>).map((e) => e.message).join('; ')
        : err.message
      throw new HttpError(400, detail)
    }
    throw err
  }
}
