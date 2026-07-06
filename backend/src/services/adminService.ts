import { listOrders } from './orderService'
import { listProducts } from './productService'
import { listUsers } from './userService'

// Only orders in these states count toward revenue (PENDING and CANCELLED are
// excluded). Mirrors REVENUE_STATUSES in src/pages/AdminDashboardPage.tsx and
// the MCP get_sales_metrics tool, so all three surfaces report the same number.
const REVENUE_STATUSES = new Set(['PAID', 'SHIPPED', 'DELIVERED'])

export interface DashboardMetrics {
  totalRevenue: number
  ordersCount: number
  activeProductsCount: number
  usersCount: number
}

/**
 * Server-computed admin dashboard summary. Reuses the existing list services
 * (no duplicated aggregation) so the numbers stay consistent with the rest of
 * the app. Authorization is enforced upstream by the /api/admin router.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
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
