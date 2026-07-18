import { useEffect, useMemo, useState } from 'react'
import { getAuditLog } from '../../api/fitgearApi'
import type { AuditEntityType, AuditLogEntry } from '../../types'

const PAGE_SIZE = 20

// HU-52: read-only admin-action audit trail. Mirrors the manual-fetch +
// useState pattern of the rest of the admin panel (no react-query here). The
// list is filterable by action, actor and date range; records are immutable, so
// the table has no row actions.

const fieldClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400'

// Human-readable Spanish labels for each recorded action. Falls back to the raw
// code for any future action not yet mapped here.
const ACTION_LABELS: Record<string, string> = {
  USER_ROLE_CHANGED: 'Cambio de rol de usuario',
  USER_STATUS_CHANGED: 'Cambio de estado de usuario',
  ORDER_STATUS_CHANGED: 'Cambio de estado de orden',
  ORDER_SHIPPED: 'Orden enviada',
  ORDER_REFUNDED: 'Orden reembolsada',
  PRODUCT_CREATED: 'Producto creado',
  PRODUCT_UPDATED: 'Producto actualizado',
  PRODUCT_STOCK_UPDATED: 'Stock actualizado',
  PRODUCT_DELETED: 'Producto eliminado',
  CATEGORY_CREATED: 'Categoría creada',
  CATEGORY_UPDATED: 'Categoría actualizada',
  CATEGORY_DELETED: 'Categoría eliminada',
  REVIEW_STATUS_CHANGED: 'Cambio de estado de reseña',
}

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  ORDER: 'Orden',
  USER: 'Usuario',
  PRODUCT: 'Producto',
  CATEGORY: 'Categoría',
  REVIEW: 'Reseña',
}

const ENTITY_BADGE: Record<AuditEntityType, string> = {
  ORDER: 'bg-sky-50 text-sky-700',
  USER: 'bg-violet-50 text-violet-700',
  PRODUCT: 'bg-emerald-50 text-emerald-700',
  CATEGORY: 'bg-amber-50 text-amber-700',
  REVIEW: 'bg-rose-50 text-rose-700',
}

// Spanish labels for order lifecycle statuses, so "Cambios" reads naturally
// instead of showing the raw enum value.
const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagada',
  SHIPPED: 'Enviada',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
  FAILED: 'Fallida',
}

// Same idea for review moderation statuses (HU-50), keyed separately since
// PENDING/etc. mean something different per entity type.
const REVIEW_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  HIDDEN: 'Oculta',
}

// Friendly Spanish description for each known automation source (`via` on a
// changes payload), so "Origen" reads as plain language instead of the raw
// internal `mcp:tool_name` identifier those integrations record.
const VIA_LABELS: Record<string, string> = {
  'mcp:update_stock': 'Automatización de inventario',
  'mcp:update_order_status': 'Automatización de pedidos',
  'mcp:manage_categories': 'Automatización de categorías',
}

// Human-readable label per known change key. Unknown keys fall back to the key
// itself, so future actions still render something sensible.
const CHANGE_KEY_LABELS: Record<string, string> = {
  status: 'Estado',
  role: 'Rol',
  isActive: 'Estado',
  trackingNumber: 'N° de rastreo',
  reason: 'Motivo',
  name: 'Nombre',
  price: 'Precio',
  stock: 'Stock',
  requiresSizes: 'Requiere tallas',
  from: 'De',
  to: 'A',
  via: 'Origen',
}

interface ChangeItem {
  key: string
  label: string
  value: string
}

