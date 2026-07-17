import { useEffect, useRef, useState } from 'react'
import { OrderCard } from '../components/orders/OrderCard'
import { useAuth } from '../context/AuthContext'
import { useMyOrdersQuery } from '../hooks/useOrdersQueries'

const PAGE_SIZE = 10

export function OrdersPage() {
  const { backendUser, isLoaded, syncError } = useAuth()
  const ordersQuery = useMyOrdersQuery(backendUser?.id ?? null, isLoaded)
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)

  const loading = isLoaded ? ordersQuery.isLoading : true

  const error =
    !isLoaded
      ? null
      : !backendUser?.id
        ? syncError ?? 'No pudimos identificar tu cuenta para mostrar tus pedidos.'
        : ordersQuery.error instanceof Error
          ? ordersQuery.error.message
          : ordersQuery.error
            ? 'No pudimos cargar tus pedidos. Vuelve a intentarlo en un momento.'
            : null

  // Pendientes, pagadas, enviadas, entregadas, canceladas y devueltas se
  // muestran en "Mis pedidos" — solo las de pago fallido quedan fuera de esta
  // vista por decision de producto.
  const VISIBLE_STATUSES = new Set([
    'PENDING',
    'PAID',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ])
  const orders = (ordersQuery.data ?? []).filter((order) => VISIBLE_STATUSES.has(order.status))

  const pageCount = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))

  // Keep the page in range if the result set shrinks below it (e.g. after a
  // refund/cancel invalidates the list).
  useEffect(() => {
    setPage((current) => Math.min(current, pageCount))
  }, [pageCount])

  const paginatedOrders = orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goToPage = (nextPage: number) => {
    setPage(nextPage)
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Mis pedidos</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Historial de compras</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Consulta el estado de cada pedido y revisa el detalle de productos comprados.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-slate-900"
            />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-5 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/[0.08] bg-slate-900/60 px-6 py-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-white">Sin pedidos aún</p>
            <p className="mt-1 text-sm text-slate-400">
              Cuando completes una compra, tus pedidos aparecerán aquí. Mientras tanto, explora el catálogo y arma tu equipo.
            </p>
          </div>
        </div>
      ) : null}

      {!loading && !error && orders.length > 0 ? (
        <div ref={listRef} className="scroll-mt-24 space-y-4">
          {paginatedOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : null}

      {!loading && !error && pageCount > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page === 1}
            aria-label="Página anterior"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => goToPage(pageNumber)}
              aria-current={pageNumber === page}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition ${
                pageNumber === page
                  ? 'bg-lime-400 text-slate-900'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pageNumber}
            </button>
          ))}

          <button
            type="button"
            onClick={() => goToPage(Math.min(pageCount, page + 1))}
            disabled={page === pageCount}
            aria-label="Página siguiente"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </section>
  )
}
