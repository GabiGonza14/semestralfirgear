import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createCheckoutSession, createOrder } from '../api/fitgearApi'
import { CartItem } from '../components/CartItem'
import { SectionTitle } from '../components/SectionTitle'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/format'

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
  const [checkoutLoading, setCheckoutLoading] = useState(false)
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

  if (!items.length) {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center">
        <h1 className="text-3xl font-bold text-white">Tu carrito está vacío</h1>
        <p className="mt-3 text-slate-300">Explora accesorios y arma tu kit de entrenamiento ideal.</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-950"
        >
          Ir al Shop
        </Link>
      </section>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <SectionTitle
          eyebrow="Carrito"
          title="Tu compra"
          description="Ajusta cantidades y revisa el resumen antes de crear la orden real."
        />
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
      </section>

      <aside className="h-fit rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="text-xl font-semibold text-white">Resumen</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p className="flex justify-between">
            <span>Items</span>
            <span>{lineCount}</span>
          </p>
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Impuesto (7%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </p>
          <p className="flex justify-between">
            <span>Envío</span>
            <span>{shippingAmount > 0 ? formatCurrency(shippingAmount) : 'Gratis'}</span>
          </p>
          <p className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold text-white">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </p>
        </div>

        <button
          disabled={checkoutLoading}
          onClick={() => {
            if (!backendUser) {
              setCheckoutError('Debes iniciar sesion para crear una orden.')
              return
            }

            setCheckoutLoading(true)
            setCheckoutError(null)

            let activeOrderId = canReusePendingOrder ? pendingOrderId : null

            const getOrderPromise = activeOrderId
              ? Promise.resolve(activeOrderId)
              : createOrder({
                  userId: backendUser.id,
                  items: items.map((item) => ({
                    productId: item.product.id,
                    quantity: item.quantity,
                  })),
                }).then((order) => {
                  setPendingOrderId(order.id)
                  setPendingFingerprint(cartFingerprint)
                  return order.id
                })

            void getOrderPromise
              .then((orderId) => {
                activeOrderId = orderId
                return createCheckoutSession({ orderId })
              })
              .then((session) => {
                window.location.assign(session.url)
              })
              .catch((error: unknown) => {
                setCheckoutError(error instanceof Error ? error.message : 'No se pudo crear la orden.')
              })
              .finally(() => {
                setCheckoutLoading(false)
              })
          }}
          className="mt-5 w-full rounded-full bg-lime-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-300"
        >
          {checkoutLoading
            ? 'Redirigiendo a Stripe...'
            : canReusePendingOrder
              ? 'Reintentar pago'
              : 'Pagar con tarjeta'}
        </button>

        {checkoutError ? (
          <p className="mt-3 text-sm text-rose-200">{checkoutError}</p>
        ) : null}

        <p className="mt-3 text-xs text-slate-400">
          Se crea una orden en estado PENDING y luego se abre Stripe Checkout para completar el pago.
        </p>
      </aside>
    </div>
  )
}
