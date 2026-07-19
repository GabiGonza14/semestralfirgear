import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { recordAuditAction } from '../../../backend/src/services/auditLogService'
import { updateOrderStatus } from '../../../backend/src/services/orderService'
import { HttpError } from '../../../backend/src/utils/httpError'
import { ORDER_LIFECYCLE_STATUSES } from '../../../backend/src/utils/orderStatus'

// Admin-facing tool for logistics automation: move an order along its lifecycle
// (PENDING -> PAID -> SHIPPED -> DELIVERED, or CANCELLED). The backend service
// enforces the same state machine, audit trail and SHIPPED/DELIVERED emails as
// the panel.
export const updateOrderStatusInputSchema = z.object({
  orderId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'orderId must be a valid ObjectId'),
  token: z.string().min(1, 'token is required'),
  status: z.enum(ORDER_LIFECYCLE_STATUSES),
  // Only used when status is SHIPPED; ignored otherwise.
  trackingNumber: z.string().trim().max(64).optional(),
})

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>

export interface UpdateOrderStatusSuccess {
  ok: true
  orderId: string
  status: string
}

export interface UpdateOrderStatusFailure {
  ok: false
  orderId: string
  message: string
}

export type UpdateOrderStatusResult = UpdateOrderStatusSuccess | UpdateOrderStatusFailure

export async function updateOrderStatusTool(raw: unknown): Promise<UpdateOrderStatusResult> {
  const input = updateOrderStatusInputSchema.parse(raw)

  // Protected admin-only tool.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId

  // Clerk's `sub` is not the Mongo _id — resolve the profile to check the role.
  const user = clerkUserId ? await UserModel.findOne({ clerkUserId }).select('role') : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  try {
    await updateOrderStatus(input.orderId, input.status, {
      actorClerkId: clerkUserId,
      trackingNumber: input.trackingNumber,
    })
    // HU-52: record the admin action in the audit trail so MCP-driven status
    // changes are traceable alongside the ones made from the panel.
    await recordAuditAction({
      actorClerkId: clerkUserId,
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'ORDER',
      entityId: input.orderId,
      changes: { status: input.status, trackingNumber: input.trackingNumber, via: 'mcp:update_order_status' },
    })
    // The transition succeeded, so the order is now in the requested status.
    return { ok: true, orderId: input.orderId, status: input.status }
  } catch (err) {
    // Surface not-found and invalid-transition errors as readable results
    // instead of throwing, so the agent can reason about them.
    if (err instanceof HttpError && (err.statusCode === 404 || err.statusCode === 400)) {
      return { ok: false, orderId: input.orderId, message: err.message }
    }
    throw err
  }
}
