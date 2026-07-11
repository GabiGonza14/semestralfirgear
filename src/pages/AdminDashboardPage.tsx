import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { getAdminMetrics, getOrders, getProducts, getUsers, type AdminMetrics } from '../api/fitgearApi'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminCategoriesSection } from '../components/admin/AdminCategoriesSection'
import { AdminInventorySection } from '../components/admin/AdminInventorySection'
import { AdminOrderDetailModal } from '../components/admin/AdminOrderDetailModal'
import { AdminOrdersSection } from '../components/admin/AdminOrdersSection'
import { AdminUsersSection } from '../components/admin/AdminUsersSection'
import { SummaryCard } from '../components/SummaryCard'
import { useAuth } from '../context/AuthContext'
import { isLowStock } from '../lib/inventory'
import type { BackendOrder, BackendUser, Product } from '../types'
import { formatCurrency, formatDate } from '../utils/format'

type AdminSection = 'overview' | 'inventory' | 'categories' | 'orders' | 'users'

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>('overview')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const { isAdmin, backendUser } = useAuth()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
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

    // Metrics come server-computed from /api/admin/metrics; the lists are still
    // needed for the orders/users tables and the inventory section.
    Promise.all([getAdminMetrics(), getProducts({ includeInactive: true }), getOrders(), getUsers()])
      .then(([metricsData, productsData, ordersData, usersData]) => {
        if (!active) {
          return
        }
        setMetrics(metricsData)
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

  // Derive the open order from the live list so it reflects status changes (e.g.
  // a refund flipping it to REFUNDED) without a second source of truth.
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  )

  // HU-46: low-stock count derived from the products already loaded above (no
  // extra fetch), using the same rule as the backend getLowStockProducts query.
  const lowStockCount = useMemo(
    () => products.filter((product) => isLowStock(product)).length,
    [products],
  )

  // Reload orders and metrics after a refund (a refund removes the order from
  // revenue, so the totals change too).
  const refreshOrdersAndMetrics = async () => {
    const [ordersData, metricsData] = await Promise.all([getOrders(), getAdminMetrics()])
    setOrders(ordersData)
    setMetrics(metricsData)
  }

  const refreshProducts = async () => {
    // Refresh metrics too: editing inventory/stock changes activeProductsCount.
    const [metricsData, productsData, ordersData, usersData] = await Promise.all([
      getAdminMetrics(),
      getProducts({ includeInactive: true }),
      getOrders(),
      getUsers(),
    ])

    setMetrics(metricsData)
    setProducts(productsData)
    setOrders(ordersData)
    setUsers(usersData)
  }

  if (!isAdmin) {
    return (
      <section className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-400">Acceso restringido</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
            Area exclusiva para administradores
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Este panel solo esta disponible para usuarios con permisos de administracion.
          </p>
        </div>
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
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Panel de control</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
            Administracion de FITGEAR
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">
            Gestiona catalogo, ordenes, usuarios y operaciones del e-commerce en tiempo real.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Productos" value={`${metrics?.activeProductsCount ?? 0}`} trend="Activos en el catálogo" />
          <SummaryCard label="Órdenes" value={`${metrics?.ordersCount ?? 0}`} trend="En procesamiento" />
          <SummaryCard label="Usuarios" value={`${metrics?.usersCount ?? 0}`} trend="Registrados" />
          <SummaryCard label="Ingresos" value={formatCurrency(metrics?.totalRevenue ?? 0)} trend="Total de ventas" />
          <SummaryCard label="Stock bajo" value={`${lowStockCount}`} trend="Productos por reabastecer" />
        </div>

        {section === 'overview' && lowStockCount > 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>
              {lowStockCount === 1
                ? '1 producto está en o por debajo de su umbral de stock. Revísalo en Inventario.'
                : `${lowStockCount} productos están en o por debajo de su umbral de stock. Revísalos en Inventario.`}
            </span>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-300">Cargando panel de administración...</p>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>
        ) : null}

        {section === 'inventory' ? (
          <AdminInventorySection products={products} onRefreshProducts={refreshProducts} />
        ) : null}

        {section === 'categories' ? <AdminCategoriesSection /> : null}

        {(section === 'overview' || section === 'orders') && (
          <AdminOrdersSection
            orders={orders}
            loading={loading}
            onSelectOrder={setSelectedOrderId}
            variant={section === 'orders' ? 'full' : 'overview'}
            onViewAll={() => setSection('orders')}
          />
        )}

        {section === 'overview' ? (
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <h3 className="mb-4 text-lg font-semibold text-white">Usuarios registrados</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm text-slate-300">
                <thead className="text-slate-400">
                  <tr>
                    <th className="pb-2">Nombre</th>
                    <th className="pb-2">Email</th>
                    <th className="pb-2">Rol</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2">Fecha de registro</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="py-2">{user.fullName}</td>
                      <td>{user.email}</td>
                      <td className="capitalize">{user.role.toLowerCase()}</td>
                      <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
                      <td>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {section === 'users' ? (
          <AdminUsersSection
            users={users}
            currentUserId={backendUser?.id}
            onRefresh={refreshProducts}
          />
        ) : null}
      </div>

      {selectedOrder ? (
        <AdminOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onUpdated={refreshOrdersAndMetrics}
        />
      ) : null}
    </div>
  )
}
