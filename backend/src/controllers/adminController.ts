import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { getDashboardMetrics } from '../services/adminService'
import { getLowStockProducts } from '../services/lowStockService'

export const getDashboardMetricsController = async (c: Context<AppEnv>) => {
  const metrics = await getDashboardMetrics()
  return c.json(metrics, 200)
}

// HU-46: products currently at or below their low-stock threshold. Same query the
// get_low_stock_alerts MCP tool uses, so REST and MCP never drift.
export const getLowStockProductsController = async (c: Context<AppEnv>) => {
  const products = await getLowStockProducts()
  return c.json(products, 200)
}
