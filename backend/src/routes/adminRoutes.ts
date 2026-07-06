import { Hono } from 'hono'
import type { AppEnv } from '../app'
import { getDashboardMetricsController } from '../controllers/adminController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'

export const adminRouter = new Hono<AppEnv>()

// EVERY /api/admin/* route is gated by the full RBAC chain: a valid Clerk JWT
// (requireAuthMiddleware -> 401) followed by an ADMIN role check
// (requireAdminMiddleware -> 403). A CUSTOMER never reaches any handler here.
adminRouter.use('*', requireAuthMiddleware(), requireAdminMiddleware())

adminRouter.get('/metrics', getDashboardMetricsController)
