import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { listOrders } from '../../../backend/src/services/orderService'
import { listProducts } from '../../../backend/src/services/productService'
import { listUsers } from '../../../backend/src/services/userService'
import { HttpError } from '../../../backend/src/utils/httpError'

// Mirror of REVENUE_STATUSES in src/pages/AdminDashboardPage.tsx — only orders
// in these states count toward revenue (PENDING and CANCELLED are excluded).
const REVENUE_STATUSES = new Set(['PAID', 'SHIPPED', 'DELIVERED'])

// The only accepted input is the admin's own Clerk JWT — no arbitrary userId.
export const getSalesMetricsInputSchema = z.object({
  token: z.string().optional(),
})

export type GetSalesMetricsInput = z.infer<typeof getSalesMetricsInputSchema>

export interface SalesMetrics {
  totalRevenue: number
  ordersCount: number
  activeProductsCount: number
  usersCount: number
}

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

  // Reuse existing services — no duplicated aggregation logic. The dashboard
  // (AdminDashboardPage.tsx) computes the same four numbers client-side.
  const [orders, products, users] = await Promise.all([
    listOrders(),
    listProducts({ includeInactive: true }),
    listUsers(),
  ])

  const typedOrders = orders as unknown as Array<{ status: string; totalAmount: number }>
  const totalRevenue = typedOrders
    .filter((order) => REVENUE_STATUSES.has(order.status))
    .reduce((acc, order) => acc + order.totalAmount, 0)

  const activeProductsCount = products.filter((product) => product.isActive).length

  return {
    totalRevenue,
    ordersCount: orders.length,
    activeProductsCount,
    usersCount: users.length,
  }
}
