import type { OrderStatus } from '../types'

// Spanish label + badge color per order status. Colors mirror the palette used in
// AdminOrderDetailModal so a status looks identical in the list and the detail.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  PENDING: { label: 'Pendiente', badge: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' },
  PAID: { label: 'Pagado', badge: 'bg-lime-400/15 text-lime-300 ring-lime-400/30' },
  SHIPPED: { label: 'Enviado', badge: 'bg-sky-400/15 text-sky-300 ring-sky-400/30' },
  DELIVERED: { label: 'Entregado', badge: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' },
  CANCELLED: { label: 'Cancelado', badge: 'bg-slate-400/15 text-slate-300 ring-slate-400/30' },
  FAILED: { label: 'Fallido', badge: 'bg-rose-400/15 text-rose-300 ring-rose-400/30' },
  REFUNDED: { label: 'Reembolsado', badge: 'bg-fuchsia-400/15 text-fuchsia-300 ring-fuchsia-400/30' },
}

// Filter/display order for status chips.
export const ORDER_STATUS_ORDER: OrderStatus[] = [
  'PENDING',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'FAILED',
]
