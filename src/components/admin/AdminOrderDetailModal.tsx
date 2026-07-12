import { useEffect, useState } from 'react'
import { getOrderHistory, refundOrder, updateOrderStatus } from '../../api/fitgearApi'
import type { BackendOrder, OrderEvent, OrderStatus } from '../../types'
import { formatCurrency, formatDate } from '../../utils/format'

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

const STATUS_BADGE: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-400/15 text-amber-300',
  PAID: 'bg-lime-400/15 text-lime-300',
  SHIPPED: 'bg-sky-400/15 text-sky-300',
  DELIVERED: 'bg-emerald-400/15 text-emerald-300',
  CANCELLED: 'bg-slate-400/15 text-slate-300',
  FAILED: 'bg-rose-400/15 text-rose-300',
  REFUNDED: 'bg-fuchsia-400/15 text-fuchsia-300',
}

export function AdminOrderDetailModal({ order, onClose, onUpdated }: AdminOrderDetailModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/[0.08] bg-slate-900 p-6 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-lime-400">Detalle de orden</p>
            <h3 className="mt-2 break-all text-2xl font-bold tracking-tight text-white">#{order.id}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 p-2 text-slate-300 transition hover:border-white/30 hover:bg-white/5"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">Cliente</p>
            <p className="text-sm font-semibold text-white">{order.customerName ?? order.userId}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">Fecha</p>
            <p className="text-sm font-semibold text-white">{formatDate(order.createdAt)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">Estado</p>
            <span
              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${STATUS_BADGE[order.status]}`}
            >
              {order.status}
            </span>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-semibold text-white">{formatCurrency(order.totalAmount)}</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="mb-2 text-sm font-semibold text-white">Productos</h4>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-white/[0.03] text-xs text-slate-400">
                <tr>
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2 text-center">Cant.</th>
                  <th className="px-4 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-t border-white/[0.06]">
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
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h4 className="text-sm font-semibold text-white">Cambiar estado</h4>
          {nextStatuses.length > 0 ? (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={targetStatus}
                  onChange={(event) => setTargetStatus(event.target.value as OrderStatus | '')}
                  className="rounded-2xl border border-white/12 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 focus:border-lime-400/50 focus:outline-none"
                >
                  <option value="">Selecciona un estado…</option>
                  {nextStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleStatusChange}
                  disabled={!targetStatus || updatingStatus}
                  className="rounded-full bg-lime-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updatingStatus ? 'Actualizando…' : 'Actualizar estado'}
                </button>
              </div>
              {targetStatus === 'SHIPPED' ? (
                <>
                  <input
                    type="text"
                    value={statusTracking}
                    onChange={(event) => setStatusTracking(event.target.value)}
                    placeholder="Nº de rastreo (opcional)"
                    maxLength={64}
                    className="w-full rounded-2xl border border-white/12 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-lime-400/50 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500">Se enviará un email de notificación al cliente.</p>
                </>
              ) : null}
              {targetStatus === 'CANCELLED' && order.status === 'PAID' ? (
                <>
                  <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                    Esta orden ya está pagada — cancelarla reembolsa el total al cliente por Stripe y
                    repone el stock automáticamente. La orden quedará como "Devuelto", no "Cancelado".
                  </p>
                  <textarea
                    value={statusCancelReason}
                    onChange={(event) => setStatusCancelReason(event.target.value)}
                    placeholder="Motivo de la cancelación (opcional)"
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-2xl border border-white/12 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-lime-400/50 focus:outline-none"
                  />
                </>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Esta orden no admite más cambios de estado.</p>
          )}
        </div>

        {/* Refund action */}
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h4 className="text-sm font-semibold text-white">Reembolso</h4>
          {isRefundable ? (
            !confirming ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-400">
                  Reembolsa el total de esta orden a través de Stripe.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(true)
                    setError(null)
                  }}
                  className="shrink-0 rounded-full bg-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-fuchsia-400"
                >
                  Reembolsar
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-300">
                  Vas a reembolsar <span className="font-semibold text-white">{formatCurrency(order.totalAmount)}</span> al
                  cliente. Esta acción no se puede deshacer.
                </p>
                <div>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder={
                      reasonRequired
                        ? 'Motivo del reembolso (obligatorio para órdenes enviadas)'
                        : 'Motivo del reembolso (opcional)'
                    }
                    rows={2}
                    maxLength={500}
                    className="w-full rounded-2xl border border-white/12 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-fuchsia-400/50 focus:outline-none"
                  />
                  {reasonRequired ? (
                    <p className="mt-1.5 text-xs text-amber-300">
                      Esta orden ya fue enviada — es una devolución real, así que el motivo es obligatorio.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(false)
                      setReason('')
                    }}
                    disabled={refunding}
                    className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleRefund}
                    disabled={!canConfirmRefund}
                    className="rounded-full bg-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {refunding ? 'Procesando...' : 'Confirmar reembolso'}
                  </button>
                </div>
              </div>
            )
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              {order.status === 'REFUNDED'
                ? 'Esta orden ya fue reembolsada.'
                : 'Solo se pueden reembolsar órdenes pagadas, enviadas o entregadas.'}
            </p>
          )}
        </div>

        {/* Shared error for status-change and refund actions */}
        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {/* Order history */}
        <div className="mt-5">
          <h4 className="mb-2 text-sm font-semibold text-white">Historial</h4>
          {loadingHistory ? (
            <p className="text-sm text-slate-400">Cargando historial...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-500">Sin eventos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{event.type}</span>
                    <span className="text-xs text-slate-400">{formatDate(event.createdAt)}</span>
                  </div>
                  {event.reason ? (
                    <p className="mt-1 text-slate-400">Motivo: {event.reason}</p>
                  ) : null}
                  {event.actorClerkId ? (
                    <p className="mt-0.5 text-xs text-slate-500">Por: {event.actorClerkId}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
