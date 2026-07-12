import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelOrder, createCheckoutSession, selfRefundOrder } from '../../api/fitgearApi'
import { useAuth } from '../../context/AuthContext'
import { queryKeys } from '../../lib/queryKeys'
import type { BackendOrder } from '../../types'
import { formatCurrency } from '../../utils/format'
import { OrderCancelConfirmModal } from './OrderCancelConfirmModal'
import { OrderItemRow } from './OrderItemRow'

function mutationErrorMessage(error: unknown, fallback: string): string | null {
  if (error instanceof Error) {
    return error.message
  }
  return error ? fallback : null
}

interface OrderCardProps {
  order: BackendOrder
}

// Customer-facing labels — distinct from the admin panel's own wording (e.g.
// SHIPPED reads "En camino" here vs "Enviado" for admins) since each audience
// needs different framing.
const STATUS_LABELS: Record<BackendOrder['status'], string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'En camino',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  FAILED: 'Fallido',
  REFUNDED: 'Devuelto',
}

// A REFUNDED order means different things depending on whether it ever
// shipped: no shippedAt means the customer cancelled it while still PAID (no
// logistics involved), so it reads "Cancelado y devuelto". Once it shipped,
// a refund is a real return, so it just reads "Devuelto".
function statusLabel(order: BackendOrder): string {
  if (order.status === 'REFUNDED' && !order.shippedAt) {
    return 'Cancelado y devuelto'
  }
  return STATUS_LABELS[order.status]
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

  if (status === 'CANCELLED' || status === 'FAILED') {
    return 'bg-white/[0.06] text-slate-400 ring-1 ring-white/10'
  }

  if (status === 'REFUNDED') {
    return 'bg-fuchsia-400/15 text-fuchsia-300 ring-1 ring-fuchsia-400/30'
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
  const { backendUser } = useAuth()
  const queryClient = useQueryClient()

  const totalProducts = useMemo(
    () => order.items.reduce((acc, item) => acc + item.quantity, 0),
    [order.items],
  )

  const isPending = order.status === 'PENDING'
  const isPaid = order.status === 'PAID'

  // Cancellation is only offered while the order is still PAID (hasn't
  // shipped yet) — once SHIPPED, the customer just sees it as "En camino"
  // with no self-service action.
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const invalidateOrders = async () => {
    if (backendUser?.id) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.byUser(backendUser.id) })
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(order.id) })
  }

  const retryCheckoutMutation = useMutation({
    mutationFn: () => createCheckoutSession({ orderId: order.id }),
    onSuccess: (session) => {
      window.location.assign(session.url)
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: () => cancelOrder(order.id),
    onSuccess: invalidateOrders,
  })

  // Cancel a PAID order — auto refunds via Stripe with no admin involvement.
  // Only reachable through the confirmation modal below.
  const selfRefundMutation = useMutation({
    mutationFn: () => selfRefundOrder(order.id),
    onSuccess: async () => {
      setSuccessMessage('Pago devuelto.')
      await invalidateOrders()
    },
  })

  const retryError = mutationErrorMessage(retryCheckoutMutation.error, 'No se pudo reintentar el pago.')
  const cancelError = mutationErrorMessage(cancelOrderMutation.error, 'No se pudo cancelar la orden.')

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

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusStyles(order.status)}`}>
              {statusLabel(order)}
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
          {order.status === 'REFUNDED' && order.refundReason ? (
            <p className="max-w-[220px] text-right text-xs text-slate-500">
              Motivo: {order.refundReason}
            </p>
          ) : null}
        </div>
      </div>

      {isPending ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            disabled={retryCheckoutMutation.isPending || cancelOrderMutation.isPending}
            onClick={() => retryCheckoutMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {retryCheckoutMutation.isPending ? 'Reintentando pago...' : 'Reintentar pago'}
          </button>
          <button
            type="button"
            disabled={retryCheckoutMutation.isPending || cancelOrderMutation.isPending}
            onClick={() => cancelOrderMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
          >
            {cancelOrderMutation.isPending ? 'Cancelando orden...' : 'Cancelar orden'}
          </button>
          {retryError ? <p className="w-full text-xs text-rose-300">{retryError}</p> : null}
          {cancelError ? <p className="w-full text-xs text-rose-300">{cancelError}</p> : null}
        </div>
      ) : null}

      {isPaid ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.07] pt-4">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-400/30 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/10"
          >
            Cancelar pedido
          </button>
        </div>
      ) : null}

      {order.status === 'REFUNDED' && successMessage ? (
        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.07] pt-4 text-sm font-semibold text-lime-300">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {successMessage}
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 space-y-3 border-t border-white/[0.07] pt-4">
          {order.items.map((item) => (
            <OrderItemRow key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      <OrderCancelConfirmModal
        isOpen={confirmOpen}
        message="¿Deseas cancelar este pedido? El pago será devuelto."
        confirmLabel="Cancelar pedido"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          await selfRefundMutation.mutateAsync()
        }}
      />
    </article>
  )
}
