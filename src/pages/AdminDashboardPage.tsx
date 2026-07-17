import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  getAdminMetrics,
  getCategories,
  getOrders,
  getProducts,
  getUsers,
  type AdminMetrics,
  type MongoCategory,
} from '../api/fitgearApi'
import { AdminSidebar } from '../components/AdminSidebar'
import { AdminAuditSection } from '../components/admin/AdminAuditSection'
import { AdminCategoriesSection } from '../components/admin/AdminCategoriesSection'
import { AdminInventorySection } from '../components/admin/AdminInventorySection'
import { AdminOrderDetailModal } from '../components/admin/AdminOrderDetailModal'
import { AdminOrdersSection } from '../components/admin/AdminOrdersSection'
import { AdminReviewsSection } from '../components/admin/AdminReviewsSection'
import { AdminUsersSection } from '../components/admin/AdminUsersSection'
import { SummaryCard } from '../components/SummaryCard'
import { useAuth } from '../context/AuthContext'
import { isLowStock } from '../lib/inventory'
import type { BackendOrder, BackendUser, Category, Product } from '../types'
import { formatCurrency, formatDate } from '../utils/format'
import { ROLE_LABELS } from '../utils/userRoleLabels'

function mapCategories(raw: MongoCategory[]): Category[] {
  return raw.map((category) => ({
    id: category._id,
    name: category.name,
    description: category.description,
    requiresSizes: category.requiresSizes,
  }))
}

type AdminSection =
  | 'overview'
  | 'inventory'
  | 'categories'
  | 'orders'
  | 'users'
  | 'reviews'
  | 'audit'

const USERS_OVERVIEW_LIMIT = 6

// Keeps a section mounted once it's been visited, toggling only its visibility
// afterwards. This makes returning to a section instant — its already-fetched
// data and local state (filters, pagination) survive instead of re-fetching on
// every switch. Uses the `hidden` attribute (not a class) so the parent's
// `space-y` margins skip it while inactive.
function KeepAlive({
  active,
  visited,
  children,
}: {
  active: boolean
  visited: boolean
  children: ReactNode
}) {
  if (!visited) {
    return null
  }
  return <div hidden={!active}>{children}</div>
}

