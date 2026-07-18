import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { cancelOrder } from '../api/fitgearApi'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useOrderDetailQuery } from '../hooks/useOrdersQueries'
import { queryKeys } from '../lib/queryKeys'
import { getButtonClassName } from '../components/ui/Button'
import { CheckoutStatusHeader } from '../components/checkout/CheckoutStatusHeader'
import { sectionEnter } from '../lib/motion'

export function CheckoutCancelPage() {
  const search = useSearch({ strict: false }) as { orderId?: string }
  const orderId = search.orderId ?? null
  const { backendUser, isLoaded } = useAuth()
  const { openCart } = useCart()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  // Gate on isLoaded: the cancel page is also reached via a full-page Stripe
  // redirect, so the order lookup must wait until the auth token is ready.
  const orderQuery = useOrderDetailQuery(orderId, Boolean(orderId) && isLoaded)

  const canRetryPayment = orderQuery.data?.status === 'PENDING'

  // Order creation + PaymentIntent setup live on the /checkout page itself
  // (Stripe Elements, embedded) — retrying just navigates back there with the
  // same orderId instead of minting a new hosted Checkout session.
  const handleRetryPayment = () => {
    if (orderId) {
      void navigate({ to: '/checkout', search: { orderId } })
    }
  }

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) {
        throw new Error('No encontramos el pedido para cancelar.')
      }

      if (orderQuery.data?.status !== 'PENDING') {
        throw new Error('Solo puedes cancelar un pedido pendiente.')
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

  const cancelError =
    cancelOrderMutation.error instanceof Error
      ? cancelOrderMutation.error.message
      : cancelOrderMutation.error
        ? 'No pudimos cancelar el pedido.'
        : null

  const orderStatusMessage =
    orderQuery.isLoading || orderQuery.isFetching
      ? 'Validando el estado de tu pedido...'
      : orderQuery.data && orderQuery.data.status !== 'PENDING'
        ? orderQuery.data.status === 'CANCELLED'
          ? 'Este pedido ya fue cancelado.'
          : `Tu pedido está en estado ${orderQuery.data.status}. Ya no se puede reintentar ni cancelar el pago.`
        : null

  const retryDisabled =
    !orderId ||
    !canRetryPayment ||
    cancelOrderMutation.isPending ||
    orderQuery.isLoading ||
    orderQuery.isFetching

  const cancelDisabled =
    !orderId ||
    !canRetryPayment ||
    cancelOrderMutation.isPending ||
    orderQuery.isLoading ||
    orderQuery.isFetching

  return (
    <motion.section
      {...sectionEnter}
      className="mx-auto max-w-xl rounded-3xl border border-white/[0.08] bg-slate-900 p-10 text-center"
    >
      <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <CheckoutStatusHeader
        badge="Pago cancelado"
        badgeClassName="text-slate-400"
        title="No se completó el pago"
        description="Tu pedido sigue pendiente. Puedes volver al carrito y reintentar cuando quieras."
        pillLabel={orderId ? `Pedido pendiente: ${orderId}` : undefined}
      />
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
          onClick={handleRetryPayment}
          className={getButtonClassName({ variant: 'primary' })}
        >
          Reintentar pago
        </button>
        <button
          type="button"
          disabled={cancelDisabled}
          onClick={() => cancelOrderMutation.mutate()}
          className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 px-6 py-3 text-sm font-semibold text-rose-300 transition hover:border-rose-400/60 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-500"
        >
          {cancelOrderMutation.isPending ? 'Cancelando pedido...' : 'Cancelar pedido'}
        </button>
        <button type="button" onClick={openCart} className={getButtonClassName({ variant: 'ghost' })}>
          Volver al carrito
        </button>
        <Link to="/shop" className={getButtonClassName({ variant: 'ghost' })}>
          Ir al shop
        </Link>
      </div>
    </motion.section>
  )
}
