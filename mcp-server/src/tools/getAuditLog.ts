import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { listAuditLog } from '../../../backend/src/services/auditLogService'
import { HttpError } from '../../../backend/src/utils/httpError'

// HU-52: read-only view over the admin-action audit trail, for compliance
// reporting and detecting suspicious activity. Admin-only — the same query the
// REST endpoint (GET /api/admin/audit) uses, so MCP and the panel never drift.
export const getAuditLogInputSchema = z.object({
  token: z.string().min(1, 'token is required'),
  action: z.string().trim().max(64).optional(),
  actor: z.string().trim().max(120).optional(),
  entityType: z.enum(['ORDER', 'USER', 'PRODUCT', 'CATEGORY']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
})

export type GetAuditLogInput = z.infer<typeof getAuditLogInputSchema>

export interface AuditLogEntry {
  id: string
  actorClerkId: string | null
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  changes: unknown
  createdAt: Date | string | null
}

interface RawAuditLog {
  _id: unknown
  actorClerkId?: string
  actorEmail?: string
  action: string
  entityType: string
  entityId?: string
  changes?: unknown
  createdAt?: Date | string
}

function mapEntry(entry: RawAuditLog): AuditLogEntry {
  return {
    id: String(entry._id),
    actorClerkId: entry.actorClerkId ?? null,
    actorEmail: entry.actorEmail ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    changes: entry.changes ?? null,
    createdAt: entry.createdAt ?? null,
  }
}

function parseDate(value: string | undefined, endOfDay: boolean): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `Invalid date: ${value}`)
  }
  // A date-only value (YYYY-MM-DD) parses to midnight; extend `dateTo` to the
  // end of the day so the range is inclusive, matching the REST controller.
  return endOfDay ? new Date(date.setHours(23, 59, 59, 999)) : date
}

export async function getAuditLogTool(raw: unknown): Promise<AuditLogEntry[]> {
  const input = getAuditLogInputSchema.parse(raw)

  // Protected admin-only tool: a valid Clerk JWT whose profile is ADMIN.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId
  const user = clerkUserId ? await UserModel.findOne({ clerkUserId }).select('role') : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  const events = (await listAuditLog({
    action: input.action,
    actor: input.actor,
    entityType: input.entityType,
    dateFrom: parseDate(input.dateFrom, false),
    dateTo: parseDate(input.dateTo, true),
    limit: input.limit,
  })) as unknown as RawAuditLog[]

  return events.map(mapEntry)
}
