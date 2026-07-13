import { Schema, Types, model, type InferSchemaType } from 'mongoose'

// Per-user audit trail (HU-44). Records admin actions on user accounts —
// role changes and (de)activations — so every privileged change is traceable:
// what happened, to whom, who did it, when, and the before/after values.
// Mirrors OrderEvent (HU-29), which audits order lifecycle events.
const userAuditEventSchema = new Schema(
  {
    // The user affected by the action.
    targetUserId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    // Event kind: 'ROLE_CHANGED' | 'STATUS_CHANGED'. Kept as a string to stay
    // open for future account events.
    type: { type: String, required: true, index: true },
    // Clerk userId of the admin who triggered the change (traceability).
    actorClerkId: { type: String, required: false },
    // Structured before/after, e.g. { from: 'CUSTOMER', to: 'ADMIN' } for a role
    // change or { isActive: false } for a deactivation.
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  { timestamps: true },
)

export type UserAuditEventDocument = InferSchemaType<typeof userAuditEventSchema>
export const UserAuditEventModel = model<UserAuditEventDocument>(
  'UserAuditEvent',
  userAuditEventSchema,
)
