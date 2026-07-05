import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { listOrders } from '../../../backend/src/services/orderService'
import { HttpError } from '../../../backend/src/utils/httpError'

// Mirror of the Order model's status enum (backend/src/models/Order.ts).
const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const

export const listOrdersInputSchema = z.object({
  token: z.string().min(1, 'token is required'),
  status: z.enum(ORDER_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(50),
})

export type ListOrdersInput = z.infer<typeof listOrdersInputSchema>

export interface OrderListEntry {
  orderId: string
  createdAt: Date | string | null
  customerName: string
  customerEmail: string
  status: string
  totalAmount: number
  itemsCount: number
}

// listOrders() returns buildOrderWithItems output: a plain object spread of the
// Order (with `userId` populated) plus a populated `items` array.
interface RawOrder {
  _id: unknown
  userId?: { fullName?: string; email?: string } | null
  status: string
  totalAmount: number
  createdAt?: Date | string
  items?: unknown[]
}

function mapOrder(order: RawOrder): OrderListEntry {
  const customer = order.userId ?? null
  return {
    orderId: String(order._id),
    createdAt: order.createdAt ?? null,
    customerName: customer?.fullName ?? '',
    customerEmail: customer?.email ?? '',
    status: order.status,
    totalAmount: order.totalAmount,
    itemsCount: (order.items ?? []).length,
  }
}

export async function listOrdersTool(raw: unknown): Promise<OrderListEntry[]> {
  const input = listOrdersInputSchema.parse(raw)

  // Protected admin-only tool: returns ALL orders across every customer.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId

  // Clerk's `sub` is not the Mongo _id — resolve the profile to check the role.
  const user = clerkUserId
    ? await UserModel.findOne({ clerkUserId }).select('role')
    : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  // Reuse listOrders() as-is; apply status filter and limit here in the tool so
  // the service and REST controller stay untouched.
  const orders = (await listOrders()) as unknown as RawOrder[]
  const filtered = input.status
    ? orders.filter((order) => order.status === input.status)
    : orders

  return filtered.slice(0, input.limit).map(mapOrder)
}
