import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { createCheckoutSession } from '../api/fitgearApi'
import { Button, getButtonClassName } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useOrderDetailQuery } from '../hooks/useOrdersQueries'
import { queryKeys } from '../lib/queryKeys'

export function CheckoutCancelPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { backendUser } = useAuth()
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

  const retryError =
    retryCheckoutMutation.error instanceof Error
      ? retryCheckoutMutation.error.message
      : retryCheckoutMutation.error
        ? 'No se pudo reintentar el pago.'
        : null

  const orderStatusMessage =
    orderQuery.isLoading || orderQuery.isFetching
      ? 'Validando estado de la orden antes de reintentar...'
      : orderQuery.data && orderQuery.data.status !== 'PENDING'
        ? `La orden esta en estado ${orderQuery.data.status}. No se puede reintentar el checkout.`
        : null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_14px_34px_-24px_rgba(15,23,42,0.45)]"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pago cancelado</p>
      <h1 className="mt-3 text-4xl font-black text-slate-900">No se completo el pago</h1>
      <p className="mt-3 text-slate-600">
        Tu orden sigue en estado pendiente. Puedes volver al carrito y reintentar cuando quieras.
      </p>
      {orderId ? (
        <p className="mt-2 text-sm text-slate-500">Orden pendiente: {orderId}</p>
      ) : null}
      {retryError ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{retryError}</p>
      ) : null}
      {orderStatusMessage ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{orderStatusMessage}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          disabled={!orderId || !canRetryPayment || retryCheckoutMutation.isPending || orderQuery.isLoading || orderQuery.isFetching}
          onClick={() => retryCheckoutMutation.mutate()}
        >
          {retryCheckoutMutation.isPending ? 'Reintentando pago...' : 'Reintentar pago'}
        </Button>
        <Link
          to="/cart"
          className={getButtonClassName({ variant: 'secondary' })}
        >
          Volver al carrito
        </Link>
        <Link
          to="/shop"
          className={getButtonClassName({ variant: 'secondary' })}
        >
          Ir al shop
        </Link>
      </div>
    </motion.section>
  )
}
