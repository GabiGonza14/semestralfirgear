import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import {
  getLowStockProducts,
  type LowStockProduct,
} from '../../../backend/src/services/lowStockService'
import { HttpError } from '../../../backend/src/utils/httpError'

// The only accepted input is the admin's own Clerk JWT — no arbitrary params.
export const getLowStockAlertsInputSchema = z.object({
  token: z.string().optional(),
})

export type GetLowStockAlertsInput = z.infer<typeof getLowStockAlertsInputSchema>

export interface LowStockAlertsResult {
  count: number
  products: LowStockProduct[]
}

export async function getLowStockAlertsTool(raw: unknown): Promise<LowStockAlertsResult> {
  const input = getLowStockAlertsInputSchema.parse(raw)

  // Protected admin-only tool: a valid Clerk JWT is mandatory.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId

  // Clerk's `sub` is not the Mongo _id — resolve the profile to check the role.
  const user = clerkUserId
    ? await UserModel.findOne({ clerkUserId }).select('role')
    : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  // The query is owned by the backend lowStockService (single source of truth,
  // shared with the REST endpoint GET /api/admin/low-stock) — the tool only adds
  // the RBAC gate and a convenience count.
  const products = await getLowStockProducts()
  return { count: products.length, products }
}
