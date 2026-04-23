import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, getProducts, getUsers } from '../api/fitgearApi'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminInventorySection } from '../components/admin/AdminInventorySection'
import { SectionTitle } from '../components/SectionTitle'
import { SummaryCard } from '../components/SummaryCard'
import { useAuth } from '../context/AuthContext'
import type { BackendOrder, BackendUser, Product } from '../types'
import { formatCurrency } from '../utils/format'

type AdminSection = 'overview' | 'inventory' | 'orders' | 'users'

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>('overview')
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<BackendOrder[]>([])
  const [users, setUsers] = useState<BackendUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    let active = true
    setLoading(true)

    Promise.all([getProducts(), getOrders(), getUsers()])
      .then(([productsData, ordersData, usersData]) => {
        if (!active) {
          return
        }
        setProducts(productsData)
        setOrders(ordersData)
        setUsers(usersData)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.')
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [isAdmin])

  const totalRevenue = useMemo(
    () => orders.reduce((acc, order) => acc + order.totalAmount, 0),
    [orders],
  )

  const refreshProducts = async () => {
    const [productsData, ordersData, usersData] = await Promise.all([
      getProducts(),
      getOrders(),
      getUsers(),
    ])

    setProducts(productsData)
    setOrders(ordersData)
    setUsers(usersData)
  }

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-8 text-center">
        <h1 className="text-2xl font-bold text-amber-100">Acceso solo para admin</h1>
        <p className="mt-2 text-amber-50/90">Inicia sesion como admin para configurar el sistema.</p>
        <Link to="/login" className="mt-5 inline-flex text-amber-200 underline">
          Ir a login
        </Link>
      </section>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <AdminSidebar active={section} onChange={setSection} />

      <div className="space-y-6">
        <SectionTitle
          eyebrow="Admin Dashboard"
          title="Control total de FITGEAR"
          description="Panel para administrar catalogo, ordenes, usuarios y configuraciones del e-commerce."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Productos" value={`${products.length}`} trend="+3 este mes" />
          <SummaryCard label="Ordenes" value={`${orders.length}`} trend="Operacion activa" />
          <SummaryCard label="Usuarios" value={`${users.length}`} trend="Crecimiento sostenido" />
          <SummaryCard label="Ventas" value={formatCurrency(totalRevenue)} trend="Data backend" />
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Cargando datos del dashboard...</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>
        ) : null}

        {section === 'inventory' ? (
          <AdminInventorySection products={products} onRefreshProducts={refreshProducts} />
        ) : null}

        {(section === 'overview' || section === 'orders') && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">Ordenes</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm text-slate-300">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-t border-white/10">
                      <td className="py-2">{order.id}</td>
                      <td>{order.customerName ?? order.userId}</td>
                      <td className="capitalize">{order.status.toLowerCase()}</td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(section === 'overview' || section === 'users') && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">Usuarios</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm text-slate-300">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-2">Nombre</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="py-2">{user.fullName}</td>
                      <td>{user.email}</td>
                      <td className="capitalize">{user.role.toLowerCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
