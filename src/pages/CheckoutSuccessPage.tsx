import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmCheckoutPayment } from '../api/fitgearApi'
import { useCart } from '../context/CartContext'

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const sessionId = searchParams.get('session_id')
  const { clearCart } = useCart()
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(true)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!orderId) {
      setPaymentError('No se encontro la orden para confirmar el pago.')
      setIsConfirmingPayment(false)
      return () => {
        active = false
      }
    }

    setIsConfirmingPayment(true)
    setPaymentError(null)

    void confirmCheckoutPayment({
      orderId,
      sessionId: sessionId ?? undefined,
    })
      .then(() => {
        if (!active) {
          return
        }
        clearCart()
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        setPaymentError(
          error instanceof Error
            ? error.message
            : 'No se pudo confirmar el pago. Intenta recargar la pagina.',
        )
      })
      .finally(() => {
        if (active) {
          setIsConfirmingPayment(false)
        }
      })

    return () => {
      active = false
    }
  }, [orderId, sessionId])

  return (
    <section className="rounded-3xl border border-emerald-300/30 bg-emerald-900/20 p-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Pago confirmado</p>
      <h1 className="mt-3 text-4xl font-black text-white">Gracias por tu compra</h1>
      <p className="mt-3 text-slate-200">
        Stripe confirmo el pago y la orden ya puede pasar al flujo logistico.
      </p>
      {orderId ? (
        <p className="mt-2 text-sm text-slate-300">Orden: {orderId}</p>
      ) : null}
      {isConfirmingPayment ? (
        <p className="mt-2 text-sm text-slate-300">Confirmando pago y actualizando inventario...</p>
      ) : null}
      {paymentError ? (
        <p className="mt-2 text-sm text-rose-200">{paymentError}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/shop"
          className="inline-flex rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-950"
        >
          Seguir comprando
        </Link>
        <Link
          to="/account"
          className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
        >
          Ver mi cuenta
        </Link>
      </div>
    </section>
  )
}