// Formats a single change value for display: translates statuses/booleans,
// prices, the MCP `via` marker, and stringifies anything nested. `status`
// means different things per entity (order lifecycle vs. review moderation),
// so entityType picks which label map applies.
function formatChangeValue(key: string, value: unknown, entityType?: AuditEntityType): string {
  if (value === null || value === undefined) return '—'
  if (key === 'status') {
    const statusLabels = entityType === 'REVIEW' ? REVIEW_STATUS_LABELS : ORDER_STATUS_LABELS
    return statusLabels[String(value)] ?? String(value)
  }
  if (key === 'isActive') return value ? 'Activo' : 'Inactivo'
  if (key === 'via') return (typeof value === 'string' ? VIA_LABELS[value] : undefined) ?? 'Automatización'
  if (key === 'price') return `$${value}`
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Turns the raw `changes` object into a list of readable label/value pairs.
function describeChanges(changes: Record<string, unknown> | undefined, entityType: AuditEntityType): ChangeItem[] {
  if (!changes) return []
  return Object.entries(changes)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: CHANGE_KEY_LABELS[key] ?? key,
      value: formatChangeValue(key, value, entityType),
    }))
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('es-PA', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

interface Filters {
  action: string
  actor: string
  entityType: '' | AuditEntityType
  dateFrom: string
  dateTo: string
}

const EMPTY_FILTERS: Filters = {
  action: '',
  actor: '',
  entityType: '',
  dateFrom: '',
  dateTo: '',
}

// `active` is whether the Auditoría tab is the one currently on screen. The
// dashboard keeps this section mounted (KeepAlive) so returning to it is
// instant, but the audit trail aggregates actions from every other section —
// so unlike the other tabs it must re-fetch each time it's reopened, otherwise
// e.g. a role change made in Usuarios wouldn't appear until a full page reload.
export function AdminAuditSection({ active = true }: Readonly<{ active?: boolean }>) {
  const [events, setEvents] = useState<AuditLogEntry[]>([])
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedEvents = useMemo(
    () => events.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [events, currentPage],
  )

  // Fetches with the CURRENT filters. Empty fields are dropped so the backend
  // returns an unfiltered (most-recent) list.
  const load = async (active: Filters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuditLog({
        action: active.action || undefined,
        actor: active.actor || undefined,
        entityType: active.entityType || undefined,
        dateFrom: active.dateFrom || undefined,
        dateTo: active.dateTo || undefined,
      })
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial de auditoría.')
    } finally {
      setLoading(false)
    }
  }

  // Load whenever the section becomes active — this covers the initial mount
  // (KeepAlive only mounts it once active) AND every reopen afterwards, keeping
  // the log fresh. Reloads with the CURRENT filters so a previously-applied
  // filter survives navigating away and back. Intentionally keyed on `active`
  // only: filter edits load through handleApply, not on every keystroke.
  useEffect(() => {
    if (active) {
      void load(filters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    void load(filters)
  }

  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
    void load(EMPTY_FILTERS)
  }

  const actionLabel = (action: string) => ACTION_LABELS[action] ?? action

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">Auditoría</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Historial de acciones admin
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Registro de solo lectura de cada acción realizada en el panel. Filtra por tipo de
            acción, usuario o rango de fechas.
          </p>
        </div>

        <form onSubmit={handleApply} className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
          <input
            value={filters.actor}
            onChange={(event) => setFilters((prev) => ({ ...prev, actor: event.target.value }))}
            placeholder="Usuario (email o ID)"
            className={fieldClass}
          />

          <input
            value={filters.action}
            onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))}
            placeholder="Acción (ej. Orden reembolsada)"
            className={fieldClass}
          />

          <select
            value={filters.entityType}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, entityType: event.target.value as '' | AuditEntityType }))
            }
            className={fieldClass}
            aria-label="Tipo de entidad"
          >
            <option value="">Todas las entidades</option>
            <option value="ORDER">Órdenes</option>
            <option value="USER">Usuarios</option>
            <option value="PRODUCT">Productos</option>
            <option value="CATEGORY">Categorías</option>
            <option value="REVIEW">Reseñas</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))}
            className={fieldClass}
            aria-label="Desde"
          />

          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setFilters((prev) => ({ ...prev, dateTo: event.target.value }))}
            className={fieldClass}
            aria-label="Hasta"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Cargando historial...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm text-slate-600">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Usuario</th>
                  <th className="pb-2 font-medium">Acción</th>
                  <th className="pb-2 font-medium">Entidad</th>
                  <th className="pb-2 font-medium">Cambios</th>
                </tr>
              </thead>
              <tbody>
                {pagedEvents.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100 align-top">
                    <td className="py-2.5 whitespace-nowrap text-slate-500">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="py-2.5">
                      {entry.actorEmail ?? (entry.actorClerkId ? 'Administrador' : 'Sistema')}
                    </td>
                    <td className="py-2.5 font-medium text-slate-900">{actionLabel(entry.action)}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ENTITY_BADGE[entry.entityType]}`}
                      >
                        {ENTITY_LABELS[entry.entityType]}
                      </span>
                      {entry.entityId ? (
                        <span className="ml-2 font-mono text-xs text-slate-500">
                          {entry.entityId.slice(-6)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5">
                      {(() => {
                        const items = describeChanges(entry.changes, entry.entityType)
                        if (items.length === 0) {
                          return <span className="text-slate-300">—</span>
                        }
                        return (
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {items.map((item) => (
                              <span
                                key={item.key}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-0.5 text-xs"
                              >
                                <span className="text-slate-500">{item.label}:</span>
                                <span className="font-medium text-slate-700">{item.value}</span>
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                  </tr>
                ))}

                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No hay registros de auditoría para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage === totalPages}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  )
}
