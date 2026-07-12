import { Schema, model, type InferSchemaType } from 'mongoose'

// HU-52: unified admin-action audit trail. Where OrderEvent (HU-29) and
// UserAuditEvent (HU-44) each audit a single entity, AuditLog is the ONE
// cross-entity collection every admin action writes to — orders, users,
// products and categories alike — so the panel and the get_audit_log MCP tool
// can query "everything an admin did" from a single place, ordered by date.
//
// Each record captures the acceptance-criteria five: who (actorClerkId, plus a
// denormalized actorEmail for a readable table), what (action), on what
// (entityType + entityId), when (timestamps.createdAt) and the change (changes).
//
// The records are an immutable trail: nothing in the app ever updates or deletes
// them (no write endpoint or MCP tool is exposed), and the pre-hooks below block
// update/delete queries as a defense-in-depth guard for AC "solo lectura".
const auditLogSchema = new Schema(
  {
    // Clerk userId of the admin who performed the action (the JWT `sub`, not the
    // Mongo _id). Absent only for system-generated entries.
    actorClerkId: { type: String, required: false, index: true },
    // Denormalized email of the actor, resolved at write time. The Clerk id is
    // opaque, so this is what the audit table shows as "usuario". Best-effort:
    // stays empty if the profile can't be resolved.
    actorEmail: { type: String, required: false },
    // The action performed, e.g. 'ORDER_STATUS_CHANGED', 'PRODUCT_UPDATED'.
    // Kept as a string to stay open for future actions.
    action: { type: String, required: true, index: true },
    // The kind of entity the action targeted.
    entityType: {
      type: String,
      enum: ['ORDER', 'USER', 'PRODUCT', 'CATEGORY', 'REVIEW'],
      required: true,
      index: true,
    },
    // Id of the affected entity (Mongo _id as a string). Absent for actions not
    // tied to a single record.
    entityId: { type: String, required: false },
    // Structured detail of what changed, e.g. { from, to } or the submitted
    // payload. Free-form so each action records what's meaningful for it.
    changes: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true },
)

// Immutability guard (AC: "no pueden ser editados ni eliminados"). The app never
// issues these queries against AuditLog, but blocking every update/delete query
// hook here means a future code path can't silently mutate the trail either.
// A single RegExp covers all matching query middleware in one registration.
auditLogSchema.pre(
  /^(updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany|findOneAndDelete)$/,
  function blockMutation(next: (err?: Error) => void) {
    next(new Error('AuditLog records are immutable and cannot be modified or deleted'))
  },
)

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>
export const AuditLogModel = model<AuditLogDocument>('AuditLog', auditLogSchema)
