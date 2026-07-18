import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link, useSearch } from '@tanstack/react-router'
import { ApiError } from '../api/apiClient'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useOrderDetailQuery } from '../hooks/useOrdersQueries'
import { usePaymentConfirmationQuery } from '../hooks/usePaymentQueries'
import { queryKeys } from '../lib/queryKeys'
import { Button } from '../components/ui/Button'
import { CheckoutStatusHeader } from '../components/checkout/CheckoutStatusHeader'
import { sectionEnter, staggerContainer, staggerItem } from '../lib/motion'

export function CheckoutSuccessPage() {
  const search = useSearch({ strict: false }) as { orderId?: string; payment_intent?: string }
  const orderId = search.orderId ?? null
  const paymentIntentId = search.payment_intent ?? null
  const { backendUser, isLoaded } = useAuth()
  const { clearCart } = useCart()
  const queryClient = useQueryClient()

  const confirmationQuery = usePaymentConfirmationQuery(orderId, paymentIntentId, isLoaded)

  const isPaid = confirmationQuery.data?.status === 'PAID'
  const isPendingConfirmation =
    confirmationQuery.error instanceof ApiError && confirmationQuery.error.status === 409

  // Fetched once paid, purely to offer "Reseñar" shortcuts for what was just
  // bought — not needed for the payment-confirmation flow itself. Also gated on
  // `isLoaded`: this page loads via a full-page Stripe redirect, so firing
  // before Clerk's token getter is registered would 401 (see
  // useCheckoutPaymentConfirmationQuery's authReady comment).
  const orderDetailQuery = useOrderDetailQuery(orderId, isPaid && isLoaded)
  const reviewableProducts = useMemo(() => {
    const items = orderDetailQuery.data?.items ?? []
    const byProduct = new Map<string, string>()
    for (const item of items) {
      if (item.productId) {
        byProduct.set(item.productId, item.productName)
      }
    }
    return Array.from(byProduct, ([id, name]) => ({ id, name }))
  }, [orderDetailQuery.data])

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
      ? 'No encontramos el pedido para confirmar el pago.'
      : isPendingConfirmation
        ? 'El pago aún se está confirmando. Puedes recargar en unos segundos.'
        : confirmationQuery.error instanceof Error
        ? confirmationQuery.error.message
        : confirmationQuery.error
          ? 'No pudimos confirmar el pago. Intenta recargar la página.'
          : null

  const title = isPaid ? 'Gracias por tu compra' : 'Estamos validando tu pago'
  const badge = isPaid ? 'Pago confirmado' : 'Confirmando pago'
  const description = isPaid
    ? 'Confirmamos tu pago. Ya estamos preparando tu pedido para el envío.'
    : 'Estamos confirmando tu pago. En un momento verás tu pedido actualizado.'

  return (
    <motion.section
      {...sectionEnter}
      className="mx-auto max-w-xl rounded-3xl border border-lime-400/20 bg-slate-900 p-10 text-center"
    >
      <div
        className={`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl ${
          isPaid ? 'bg-lime-400/15 text-lime-400' : 'bg-white/[0.04] text-slate-400'
        }`}
      >
        {isPaid ? (
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-lime-400" aria-hidden />
        )}
      </div>

      <CheckoutStatusHeader
        badge={badge}
        title={title}
        description={description}
        pillLabel={orderId ? `Pedido: ${orderId}` : undefined}
      />
      {confirmationQuery.isLoading || confirmationQuery.isFetching ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-lime-400" aria-hidden />
          Confirmando tu pago...
        </div>
      ) : null}
      {paymentError ? (
        <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {paymentError}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => window.location.assign('/shop')}>Seguir comprando</Button>
        <Button variant="ghost" onClick={() => window.location.assign('/orders')}>
          Ver mis pedidos
        </Button>
      </div>

      {isPaid && reviewableProducts.length > 0 ? (
        <div className="mt-8 border-t border-white/[0.06] pt-6">
          <p className="text-sm text-slate-400">¿Qué te pareció tu compra?</p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="mt-3 flex flex-wrap items-center justify-center gap-2"
          >
            {reviewableProducts.map((product) => (
              <motion.div key={product.id} variants={staggerItem}>
                <Link
                  to="/product/$id"
                  params={{ id: product.id }}
                  className="inline-flex items-center gap-2 rounded-full border border-lime-400/25 px-4 py-2 text-xs font-semibold text-lime-300 transition hover:border-lime-400/50 hover:bg-lime-400/10"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5-4.7-4.6 6.5-.9L12 2.5z" />
                  </svg>
                  Reseñar {product.name}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ) : null}
    </motion.section>
  )
}
