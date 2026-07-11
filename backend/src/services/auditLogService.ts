import mongoose from 'mongoose'
import { AuditLogModel } from '../models/AuditLog'
import { UserModel } from '../models/User'

// HU-52: the single write/read seam for the admin-action audit trail. Every
// admin mutation records through recordAuditAction; the panel and the
// get_audit_log MCP tool read through listAuditLog. Kept in its own service so
// its dependency surface is exactly AuditLogModel + UserModel.

export type AuditEntityType = 'ORDER' | 'USER' | 'PRODUCT' | 'CATEGORY'

export interface RecordAuditInput {
  // Clerk userId of the acting admin (the JWT `sub`). Accepts null so callers
  // can pass c.get('userId') straight through.
  actorClerkId?: string | null
  action: string
  entityType: AuditEntityType
  entityId?: string
  changes?: unknown
}

/**
 * Records one admin action in the audit trail. Best-effort by design: an
 * audit-write failure must NEVER turn a successful admin action into an error
 * (the mutation it describes has already been persisted). Mirrors the
 * try/catch discipline of OrderEvent's recordStatusChange (HU-29). Resolves the
 * actor's email for a readable table, also best-effort.
 */
export async function recordAuditAction(input: RecordAuditInput): Promise<void> {
  // Skip when there's no live DB connection (readyState 1 = connected). Without
  // this, an audit write would sit in Mongoose's command buffer and only fail
  // after bufferTimeoutMS (10s), delaying the admin action it's meant to shadow.
  // Best-effort by contract, so a missing connection simply means no record.
  if (mongoose.connection.readyState !== 1) {
    return
  }

  try {
    let actorEmail: string | undefined
    if (input.actorClerkId) {
      const actor = await UserModel.findOne({ clerkUserId: input.actorClerkId }).select('email')
      actorEmail = actor?.email
    }

    await AuditLogModel.create({
      actorClerkId: input.actorClerkId ?? undefined,
      actorEmail,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changes: input.changes,
    })
  } catch (error) {
    console.error('[audit-log] failed to write audit record', {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error,
    })
  }
}

export interface AuditLogFilters {
  // Exact action type, e.g. 'ORDER_STATUS_CHANGED'.
  action?: string
  // Free-text match against the actor: their Clerk id or email (case-insensitive).
  actor?: string
  entityType?: AuditEntityType
  // Inclusive date range on createdAt.
  dateFrom?: Date
  dateTo?: Date
  // Cap the number of rows returned (defaults applied by the caller/validation).
  limit?: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 200

/**
 * Returns audit records newest-first, filtered by action type, actor and/or a
 * createdAt date range (all optional). Read-only — the same query backs the
 * REST endpoint and the get_audit_log MCP tool so they never drift.
 */
export async function listAuditLog(filters: AuditLogFilters = {}) {
  const query: Record<string, unknown> = {}

  if (filters.action) {
    query.action = filters.action
  }

  if (filters.entityType) {
    query.entityType = filters.entityType
  }

  if (filters.actor) {
    const escaped = filters.actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = { $regex: escaped, $options: 'i' }
    query.$or = [{ actorClerkId: pattern }, { actorEmail: pattern }]
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdAt: Record<string, Date> = {}
    if (filters.dateFrom) {
      createdAt.$gte = filters.dateFrom
    }
    if (filters.dateTo) {
      createdAt.$lte = filters.dateTo
    }
    query.createdAt = createdAt
  }

  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT)

  return AuditLogModel.find(query).sort({ createdAt: -1 }).limit(limit)
}
