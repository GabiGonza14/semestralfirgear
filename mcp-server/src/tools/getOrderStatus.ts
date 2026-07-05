import { z } from 'zod'
import { requireAuthStrict } from '../../../backend/src/middlewares/requireAuth'
import { UserModel } from '../../../backend/src/models/User'
import { listOrdersByUserId } from '../../../backend/src/services/orderService'

// The only accepted input is the caller's own Clerk JWT. A client can never
// pass an arbitrary userId — orders are always scoped to the authenticated user.
export const getOrderStatusInputSchema = z.object({
  token: z.string().optional(),
})

export type GetOrderStatusInput = z.infer<typeof getOrderStatusInputSchema>

export interface OrderItemSummary {
  product: string
  quantity: number
  size: string | null
  unitPrice: number
  subtotal: number
}

export interface OrderSummary {
  id: string
  status: string
  totalAmount: number
  createdAt: Date | string | null
  paidAt: Date | string | null
  items: OrderItemSummary[]
}

export interface GetOrderStatusResult {
  authenticated: true
  orders: OrderSummary[]
}

// The order objects come from listOrdersByUserId (buildOrderWithItems output):
// a plain object spread of the Order plus a populated `items` array.
interface RawOrderItem {
  productId?: { name?: string } | null
  quantity: number
  size?: string | null
  unitPrice: number
  subtotal: number
}

interface RawOrder {
  _id: unknown
  status: string
  totalAmount: number
  createdAt?: Date | string
  paidAt?: Date | string | null
  items?: RawOrderItem[]
}

function mapOrder(order: RawOrder): OrderSummary {
  return {
    id: String(order._id),
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt ?? null,
    paidAt: order.paidAt ?? null,
    items: (order.items ?? []).map((item) => ({
      product: item.productId?.name ?? '',
      quantity: item.quantity,
      size: item.size ?? null,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  }
}

export async function getOrderStatusTool(raw: unknown): Promise<GetOrderStatusResult> {
  const input = getOrderStatusInputSchema.parse(raw)

  // Protected tool: exposes personal data, so a valid Clerk JWT is mandatory.
  // requireAuthStrict throws if the token is missing or invalid.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId

  if (!clerkUserId) {
    return { authenticated: true, orders: [] }
  }

  // Clerk's `sub` is not the Mongo _id — resolve the linked profile first.
  const user = await UserModel.findOne({ clerkUserId }).select('_id')
  if (!user) {
    // Authenticated, but no linked FITGEAR profile yet — no orders to show.
    return { authenticated: true, orders: [] }
  }

  const orders = await listOrdersByUserId(String(user._id))
  return {
    authenticated: true,
    orders: (orders as unknown as RawOrder[]).map(mapOrder),
  }
}
