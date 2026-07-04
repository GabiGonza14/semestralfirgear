import { useMemo, useState } from 'react'
import type { BackendOrder } from '../../types'
import { formatCurrency } from '../../utils/format'
import { OrderItemRow } from './OrderItemRow'

interface OrderCardProps {
  order: BackendOrder
}

function statusStyles(status: BackendOrder['status']) {
  if (status === 'PAID') {
    return 'bg-lime-400/15 text-lime-300 ring-1 ring-lime-400/30'
  }

  if (status === 'PENDING') {
    return 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
  }

  if (status === 'DELIVERED') {
    return 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30'
  }

  if (status === 'CANCELLED') {
    return 'bg-white/[0.06] text-slate-400 ring-1 ring-white/10'
  }

  return 'bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/30'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function OrderCard({ order }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false)

  const totalProducts = useMemo(
    () => order.items.reduce((acc, item) => acc + item.quantity, 0),
    [order.items],
  )

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-slate-900 p-5 transition hover:border-white/15">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Orden</p>
          <h3 className="font-mono text-sm font-semibold text-white">#{order.id}</h3>
          <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm text-slate-400">
            <span>Fecha: {formatDate(order.createdAt)}</span>
            <span>Productos: {totalProducts}</span>
          </div>
          <p className="pt-1 text-base font-bold text-white">
            Total: {formatCurrency(order.totalAmount)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles(order.status)}`}>
            {order.status}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/30 hover:text-white"
          >
            {expanded ? 'Ocultar' : 'Ver detalle'}
            <svg
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </article>
  )
}
