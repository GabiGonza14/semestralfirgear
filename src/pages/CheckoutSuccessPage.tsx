import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../api/apiClient'
import { getButtonClassName } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useCheckoutPaymentConfirmationQuery } from '../hooks/usePaymentQueries'
import { queryKeys } from '../lib/queryKeys'

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const sessionId = searchParams.get('session_id')
  const { backendUser } = useAuth()
  const { clearCart } = useCart()
  const queryClient = useQueryClient()

  const confirmationQuery = useCheckoutPaymentConfirmationQuery(orderId, sessionId)

  const isPaid = confirmationQuery.data?.status === 'PAID'
  const isPendingConfirmation =
    confirmationQuery.error instanceof ApiError && confirmationQuery.error.status === 409

  useEffect(() => {
    if (!isPaid) {
      return
    }

    if (backendUser?.id) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.byUser(backendUser.id),
      })
    }

    if (orderId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      })
    }

    void queryClient.invalidateQueries({
      queryKey: queryKeys.orders.all,
    })

    void queryClient.invalidateQueries({
      queryKey: queryKeys.cart.all,
    })

    if (isPaid) {
      clearCart()
    }
  }, [backendUser?.id, clearCart, isPaid, orderId, queryClient])

  const paymentError =
    !orderId
      ? 'No se encontro la orden para confirmar el pago.'
      : isPendingConfirmation
        ? 'El pago aun se esta confirmando en Stripe. Puedes recargar en unos segundos.'
        : confirmationQuery.error instanceof Error
        ? confirmationQuery.error.message
        : confirmationQuery.error
          ? 'No se pudo confirmar el pago. Intenta recargar la pagina.'
          : null

  const title = isPaid ? 'Gracias por tu compra' : 'Estamos validando tu pago'
  const badge = isPaid ? 'Pago confirmado' : 'Confirmando pago'
  const description = isPaid
    ? 'Stripe confirmo el pago y la orden ya puede pasar al flujo logistico.'
    : 'Estamos sincronizando el estado de pago con el backend para dejar la orden al dia.'

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="rounded-3xl border border-lime-200 bg-white p-10 text-center shadow-[0_14px_34px_-24px_rgba(15,23,42,0.45)]"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-lime-700">{badge}</p>
      <h1 className="mt-3 text-4xl font-black text-slate-900">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
      {orderId ? (
        <p className="mt-2 text-sm text-slate-500">Orden: {orderId}</p>
      ) : null}
      {confirmationQuery.isLoading || confirmationQuery.isFetching ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime-500" aria-hidden />
          Confirmando pago y actualizando inventario...
        </div>
      ) : null}
      {paymentError ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{paymentError}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/shop"
          className={getButtonClassName()}
        >
          Seguir comprando
        </Link>
        <Link
          to="/account"
          className={getButtonClassName({ variant: 'secondary' })}
        >
          Ver mi cuenta
        </Link>
      </div>
    </motion.section>
  )
}
