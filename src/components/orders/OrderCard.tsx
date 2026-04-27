import { useMemo, useState } from 'react'
import type { BackendOrder } from '../../types'
import { formatCurrency } from '../../utils/format'
import { OrderItemRow } from './OrderItemRow'

interface OrderCardProps {
  order: BackendOrder
}

function statusStyles(status: BackendOrder['status']) {
  if (status === 'PAID') {
    return 'bg-lime-100 text-lime-700'
  }

  if (status === 'PENDING') {
    return 'bg-amber-100 text-amber-700'
  }

  if (status === 'CANCELLED') {
    return 'bg-slate-100 text-slate-600'
  }

  return 'bg-slate-100 text-slate-700'
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
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Orden</p>
          <h3 className="text-lg font-bold text-gray-900">#{order.id}</h3>
          <p className="text-sm text-gray-600">Fecha: {formatDate(order.createdAt)}</p>
          <p className="text-sm text-gray-600">Productos: {totalProducts}</p>
          <p className="text-sm font-semibold text-gray-900">Total: {formatCurrency(order.totalAmount)}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles(order.status)}`}>
            {order.status}
          </span>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            {expanded ? 'Ocultar detalle' : 'Ver detalle'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}
    </article>
  )
}