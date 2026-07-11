import { useEffect, useState } from 'react'
import { getAuditLog } from '../../api/fitgearApi'
import type { AuditEntityType, AuditLogEntry } from '../../types'

// HU-52: read-only admin-action audit trail. Mirrors the manual-fetch +
// useState pattern of the rest of the admin panel (no react-query here). The
// list is filterable by action, actor and date range; records are immutable, so
// the table has no row actions.

const fieldClass =
  'w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/30 placeholder:text-slate-500'

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
  CATEGORY_CREATED: 'Categoria creada',
  CATEGORY_UPDATED: 'Categoria actualizada',
  CATEGORY_DELETED: 'Categoria eliminada',
}

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  ORDER: 'Orden',
  USER: 'Usuario',
  PRODUCT: 'Producto',
  CATEGORY: 'Categoria',
}

const ENTITY_BADGE: Record<AuditEntityType, string> = {
  ORDER: 'bg-sky-400/15 text-sky-300',
  USER: 'bg-violet-400/15 text-violet-300',
  PRODUCT: 'bg-lime-400/15 text-lime-300',
  CATEGORY: 'bg-amber-400/15 text-amber-300',
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
// prices, the MCP `via` marker, and stringifies anything nested.
function formatChangeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (key === 'status') return ORDER_STATUS_LABELS[String(value)] ?? String(value)
  if (key === 'isActive') return value ? 'Activo' : 'Inactivo'
  if (key === 'via') return `MCP · ${String(value).replace(/^mcp:/, '')}`
  if (key === 'price') return `$${value}`
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Turns the raw `changes` object into a list of readable label/value pairs.
function describeChanges(changes?: Record<string, unknown>): ChangeItem[] {
  if (!changes) return []
  return Object.entries(changes)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: CHANGE_KEY_LABELS[key] ?? key,
      value: formatChangeValue(key, value),
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

export function AdminAuditSection() {
  const [events, setEvents] = useState<AuditLogEntry[]>([])
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial de auditoria.')
    } finally {
      setLoading(false)
    }
  }

  // Initial load (unfiltered). Filters are applied explicitly via the form so we
  // don't fire a request on every keystroke.
  useEffect(() => {
    void load(EMPTY_FILTERS)
  }, [])

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault()
    void load(filters)
  }

  const handleReset = () => {
    setFilters(EMPTY_FILTERS)
    void load(EMPTY_FILTERS)
  }

  const actionLabel = (action: string) => ACTION_LABELS[action] ?? action

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-white/[0.08] bg-slate-900 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime-400">Auditoria</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Historial de acciones admin
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Registro de solo lectura de cada accion realizada en el panel. Filtra por tipo de
            accion, usuario o rango de fechas.
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
            placeholder="Accion (ej. ORDER_REFUNDED)"
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
            <option value="ORDER">Ordenes</option>
            <option value="USER">Usuarios</option>
            <option value="PRODUCT">Productos</option>
            <option value="CATEGORY">Categorias</option>
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
              className="inline-flex items-center justify-center rounded-full bg-lime-400 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Limpiar
            </button>
          </div>
        </form>
      </div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
        {error ? (
          <p className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="py-6 text-center text-sm text-slate-300">Cargando historial...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-left text-sm text-slate-300">
              <thead className="text-slate-400">
                <tr>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Usuario</th>
                  <th className="pb-2">Accion</th>
                  <th className="pb-2">Entidad</th>
                  <th className="pb-2">Cambios</th>
                </tr>
              </thead>
              <tbody>
                {events.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/10 align-top">
                    <td className="py-2.5 whitespace-nowrap text-slate-400">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="py-2.5">
                      {entry.actorEmail ?? entry.actorClerkId ?? 'Sistema'}
                    </td>
                    <td className="py-2.5 font-medium text-slate-100">{actionLabel(entry.action)}</td>
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
                        const items = describeChanges(entry.changes)
                        if (items.length === 0) {
                          return <span className="text-slate-600">—</span>
                        }
                        return (
                          <div className="flex max-w-md flex-wrap gap-1.5">
                            {items.map((item) => (
                              <span
                                key={item.key}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-0.5 text-xs"
                              >
                                <span className="text-slate-500">{item.label}:</span>
                                <span className="font-medium text-slate-200">{item.value}</span>
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
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No hay registros de auditoria para los filtros seleccionados.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
