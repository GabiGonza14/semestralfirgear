import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { cancelOrder, createCheckoutSession } from '../api/fitgearApi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useOrderDetailQuery } from '../hooks/useOrdersQueries'
import { queryKeys } from '../lib/queryKeys'

export function CheckoutCancelPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { backendUser } = useAuth()
  const { openCart } = useCart()
  const queryClient = useQueryClient()

  const orderQuery = useOrderDetailQuery(orderId, Boolean(orderId))

  const canRetryPayment = orderQuery.data?.status === 'PENDING'

  const retryCheckoutMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) {
        throw new Error('No se encontro la orden para reintentar el pago.')
      }

      if (orderQuery.data?.status !== 'PENDING') {
        throw new Error('Solo se puede reintentar el pago para ordenes en estado PENDING.')
      }

      return createCheckoutSession({ orderId })
    },
    onSuccess: async (session) => {
      if (backendUser?.id) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.byUser(backendUser.id),
        })
      }

      if (orderId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(orderId),
        })
      }

      window.location.assign(session.url)
    },
  })

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) {
        throw new Error('No se encontro la orden para cancelar.')
      }

      if (orderQuery.data?.status !== 'PENDING') {
        throw new Error('Solo se puede cancelar una orden en estado PENDING.')
      }

      return cancelOrder(orderId)
    },
    onSuccess: async () => {
      if (backendUser?.id) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.byUser(backendUser.id),
        })
      }

      if (orderId) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(orderId),
        })
      }
    },
  })

  const retryError =
    retryCheckoutMutation.error instanceof Error
      ? retryCheckoutMutation.error.message
      : retryCheckoutMutation.error
        ? 'No se pudo reintentar el pago.'
        : null

  const cancelError =
    cancelOrderMutation.error instanceof Error
      ? cancelOrderMutation.error.message
      : cancelOrderMutation.error
        ? 'No se pudo cancelar la orden.'
        : null

  const orderStatusMessage =
    orderQuery.isLoading || orderQuery.isFetching
      ? 'Validando estado de la orden...'
      : orderQuery.data && orderQuery.data.status !== 'PENDING'
        ? orderQuery.data.status === 'CANCELLED'
          ? 'Esta orden ya fue cancelada.'
          : `La orden esta en estado ${orderQuery.data.status}. No se puede reintentar ni cancelar el checkout.`
        : null

  const retryDisabled =
    !orderId ||
    !canRetryPayment ||
    retryCheckoutMutation.isPending ||
    cancelOrderMutation.isPending ||
    orderQuery.isLoading ||
    orderQuery.isFetching

  const cancelDisabled =
    !orderId ||
    !canRetryPayment ||
    retryCheckoutMutation.isPending ||
    cancelOrderMutation.isPending ||
    orderQuery.isLoading ||
    orderQuery.isFetching

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-slate-900 p-10 text-center"
    >
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Pago cancelado</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">No se completo el pago</h1>
      <p className="mt-3 text-slate-400">
        Tu orden sigue en estado pendiente. Puedes volver al carrito y reintentar cuando quieras.
      </p>
      {orderId ? (
        <p className="mt-3 inline-block rounded-full bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-400">
          Orden pendiente: {orderId}
        </p>
      ) : null}
      {retryError ? (
        <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {retryError}
        </p>
      ) : null}
      {cancelError ? (
        <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {cancelError}
        </p>
      ) : null}
      {orderStatusMessage ? (
        <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {orderStatusMessage}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          disabled={retryDisabled}
          onClick={() => retryCheckoutMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {retryCheckoutMutation.isPending ? 'Reintentando pago...' : 'Reintentar pago'}
        </button>
        <button
          type="button"
          disabled={cancelDisabled}
          onClick={() => cancelOrderMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
        >
          {cancelOrderMutation.isPending ? 'Cancelando orden...' : 'Cancelar orden'}
        </button>
        <button
          type="button"
          onClick={openCart}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
        >
          Volver al carrito
        </button>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
        >
          Ir al shop
        </Link>
      </div>
    </motion.section>
  )
}
