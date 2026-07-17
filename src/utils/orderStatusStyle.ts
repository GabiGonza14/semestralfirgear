import type { OrderStatus } from '../types'

// Spanish label + badge color per order status. Colors mirror the palette used in
// AdminOrderDetailModal so a status looks identical in the list and the detail.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  PENDING: { label: 'Pendiente', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  PAID: { label: 'Pagado', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  SHIPPED: { label: 'Enviado', badge: 'bg-sky-50 text-sky-700 ring-sky-200' },
  DELIVERED: { label: 'Entregado', badge: 'bg-teal-50 text-teal-700 ring-teal-200' },
  CANCELLED: { label: 'Cancelado', badge: 'bg-slate-100 text-slate-600 ring-slate-200' },
  FAILED: { label: 'Fallido', badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
  REFUNDED: { label: 'Reembolsado', badge: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
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
