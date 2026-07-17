import { useEffect, useMemo, useState } from 'react'
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
const PAGE_SIZE = 30

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
}: Readonly<AdminOrdersSectionProps>) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
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

  // Status filter changes can shrink the result set below the current page.
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedOrders = useMemo(() => {
    if (isOverview) {
      return visibleOrders
    }
    return visibleOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  }, [visibleOrders, isOverview, currentPage])

  // In the full view, only offer chips for statuses that actually occur.
  const availableStatuses = ORDER_STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
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
            className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
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
                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  Cargando órdenes…
                </td>
              </tr>
            ) : visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  {orders.length === 0
                    ? 'Todavía no hay órdenes. Van a aparecer aquí en cuanto un cliente compre.'
                    : 'No hay órdenes con este estado.'}
                </td>
              </tr>
            ) : (
              pagedOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className="group cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="border-t border-slate-100 py-3">
                    <span
                      className="font-mono font-semibold text-slate-900"
                      title={order.id}
                    >
                      {shortId(order.id)}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {itemCount(order)} art.
                    </span>
                  </td>
                  <td className="border-t border-slate-100 py-3 text-slate-600">
                    {order.customerName ?? order.userId}
                  </td>
                  <td className="border-t border-slate-100 py-3 text-slate-500">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="border-t border-slate-100 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="border-t border-slate-100 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="border-t border-slate-100 py-3 pl-2 text-right">
                    <span className="text-slate-300 transition group-hover:text-slate-500">›</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isOverview && visibleOrders.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}

interface FilterChipProps {
  label: string
  count: number
  active: boolean
  onClick: () => void
}

function FilterChip({ label, count, active, onClick }: Readonly<FilterChipProps>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-emerald-700 text-white'
          : 'border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] ${
          active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  )
}
