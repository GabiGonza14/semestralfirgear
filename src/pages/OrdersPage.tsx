import { OrderCard } from '../components/orders/OrderCard'
import { SectionTitle } from '../components/SectionTitle'
import { useAuth } from '../context/AuthContext'
import { useMyOrdersQuery } from '../hooks/useOrdersQueries'

export function OrdersPage() {
  const { backendUser, isLoaded, syncError } = useAuth()
  const ordersQuery = useMyOrdersQuery(backendUser?.id ?? null, isLoaded)

  const loading = isLoaded ? ordersQuery.isLoading : true

  const error =
    !isLoaded
      ? null
      : !backendUser?.id
        ? syncError ?? 'No se pudo identificar el usuario para consultar ordenes.'
        : ordersQuery.error instanceof Error
          ? ordersQuery.error.message
          : ordersQuery.error
            ? 'No se pudieron cargar tus ordenes.'
            : null

  const orders = ordersQuery.data ?? []

  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Mis ordenes"
        title="Historial de compras"
        description="Consulta el estado de cada pedido y revisa el detalle de productos comprados."
      />

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          Cargando tus ordenes...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {!loading && !error && orders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          No tienes ordenes aun.
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : null}
    </section>
  )
}