import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { createCheckoutSession, createOrder } from '../../api/fitgearApi'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { queryKeys } from '../../lib/queryKeys'
import { CartItem } from '../CartItem'
import { OrderSummary } from './OrderSummary'

export function CartDrawer() {
  const {
    items,
    subtotal,
    taxAmount,
    shippingAmount,
    total,
    isCartOpen,
    closeCart,
    increase,
    decrease,
    removeItem,
    removedOnRestore,
    dismissRemovedNotice,
  } = useCart()
  const { backendUser } = useAuth()
  const queryClient = useQueryClient()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null)

  const lineCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

  const cartFingerprint = useMemo(
    () =>
      items
        .map((item) => `${item.product.id}:${item.size ?? ''}:${item.quantity}`)
        .sort()
        .join('|'),
    [items],
  )

  const canReusePendingOrder = pendingOrderId !== null && pendingFingerprint === cartFingerprint

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!backendUser) {
        throw new Error('Debes iniciar sesión para crear un pedido.')
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
      setCheckoutError(error instanceof Error ? error.message : 'No pudimos crear tu pedido.')
    },
  })

  // Escape closes the drawer.
  useEffect(() => {
    if (!isCartOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCartOpen, closeCart])

  // Lock page scroll behind the drawer while it's open.
  useEffect(() => {
    if (!isCartOpen) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isCartOpen])

  return (
    <AnimatePresence>
      {isCartOpen ? (
        <div className="fixed inset-0 z-[60]">
          <motion.button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 h-full w-full cursor-default bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-slate-950"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <h2 className="text-lg font-bold text-white">
                Tu carrito{lineCount > 0 ? ` (${lineCount})` : ''}
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Cerrar"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 text-slate-300 transition hover:border-white/30 hover:bg-white/5"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {removedOnRestore.length > 0 ? (
              <div className="shrink-0 border-b border-amber-400/20 bg-amber-400/10 px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-amber-200">
                    <p className="font-semibold">Algunos productos ya no están disponibles</p>
                    <p className="mt-1 text-amber-200/80">
                      Quitamos de tu carrito: {removedOnRestore.map((line) => line.name).join(', ')}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissRemovedNotice}
                    aria-label="Descartar aviso"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/30 text-amber-200 transition hover:bg-amber-400/15"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : null}

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="10" cy="20" r="1.4" fill="currentColor" />
                    <circle cx="18" cy="20" r="1.4" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Tu carrito está vacío</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Explora accesorios y arma tu kit de entrenamiento ideal.
                  </p>
                </div>
                <Link
                  to="/shop"
                  onClick={closeCart}
                  className="mt-1 inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
                >
                  Ir a la tienda
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
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
                </div>

                <div className="shrink-0 p-4">
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
                </div>
              </>
            )}
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