export function AdminDashboardPage() {
  const [section, setSection] = useState<AdminSection>('overview')
  // Sections the user has opened at least once — drives KeepAlive so revisiting
  // one is instant (no remount/refetch). Overview is "visited" from the start.
  const [visited, setVisited] = useState<Set<AdminSection>>(() => new Set(['overview']))
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const { isAdmin, backendUser } = useAuth()
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<BackendOrder[]>([])
  const [users, setUsers] = useState<BackendUser[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    let active = true
    setLoading(true)

    // Overview-critical data (summary cards + recent orders + users table)
    // resolves the panel's loading gate on its own. Metrics are server-computed
    // from /api/admin/metrics.
    Promise.all([getAdminMetrics(), getOrders(), getUsers()])
      .then(([metricsData, ordersData, usersData]) => {
        if (!active) {
          return
        }
        setMetrics(metricsData)
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

    // Products is a separate, often-larger fetch (full catalog incl. inactive)
    // only needed for the low-stock count and the Inventario section, so it
    // loads in parallel WITHOUT blocking the overview above.
    getProducts({ includeInactive: true })
      .then((productsData) => {
        if (active) {
          setProducts(productsData)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.')
        }
      })

    // Categories, shared by Inventario (selector + filtro) and Categorías
    // (gestión + conteo por categoría) — fetched once here, at the dashboard
    // level, so both sections stay in sync with each other and with a single
    // source of truth instead of each fetching its own now-independently-stale
    // copy (a category created in one tab used to never appear in the other
    // without a full page reload).
    getCategories()
      .then((categoriesData) => {
        if (active) {
          setCategories(mapCategories(categoriesData))
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar las categorias.')
        }
      })

    return () => {
      active = false
    }
  }, [isAdmin])

  // Mark a section visited the first time it becomes active, so KeepAlive keeps
  // it mounted from then on.
  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(section)) {
        return prev
      }
      const next = new Set(prev)
      next.add(section)
      return next
    })
  }, [section])

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

  // A customer placing an order happens in a completely different browser
  // session — nothing here re-fetches on its own when that happens, so
  // without this poll a new order only ever showed up after a manual page
  // reload. Runs while the panel is open, independent of which tab is active
  // (Overview and Ordenes both render AdminOrdersSection off this same state).
  useEffect(() => {
    if (!isAdmin) {
      return
    }

    const intervalId = window.setInterval(() => {
      void refreshOrdersAndMetrics()
    }, 20000)

    return () => window.clearInterval(intervalId)
  }, [isAdmin])

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

  // Used by AdminCategoriesSection after create/edit/delete/toggle — product
  // counts there are derived from the `products` state above (already shared
  // and kept fresh by refreshProducts), so this only needs to refetch the
  // categories themselves.
  const refreshCategories = async () => {
    const categoriesData = await getCategories()
    setCategories(mapCategories(categoriesData))
  }

  if (!isAdmin) {
    return (
      <section className="space-y-6 bg-slate-50 p-6 sm:p-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-600">Acceso restringido</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
            Área exclusiva para administradores
          </h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Este panel solo está disponible para el equipo con permisos de administración.
          </p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 sm:p-12">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0-12V7m0 4V5m0 4v2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-amber-900">Necesitas acceso de administrador</h2>
            <p className="mt-3 text-amber-800/80">Inicia sesión con una cuenta de administrador para entrar al panel.</p>
            <Link to="/login" className="mt-6 inline-flex rounded-full bg-amber-700 px-6 py-2.5 font-semibold text-white transition hover:bg-amber-600">
              Ir a inicio de sesión
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="sm:grid sm:h-full sm:grid-cols-[240px_1fr]">
      <AdminSidebar active={section} onChange={setSection} />

      <div className="bg-slate-50 px-4 py-8 sm:h-full sm:overflow-y-auto sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-700">Panel de control</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              Administración de FITGEAR
            </h1>
            <p className="mt-3 max-w-2xl text-slate-500">
              Gestiona catálogo, órdenes, usuarios y operaciones del e-commerce en tiempo real.
            </p>
          </div>

          {section === 'overview' ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard label="Productos" value={`${metrics?.activeProductsCount ?? 0}`} trend="Activos en el catálogo" />
              <SummaryCard label="Órdenes" value={`${metrics?.ordersCount ?? 0}`} trend="En procesamiento" />
              <SummaryCard label="Usuarios" value={`${metrics?.usersCount ?? 0}`} trend="Registrados" />
              <SummaryCard label="Ingresos" value={formatCurrency(metrics?.totalRevenue ?? 0)} trend="Total de ventas" accent />
              <SummaryCard label="Stock bajo" value={`${lowStockCount}`} trend="Productos por reabastecer" tone={lowStockCount > 0 ? 'warning' : 'default'} />
            </div>
          ) : null}

          {section === 'overview' && lowStockCount > 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <svg className="h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" aria-hidden>
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
            <div className="flex items-center gap-2.5 text-sm text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" aria-hidden />
              Cargando tu panel...
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
          ) : null}

          <KeepAlive active={section === 'inventory'} visited={visited.has('inventory')}>
            <AdminInventorySection products={products} categories={categories} onRefreshProducts={refreshProducts} />
          </KeepAlive>

          <KeepAlive active={section === 'categories'} visited={visited.has('categories')}>
            <AdminCategoriesSection categories={categories} products={products} onRefresh={refreshCategories} />
          </KeepAlive>

          <KeepAlive active={section === 'reviews'} visited={visited.has('reviews')}>
            <AdminReviewsSection />
          </KeepAlive>

          <KeepAlive active={section === 'audit'} visited={visited.has('audit')}>
            <AdminAuditSection active={section === 'audit'} />
          </KeepAlive>

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
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  Usuarios registrados
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    últimos {Math.min(USERS_OVERVIEW_LIMIT, users.length)}
                  </span>
                </h3>

                {users.length > USERS_OVERVIEW_LIMIT ? (
                  <button
                    type="button"
                    onClick={() => setSection('users')}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Ver todos ({users.length})
                  </button>
                ) : null}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-140 text-left text-sm text-slate-600">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="pb-2 font-medium">Nombre</th>
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Rol</th>
                      <th className="pb-2 font-medium">Estado</th>
                      <th className="pb-2 font-medium">Fecha de registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, USERS_OVERVIEW_LIMIT).map((user) => (
                      <tr key={user.id} className="border-t border-slate-100">
                        <td className="py-2.5 font-medium text-slate-900">{user.fullName}</td>
                        <td>{user.email}</td>
                        <td>{ROLE_LABELS[user.role]}</td>
                        <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
                        <td>{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <KeepAlive active={section === 'users'} visited={visited.has('users')}>
            <AdminUsersSection
              users={users}
              currentUserId={backendUser?.id}
              onRefresh={refreshProducts}
            />
          </KeepAlive>
        </div>
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
