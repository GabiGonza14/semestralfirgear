import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { createCheckoutSession, createOrder } from '../api/fitgearApi'
import { CartItem } from '../components/CartItem'
import { OrderSummary } from '../components/cart/OrderSummary'
import { SectionTitle } from '../components/SectionTitle'
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
    () => items.map((item) => `${item.product.id}:${item.quantity}`).sort().join('|'),
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
        className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)]"
      >
        <h1 className="text-3xl font-bold text-slate-900">Tu carrito está vacío</h1>
        <p className="mt-3 text-slate-600">Explora accesorios y arma tu kit de entrenamiento ideal.</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-lime-300"
        >
          Ir al Shop
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
        <SectionTitle
          eyebrow="Carrito"
          title="Tu compra"
          description="Ajusta cantidades y revisa el resumen antes de crear la orden real."
        />
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <CartItem
              key={item.product.id}
              product={item.product}
              quantity={item.quantity}
              onIncrease={() => increase(item.product.id)}
              onDecrease={() => decrease(item.product.id)}
              onRemove={() => removeItem(item.product.id)}
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
