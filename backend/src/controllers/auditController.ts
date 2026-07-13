import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { listAuditLog } from '../services/auditLogService'
import type { AuditLogQuery } from '../validations/auditValidation'

// HU-52: GET /api/admin/audit. Authorization (valid Clerk JWT + ADMIN role) is
// enforced upstream by the /api/admin router. Returns the audit trail newest
// first, filtered by the validated query. Same read the get_audit_log MCP tool
// uses, so REST and MCP never drift.
export const getAuditLogController = async (c: Context<AppEnv>) => {
  const query = c.get('validatedQuery') as AuditLogQuery

  // A date-only `dateTo` (from an <input type="date">) parses to that day's
  // midnight; extend it to the end of the day so the range is inclusive.
  const dateTo = query.dateTo
    ? new Date(new Date(query.dateTo).setHours(23, 59, 59, 999))
    : undefined

  const events = await listAuditLog({
    action: query.action,
    actor: query.actor,
    entityType: query.entityType,
    dateFrom: query.dateFrom,
    dateTo,
    limit: query.limit,
  })

  return c.json(events, 200)
}
