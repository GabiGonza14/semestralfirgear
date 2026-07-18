import { useEffect, useState } from 'react'
import { getOrderHistory, refundOrder, updateOrderStatus } from '../../api/fitgearApi'
import type { BackendOrder, OrderEvent, OrderStatus } from '../../types'
import { formatCurrency, formatDate } from '../../utils/format'
import { ORDER_STATUS_META } from '../../utils/orderStatusStyle'
import { Select } from '../ui/Select'

// Human-readable Spanish labels for each recorded order event. Falls back to
// the raw code for any future event type not yet mapped here.
const EVENT_TYPE_LABELS: Record<string, string> = {
  STATUS_CHANGED: 'Cambio de estado',
  ORDER_SHIPPED: 'Orden enviada',
  REFUNDED: 'Reembolso procesado',
}

interface AdminOrderDetailModalProps {
  order: BackendOrder
  onClose: () => void
  /** Called after a refund or status change so the parent can reload the orders. */
  onUpdated: () => void | Promise<void>
}

// Only orders where money actually changed hands can be refunded (matches the
// backend guard in refundOrder).
const REFUNDABLE_STATUSES: OrderStatus[] = ['PAID', 'SHIPPED', 'DELIVERED']

// Valid manual status transitions — MUST mirror the backend state machine in
// backend/src/utils/orderStatus.ts (HU-42). PAID is never a manual target.
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
  REFUNDED: [],
}

interface StatusChangeSectionProps {
  order: BackendOrder
  nextStatuses: OrderStatus[]
  targetStatus: OrderStatus | ''
  onTargetStatusChange: (status: OrderStatus | '') => void
  statusTracking: string
  onStatusTrackingChange: (value: string) => void
  statusCancelReason: string
  onStatusCancelReasonChange: (value: string) => void
  updatingStatus: boolean
  onSubmit: () => void
}

// "Cambiar estado" panel, pulled out of AdminOrderDetailModal so its own
// nested transition-specific fields (tracking number, cancel reason) don't
// add to the parent's cognitive complexity.
function StatusChangeSection({
  order,
  nextStatuses,
  targetStatus,
  onTargetStatusChange,
  statusTracking,
  onStatusTrackingChange,
  statusCancelReason,
  onStatusCancelReasonChange,
  updatingStatus,
  onSubmit,
}: Readonly<StatusChangeSectionProps>) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-900">Cambiar estado</h4>
      {nextStatuses.length > 0 ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              tone="light"
              label="Nuevo estado"
              value={targetStatus}
              onChange={onTargetStatusChange}
              options={[
                { value: '', label: 'Selecciona un estado…' },
                ...nextStatuses.map((status) => ({ value: status, label: ORDER_STATUS_META[status].label })),
              ]}
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={!targetStatus || updatingStatus}
              className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingStatus ? 'Actualizando…' : 'Actualizar estado'}
            </button>
          </div>
          {targetStatus === 'SHIPPED' ? (
            <>
              <input
                type="text"
                value={statusTracking}
                onChange={(event) => onStatusTrackingChange(event.target.value)}
                placeholder="Nº de rastreo (opcional)"
                maxLength={64}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none"
              />
              <p className="text-xs text-slate-500">Se enviará un email de notificación al cliente.</p>
            </>
          ) : null}
          {targetStatus === 'CANCELLED' && order.status === 'PAID' ? (
            <>
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Esta orden ya está pagada — cancelarla reembolsa el total al cliente por Stripe y repone
                el stock automáticamente. La orden quedará como "Devuelto", no "Cancelado".
              </p>
              <textarea
                value={statusCancelReason}
                onChange={(event) => onStatusCancelReasonChange(event.target.value)}
                placeholder="Motivo de la cancelación (opcional)"
                rows={2}
                maxLength={500}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500/60 focus:outline-none"
              />
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Esta orden no admite más cambios de estado.</p>
      )}
    </div>
  )
}

