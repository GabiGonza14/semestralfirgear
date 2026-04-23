import { useEffect, useState } from 'react'
import { getMyOrders } from '../api/fitgearApi'
import { OrderCard } from '../components/orders/OrderCard'
import { SectionTitle } from '../components/SectionTitle'
import { useAuth } from '../context/AuthContext'
import type { BackendOrder } from '../types'

export function OrdersPage() {
  const { backendUser, isLoaded, syncError } = useAuth()
  const [orders, setOrders] = useState<BackendOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!backendUser?.id) {
      setLoading(false)
      setError(syncError ?? 'No se pudo identificar el usuario para consultar ordenes.')
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void getMyOrders(backendUser.id)
      .then((result) => {
        if (!active) {
          return
        }
        setOrders(result)
      })
      .catch((apiError: unknown) => {
        if (!active) {
          return
        }
        setError(apiError instanceof Error ? apiError.message : 'No se pudieron cargar tus ordenes.')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [backendUser?.id, isLoaded, syncError])

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