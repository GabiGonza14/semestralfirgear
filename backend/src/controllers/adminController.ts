import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { getDashboardMetrics } from '../services/adminService'

export const getDashboardMetricsController = async (c: Context<AppEnv>) => {
  const metrics = await getDashboardMetrics()
  return c.json(metrics, 200)
}