interface RefundSectionProps {
  order: BackendOrder
  isRefundable: boolean
  confirming: boolean
  onStartConfirm: () => void
  reason: string
  onReasonChange: (value: string) => void
  reasonRequired: boolean
  refunding: boolean
  canConfirmRefund: boolean
  onCancelConfirm: () => void
  onConfirmRefund: () => void
}

// "Reembolso" panel — same reasoning as StatusChangeSection above: its own
// confirm/cancel sub-flow was a big share of the parent's branching.
function RefundSection({
  order,
  isRefundable,
  confirming,
  onStartConfirm,
  reason,
  onReasonChange,
  reasonRequired,
  refunding,
  canConfirmRefund,
  onCancelConfirm,
  onConfirmRefund,
}: Readonly<RefundSectionProps>) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-900">Reembolso</h4>
      {isRefundable ? (
        !confirming ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">Reembolsa el total de esta orden a través de Stripe.</p>
            <button
              type="button"
              onClick={onStartConfirm}
              className="shrink-0 rounded-full bg-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-fuchsia-500"
            >
              Reembolsar
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-600">
              Vas a reembolsar <span className="font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</span> al
              cliente. Esta acción no se puede deshacer.
            </p>
            <div>
              <textarea
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                placeholder={
                  reasonRequired
                    ? 'Motivo del reembolso (obligatorio para órdenes enviadas)'
                    : 'Motivo del reembolso (opcional)'
                }
                rows={2}
                maxLength={500}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-fuchsia-500/60 focus:outline-none"
              />
              {reasonRequired ? (
                <p className="mt-1.5 text-xs text-amber-600">
                  Esta orden ya fue enviada — es una devolución real, así que el motivo es obligatorio.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={onCancelConfirm}
                disabled={refunding}
                className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmRefund}
                disabled={!canConfirmRefund}
                className="rounded-full bg-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-fuchsia-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refunding ? 'Procesando...' : 'Confirmar reembolso'}
              </button>
            </div>
          </div>
        )
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          {order.status === 'REFUNDED'
            ? 'Esta orden ya fue reembolsada.'
            : 'Solo se pueden reembolsar órdenes pagadas, enviadas o entregadas.'}
        </p>
      )}
    </div>
  )
}

interface OrderHistoryListProps {
  loadingHistory: boolean
  history: OrderEvent[]
}

