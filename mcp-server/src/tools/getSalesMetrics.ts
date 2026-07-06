import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { getDashboardMetrics, type DashboardMetrics } from '../../../backend/src/services/adminService'
import { HttpError } from '../../../backend/src/utils/httpError'

// The only accepted input is the admin's own Clerk JWT — no arbitrary userId.
export const getSalesMetricsInputSchema = z.object({
  token: z.string().optional(),
})

export type GetSalesMetricsInput = z.infer<typeof getSalesMetricsInputSchema>

// Same four numbers the REST endpoint (GET /api/admin/metrics) returns.
export type SalesMetrics = DashboardMetrics

export async function getSalesMetricsTool(raw: unknown): Promise<SalesMetrics> {
  const input = getSalesMetricsInputSchema.parse(raw)

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

  // The aggregation is owned by the backend adminService (single source of
  // truth, shared with the REST endpoint) — the tool only adds the RBAC gate.
  return getDashboardMetrics()
}
