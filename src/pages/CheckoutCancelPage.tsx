import { Link, useSearchParams } from 'react-router-dom'

export function CheckoutCancelPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <section className="rounded-3xl border border-amber-300/30 bg-amber-900/20 p-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Pago cancelado</p>
      <h1 className="mt-3 text-4xl font-black text-white">No se completo el pago</h1>
      <p className="mt-3 text-slate-200">
        Tu orden sigue en estado pendiente. Puedes volver al carrito y reintentar cuando quieras.
      </p>
      {orderId ? (
        <p className="mt-2 text-sm text-slate-300">Orden pendiente: {orderId}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/cart"
          className="inline-flex rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-950"
        >
          Volver al carrito
        </Link>
        <Link
          to="/shop"
          className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
        >
          Ir al shop
        </Link>
      </div>
    </section>
  )
}
