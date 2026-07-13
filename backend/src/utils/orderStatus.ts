// Order lifecycle state machine (HU-42). Single source of truth for which manual
// admin status changes are allowed, shared by the REST endpoint and the MCP tool.
//
// Only forward, sequential transitions are permitted (e.g. never DELIVERED ->
// PENDING). PAID is intentionally NOT a manual target: an order only becomes PAID
// through the Stripe payment flow (HU-30), never by hand — marking it paid
// manually would skip payment, stock deduction and the confirmation email.
// REFUNDED and FAILED are managed by the refund/payment flows, not this setter.

export const ORDER_LIFECYCLE_STATUSES = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const

export type OrderLifecycleStatus = (typeof ORDER_LIFECYCLE_STATUSES)[number]

// Allowed manual transitions: current status -> list of valid next statuses.
export const ORDER_STATUS_TRANSITIONS: Record<string, OrderLifecycleStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  // Terminal payment/refund states — no manual transitions out of them.
  FAILED: [],
  REFUNDED: [],
}

export function nextStatuses(from: string): OrderLifecycleStatus[] {
  return ORDER_STATUS_TRANSITIONS[from] ?? []
}

export function canTransition(from: string, to: string): boolean {
  return nextStatuses(from).includes(to as OrderLifecycleStatus)
}
