import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { createCheckoutSession, createOrder } from '../api/fitgearApi'
import { CartItem } from '../components/CartItem'
import { OrderSummary } from '../components/cart/OrderSummary'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { queryKeys } from '../lib/queryKeys'

export function CartPage() {
  const {
    items,
    subtotal,
    taxAmount,
    shippingAmount,
    total,
    increase,
    decrease,
    removeItem,
  } = useCart()
  const { backendUser } = useAuth()
  const queryClient = useQueryClient()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)

  const lineCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items],
  )

  const cartFingerprint = useMemo(
    () =>
      items
        .map((item) => `${item.product.id}:${item.size ?? ''}:${item.quantity}`)
        .sort()
        .join('|'),
    [items],
  )

  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null)

  const canReusePendingOrder =
    pendingOrderId !== null && pendingFingerprint === cartFingerprint

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!backendUser) {
        throw new Error('Debes iniciar sesion para crear una orden.')
      }

      const activeOrderId = canReusePendingOrder
        ? pendingOrderId
        : (
            await createOrder({
              userId: backendUser.id,
              items: items.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                size: item.size,
              })),
            })
          ).id

      if (!canReusePendingOrder) {
        setPendingOrderId(activeOrderId)
        setPendingFingerprint(cartFingerprint)
      }

      return createCheckoutSession({ orderId: activeOrderId })
    },
    onMutate: () => {
      setCheckoutError(null)
    },
    onSuccess: async (session) => {
      if (backendUser?.id) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.orders.byUser(backendUser.id),
        })
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.cart.all,
      })

      window.location.assign(session.url)
    },
    onError: (error: unknown) => {
      setCheckoutError(error instanceof Error ? error.message : 'No se pudo crear la orden.')
    },
  })

  if (!items.length) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 rounded-3xl border border-white/[0.08] bg-slate-900/60 px-6 py-16 text-center"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="20" r="1.4" fill="currentColor" />
            <circle cx="18" cy="20" r="1.4" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Tu carrito esta vacio</h1>
          <p className="mt-2 text-slate-400">
            Explora accesorios y arma tu kit de entrenamiento ideal.
          </p>
        </div>
        <Link
          to="/shop"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-lime-400 px-7 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
        >
          Ir al Shop
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </motion.section>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="grid gap-8 lg:grid-cols-[1fr_360px]"
    >
      <section className="space-y-4">
        <div className="mb-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Carrito</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Tu compra</h1>
          <p className="mt-2 text-slate-400">
            Ajusta cantidades y revisa el resumen antes de crear la orden real.
          </p>
        </div>
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <CartItem
              key={`${item.product.id}-${item.size ?? ''}`}
              product={item.product}
              quantity={item.quantity}
              size={item.size}
              onIncrease={() => increase(item.product.id, item.size)}
              onDecrease={() => decrease(item.product.id, item.size)}
              onRemove={() => removeItem(item.product.id, item.size)}
            />
          ))}
        </AnimatePresence>
      </section>

      <OrderSummary
        lineCount={lineCount}
        subtotal={subtotal}
        taxAmount={taxAmount}
        shippingAmount={shippingAmount}
        total={total}
        checkoutPending={checkoutMutation.isPending}
        canReusePendingOrder={canReusePendingOrder}
        checkoutError={checkoutError}
        onCheckout={() => checkoutMutation.mutate()}
      />
    </motion.div>
  )
}
