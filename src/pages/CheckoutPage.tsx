import { useEffect, useMemo, useRef, useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { createOrder, createPaymentIntent } from '../api/fitgearApi'
import { CheckoutForm } from '../components/checkout/CheckoutForm'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useOrderDetailQuery } from '../hooks/useOrdersQueries'
import { gsap, prefersReducedMotion, useGSAP } from '../lib/gsap'
import {
  readPendingCheckoutOrder,
  writePendingCheckoutOrder,
} from '../lib/checkoutStorage'
import { fitgearStripeAppearance, stripePromise } from '../lib/stripeClient'
import { formatCurrency } from '../utils/format'

interface PaymentIntentState {
  clientSecret: string
  paymentIntentId: string
  amount: number
  subtotal: number
  taxAmount: number
  shippingAmount: number
}

export function CheckoutPage() {
  const search = useSearch({ strict: false }) as { orderId?: string }
  const explicitOrderId = search.orderId ?? null
  const { backendUser } = useAuth()
  const { items } = useCart()
  const navigate = useNavigate()

  const [orderId, setOrderId] = useState<string | null>(explicitOrderId)
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentState | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Guards against React 19 StrictMode's double-invoke in dev — this effect
  // creates an Order (a real side effect), so it must run at most once.
  const startedRef = useRef(false)

  const lineCount = useMemo(() => items.reduce((acc, item) => acc + item.quantity, 0), [items])

  const cartFingerprint = useMemo(
    () =>
      items
        .map((item) => `${item.product.id}:${item.size ?? ''}:${item.quantity}`)
        .sort()
        .join('|'),
    [items],
  )

  useEffect(() => {
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    async function start() {
      try {
        let activeOrderId = explicitOrderId

        if (!activeOrderId) {
          if (!backendUser) {
            setError('Debes iniciar sesion para continuar.')
            return
          }

          if (items.length === 0) {
            setError('Tu carrito esta vacio.')
            return
          }

          // Reuse the order from a previous visit if the cart hasn't changed
          // since — avoids piling up duplicate PENDING orders on back/forth
          // navigation, mirroring the dedup CartDrawer used to do in-memory.
          const pending = readPendingCheckoutOrder()
          if (pending && pending.fingerprint === cartFingerprint) {
            activeOrderId = pending.orderId
          } else {
            const order = await createOrder({
              userId: backendUser.id,
              items: items.map((item) => ({
                productId: item.product.id,
                quantity: item.quantity,
                size: item.size,
              })),
            })
            activeOrderId = order.id
            writePendingCheckoutOrder({ orderId: activeOrderId, fingerprint: cartFingerprint })
          }
        }

        setOrderId(activeOrderId)
        const intent = await createPaymentIntent({ orderId: activeOrderId })
        setPaymentIntent(intent)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.')
      }
    }

    void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Order-summary sidebar is driven by the actual persisted order (not the
  // live cart) — correct for both a fresh checkout AND a retry of an
  // existing order, whose contents may no longer match the current cart.
  const orderDetailQuery = useOrderDetailQuery(orderId, Boolean(orderId))
  const order = orderDetailQuery.data

  const contentRef = useRef<HTMLDivElement>(null)

  // The form column and the summary sidebar ease in together once the
  // PaymentIntent is ready — this only mounts once (the loading spinner
  // above gates it), so a plain on-mount tween is enough, no dependencies.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      if (!contentRef.current) return
      gsap.from(contentRef.current.children, {
        y: 24,
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.08,
        overwrite: true,
        clearProps: 'transform,opacity,visibility',
      })
    },
    { scope: contentRef },
  )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate({ to: '/shop' })}
          aria-label="Volver a la tienda"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-white/30 hover:bg-white/5"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {/* Rounded rhomboid badge: skew the box, counter-skew the text so it
            stays upright — same treatment as Shop's "Catálogo FITGEAR" title. */}
        <div className="inline-block -skew-x-12 rounded-xl bg-lime-400 px-2 py-2">
          <h1 className="skew-x-12 px-3 text-3xl font-black uppercase leading-none tracking-tight text-slate-950 sm:text-4xl">
            Completar compra
          </h1>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-400/20 bg-slate-900 p-10 text-center">
          <p className="text-base text-rose-300">{error}</p>
        </div>
      ) : !paymentIntent || !orderId ? (
        <div className="flex items-center gap-3 rounded-2xl border border-lime-400/20 bg-lime-400/10 px-6 py-5 text-base font-semibold text-lime-200">
          <span
            className="h-5 w-5 animate-spin rounded-full border-2 border-lime-400/30 border-t-lime-400"
            aria-hidden
          />
          Preparando tu pago...
        </div>
      ) : (
        <div ref={contentRef} className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: paymentIntent.clientSecret,
              appearance: fitgearStripeAppearance,
              locale: 'es',
            }}
          >
            <CheckoutForm orderId={orderId} paymentIntentId={paymentIntent.paymentIntentId} />
          </Elements>

          <aside className="h-fit rounded-3xl border border-white/[0.08] bg-slate-900 p-8 shadow-[0_0_60px_-25px_rgba(163,230,53,0.4)] lg:sticky lg:top-20">
            <h2 className="text-xl font-bold text-white">
              Resumen del pedido{lineCount > 0 ? ` (${lineCount})` : ''}
            </h2>
            <div className="mt-5 space-y-4">
              {order?.items.map((item) => (
                <div key={item.id} className="flex items-start gap-4 text-base">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-white to-slate-100">
                    {item.productImage ? (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="max-h-full max-w-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400">Sin imagen</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-200">{item.productName}</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Cant: {item.quantity}
                      {item.size ? ` · Talla ${item.size}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-300">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2.5 border-t border-white/[0.08] pt-5 text-base text-slate-400">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(paymentIntent.subtotal / 100)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Impuesto</span>
                <span>{formatCurrency(paymentIntent.taxAmount / 100)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Envío</span>
                <span>{formatCurrency(paymentIntent.shippingAmount / 100)}</span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-lime-400/10 px-5 py-4">
              <span className="text-base font-semibold text-lime-200">Total a pagar</span>
              <span className="text-2xl font-bold text-lime-300">
                {formatCurrency(paymentIntent.amount / 100)}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M7 11V7a5 5 0 0 1 10 0v4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Pago seguro y encriptado con Stripe
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
