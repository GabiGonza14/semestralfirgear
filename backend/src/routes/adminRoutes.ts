import { Hono } from 'hono'
import type { AppEnv } from '../app'
import {
  getDashboardMetricsController,
  getLowStockProductsController,
} from '../controllers/adminController'
import { getAuditLogController } from '../controllers/auditController'
import { requireAdminMiddleware } from '../middlewares/requireAdmin'
import { requireAuthMiddleware } from '../middlewares/requireAuth'
import { validateQuery } from '../middlewares/validate'
import { auditLogQuerySchema } from '../validations/auditValidation'

export const adminRouter = new Hono<AppEnv>()

// EVERY /api/admin/* route is gated by the full RBAC chain: a valid Clerk JWT
// (requireAuthMiddleware -> 401) followed by an ADMIN role check
// (requireAdminMiddleware -> 403). A CUSTOMER never reaches any handler here.
adminRouter.use('*', requireAuthMiddleware(), requireAdminMiddleware())

adminRouter.get('/metrics', getDashboardMetricsController)
adminRouter.get('/low-stock', getLowStockProductsController)

// HU-52: read-only admin-action audit trail, filterable by action, actor and
// date range. No create/update/delete route is exposed — the records are
// written only by recordAuditAction and are immutable.
adminRouter.get('/audit', validateQuery(auditLogQuerySchema), getAuditLogController)
