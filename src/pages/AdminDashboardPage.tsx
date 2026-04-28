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
      <section className="space-y-6">
        <SectionTitle
          eyebrow="Acceso Restringido"
          title="Área exclusiva para administradores"
          description="Este panel solo está disponible para usuarios con permisos de administración."
        />
        <div className="rounded-3xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-orange-400/5 p-8 sm:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-400/20">
              <svg className="h-8 w-8 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-12V7m0 4V5m0 4v2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-amber-100">Acceso denegado</h2>
            <p className="mt-3 text-amber-50/80">Necesitas iniciar sesión como administrador para acceder a este panel.</p>
            <Link to="/login" className="mt-6 inline-flex rounded-full bg-amber-400/90 px-6 py-2.5 font-semibold text-slate-900 transition hover:bg-amber-300">
              Ir a inicio de sesión
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <AdminSidebar active={section} onChange={setSection} />

      <div className="space-y-6">
        <SectionTitle
          eyebrow="Panel de Control"
          title="Administración de FITGEAR"
          description="Gestiona catálogo, órdenes, usuarios y operaciones del e-commerce en tiempo real."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Productos" value={`${products.length}`} trend="En el catálogo" />
          <SummaryCard label="Órdenes" value={`${orders.length}`} trend="En procesamiento" />
          <SummaryCard label="Usuarios" value={`${users.length}`} trend="Registrados" />
          <SummaryCard label="Ingresos" value={formatCurrency(totalRevenue)} trend="Total de ventas" />
        </div>

        {loading ? (
          <p className="text-sm text-slate-300">Cargando panel de administración...</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>
        ) : null}

        {section === 'inventory' ? (
          <AdminInventorySection products={products} onRefreshProducts={refreshProducts} />
        ) : null}

        {(section === 'overview' || section === 'orders') && (
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">Órdenes recientes</h3>
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
            <h3 className="mb-4 text-lg font-semibold text-white">Usuarios registrados</h3>
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
