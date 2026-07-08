import { useMemo, useState } from 'react'
import type { BackendOrder, OrderStatus } from '../../types'
import { formatCurrency, formatDate } from '../../utils/format'
import { ORDER_STATUS_META, ORDER_STATUS_ORDER } from '../../utils/orderStatusStyle'
import { OrderStatusBadge } from './OrderStatusBadge'

interface AdminOrdersSectionProps {
  orders: BackendOrder[]
  loading: boolean
  onSelectOrder: (orderId: string) => void
  /** 'overview' shows a compact recent list; 'full' shows filters + all orders. */
  variant: 'overview' | 'full'
  /** Only for the overview variant — jump to the full orders view. */
  onViewAll?: () => void
}

const OVERVIEW_LIMIT = 5

type StatusFilter = OrderStatus | 'ALL'

function shortId(id: string) {
  return `#${id.slice(-6).toUpperCase()}`
}

function itemCount(order: BackendOrder) {
  return order.items.reduce((total, item) => total + item.quantity, 0)
}

export function AdminOrdersSection({
  orders,
  loading,
  onSelectOrder,
  variant,
  onViewAll,
}: AdminOrdersSectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const isOverview = variant === 'overview'

  // Count per status, for the filter chips and their badges.
  const counts = useMemo(() => {
    const map = new Map<OrderStatus, number>()
    for (const order of orders) {
      map.set(order.status, (map.get(order.status) ?? 0) + 1)
    }
    return map
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (isOverview) {
      return orders.slice(0, OVERVIEW_LIMIT)
    }
    return statusFilter === 'ALL'
      ? orders
      : orders.filter((order) => order.status === statusFilter)
  }, [orders, isOverview, statusFilter])

  // In the full view, only offer chips for statuses that actually occur.
  const availableStatuses = ORDER_STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0)

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            {isOverview ? 'Órdenes recientes' : 'Órdenes'}
            <span className="ml-2 text-sm font-normal text-slate-500">
              {isOverview
                ? `últimas ${Math.min(OVERVIEW_LIMIT, orders.length)}`
                : `${visibleOrders.length} de ${orders.length}`}
            </span>
          </h3>
          {!isOverview ? (
            <p className="mt-1 text-xs text-slate-500">
              Haz clic en una orden para ver el detalle y gestionar su estado.
            </p>
          ) : null}
        </div>

        {isOverview && orders.length > OVERVIEW_LIMIT && onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
          >
            Ver todas ({orders.length})
          </button>
        ) : null}
      </div>

      {/* Status filters (full view only) */}
      {!isOverview ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip
            label="Todas"
            count={orders.length}
            active={statusFilter === 'ALL'}
            onClick={() => setStatusFilter('ALL')}
          />
          {availableStatuses.map((status) => (
            <FilterChip
              key={status}
              label={ORDER_STATUS_META[status].label}
              count={counts.get(status) ?? 0}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            />
          ))}
        </div>
      ) : null}

      {/* Orders table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-140 border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-3 font-semibold">Orden</th>
              <th className="pb-3 font-semibold">Cliente</th>
              <th className="pb-3 font-semibold">Fecha</th>
              <th className="pb-3 font-semibold">Estado</th>
              <th className="pb-3 text-right font-semibold">Total</th>
              <th className="pb-3" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {loading && orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  Cargando órdenes…
                </td>
              </tr>
            ) : visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                  {orders.length === 0
                    ? 'Aún no hay órdenes.'
                    : 'No hay órdenes con este estado.'}
                </td>
              </tr>
            ) : (
              visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className="group cursor-pointer transition hover:bg-white/[0.04]"
                >
                  <td className="border-t border-white/[0.06] py-3">
                    <span
                      className="font-mono font-semibold text-white"
                      title={order.id}
                    >
                      {shortId(order.id)}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {itemCount(order)} art.
                    </span>
                  </td>
                  <td className="border-t border-white/[0.06] py-3 text-slate-300">
                    {order.customerName ?? order.userId}
                  </td>
                  <td className="border-t border-white/[0.06] py-3 text-slate-400">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="border-t border-white/[0.06] py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="border-t border-white/[0.06] py-3 text-right font-semibold text-white">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="border-t border-white/[0.06] py-3 pl-2 text-right">
                    <span className="text-slate-600 transition group-hover:text-slate-300">›</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

interface FilterChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function FilterChip({ label, count, active, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-lime-400 text-slate-950'
          : 'border border-white/12 text-slate-300 hover:border-white/30 hover:bg-white/5'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] ${
          active ? 'bg-slate-950/20 text-slate-900' : 'bg-white/10 text-slate-400'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