// "Historial" panel — isolates its own loading/empty/list branching.
function OrderHistoryList({ loadingHistory, history }: Readonly<OrderHistoryListProps>) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-sm font-semibold text-slate-900">Historial</h4>
      {loadingHistory ? (
        <p className="text-sm text-slate-500">Cargando historial...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-500">Sin eventos registrados.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((event) => (
            <li key={event.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-900">
                  {EVENT_TYPE_LABELS[event.type] ?? event.type}
                </span>
                <span className="text-xs text-slate-500">{formatDate(event.createdAt)}</span>
              </div>
              {event.reason ? <p className="mt-1 text-slate-500">Motivo: {event.reason}</p> : null}
              {event.actorClerkId ? (
                <p className="mt-0.5 text-xs text-slate-500">Realizado por un administrador</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AdminOrderDetailModal({ order, onClose, onUpdated }: Readonly<AdminOrderDetailModalProps>) {
  const [history, setHistory] = useState<OrderEvent[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState('')
  const [refunding, setRefunding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targetStatus, setTargetStatus] = useState<OrderStatus | ''>('')
  const [statusTracking, setStatusTracking] = useState('')
  const [statusCancelReason, setStatusCancelReason] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const isRefundable = REFUNDABLE_STATUSES.includes(order.status)
  const nextStatuses = STATUS_TRANSITIONS[order.status]
  // A SHIPPED order is a real return (goods already left the warehouse), not a
  // plain cancellation — the backend rejects the refund without a reason, so
  // require it here too instead of letting the admin hit that error.
  const reasonRequired = order.status === 'SHIPPED'
  const canConfirmRefund = !refunding && (!reasonRequired || reason.trim().length > 0)

  const loadHistory = async () => {
    setLoadingHistory(true)
    try {
      setHistory(await getOrderHistory(order.id))
    } catch {
      // History is supplementary — a load failure should not block the modal.
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id])

  const handleRefund = async () => {
    setRefunding(true)
    setError(null)

    try {
      await refundOrder(order.id, reason.trim() || undefined)
      setConfirming(false)
      setReason('')
      await onUpdated() // parent reloads orders -> this order flips to REFUNDED
      await loadHistory() // reflect the new refund event in the history panel
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : 'No se pudo procesar el reembolso.')
    } finally {
      setRefunding(false)
    }
  }

  const handleStatusChange = async () => {
    if (!targetStatus) return
    setUpdatingStatus(true)
    setError(null)

    try {
      // trackingNumber only matters when shipping; reason only matters when
      // cancelling a still-PAID order (that path refunds instead of relabeling).
      const tracking = targetStatus === 'SHIPPED' ? statusTracking.trim() || undefined : undefined
      const cancelReason =
        targetStatus === 'CANCELLED' && order.status === 'PAID'
          ? statusCancelReason.trim() || undefined
          : undefined
      await updateOrderStatus(order.id, targetStatus, tracking, cancelReason)
      setTargetStatus('')
      setStatusTracking('')
      setStatusCancelReason('')
      await onUpdated() // parent reloads orders -> this order reflects the new status
      await loadHistory() // reflect the STATUS_CHANGED event in the history panel
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'No se pudo cambiar el estado.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Detalle de orden</p>
            <h3 className="mt-2 break-all text-2xl font-bold tracking-tight text-slate-900">#{order.id}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Cliente</p>
            <p className="text-sm font-semibold text-slate-900">{order.customerName ?? order.userId}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Fecha</p>
            <p className="text-sm font-semibold text-slate-900">{formatDate(order.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Estado</p>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${ORDER_STATUS_META[order.status].badge}`}
            >
              {ORDER_STATUS_META[order.status].label}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-sm font-semibold text-slate-900">{formatCurrency(order.totalAmount)}</p>
          </div>
        </div>

        {order.shippingAddress ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Dirección de envío</p>
            <p className="text-sm font-semibold text-slate-900">{order.shippingAddress.name}</p>
            <p className="text-sm text-slate-600">
              {[order.shippingAddress.line1, order.shippingAddress.line2].filter(Boolean).join(', ')}
            </p>
            <p className="text-sm text-slate-600">
              {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.postalCode]
                .filter(Boolean)
                .join(', ')}
              {order.shippingAddress.country ? ` · ${order.shippingAddress.country}` : ''}
            </p>
          </div>
        ) : null}

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Productos</h4>
          <div className="overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-center">Cant.</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {item.productName}
                      {item.size ? <span className="text-slate-500"> · Talla {item.size}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status change (HU-42) */}
        <StatusChangeSection
          order={order}
          nextStatuses={nextStatuses}
          targetStatus={targetStatus}
          onTargetStatusChange={setTargetStatus}
          statusTracking={statusTracking}
          onStatusTrackingChange={setStatusTracking}
          statusCancelReason={statusCancelReason}
          onStatusCancelReasonChange={setStatusCancelReason}
          updatingStatus={updatingStatus}
          onSubmit={handleStatusChange}
        />

        {/* Refund action */}
        <RefundSection
          order={order}
          isRefundable={isRefundable}
          confirming={confirming}
          onStartConfirm={() => {
            setConfirming(true)
            setError(null)
          }}
          reason={reason}
          onReasonChange={setReason}
          reasonRequired={reasonRequired}
          refunding={refunding}
          canConfirmRefund={canConfirmRefund}
          onCancelConfirm={() => {
            setConfirming(false)
            setReason('')
          }}
          onConfirmRefund={handleRefund}
        />

        {/* Shared error for status-change and refund actions */}
        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {/* Order history */}
        <OrderHistoryList loadingHistory={loadingHistory} history={history} />
      </div>
    </div>
  )
}
