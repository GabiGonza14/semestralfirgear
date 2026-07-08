import type { OrderStatus } from '../../types'
import { ORDER_STATUS_META } from '../../utils/orderStatusStyle'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

// Small colored pill showing a localized order status. Shared by the orders list.
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const meta = ORDER_STATUS_META[status]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.badge}`}
    >
      {meta.label}
    </span>
  )
}
