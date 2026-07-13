import { useMemo, useState } from 'react'
import { updateUserRole, updateUserStatus } from '../../api/fitgearApi'
import type { BackendUser, UserRole } from '../../types'
import { formatDate } from '../../utils/format'

interface AdminUsersSectionProps {
  users: BackendUser[]
  /** Mongo _id of the signed-in admin — used to block editing your own account. */
  currentUserId?: string
  onRefresh: () => Promise<void>
}

const PAGE_SIZE = 20

export function AdminUsersSection({ users, currentUserId, onRefresh }: AdminUsersSectionProps) {
  // Tracks which user row currently has an in-flight mutation, to disable its
  // controls and avoid double submits.
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedUsers = useMemo(
    () => users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [users, currentPage],
  )

  const runMutation = async (userId: string, action: () => Promise<unknown>) => {
    setPendingId(userId)
    setError(null)
    try {
      await action()
      await onRefresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el usuario.')
    } finally {
      setPendingId(null)
    }
  }

  const handleRoleChange = (user: BackendUser, role: UserRole) => {
    if (role === user.role) {
      return
    }
    void runMutation(user.id, () => updateUserRole(user.id, role))
  }

  const handleToggleActive = (user: BackendUser) => {
    void runMutation(user.id, () => updateUserStatus(user.id, !user.isActive))
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Usuarios registrados</h3>
        <p className="text-xs text-slate-400">
          Cambia el rol o desactiva cuentas. No puedes editar tu propia cuenta.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm text-slate-300">
          <thead className="text-slate-400">
            <tr>
              <th className="pb-2">Nombre</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Rol</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2">Registro</th>
              <th className="pb-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((user) => {
              const isSelf = user.id === currentUserId
              const isPending = pendingId === user.id

              return (
                <tr key={user.id} className="border-t border-white/10">
                  <td className="py-2">{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(event) => handleRoleChange(user, event.target.value as UserRole)}
                      disabled={isSelf || isPending}
                      aria-label={`Rol de ${user.fullName}`}
                      title={isSelf ? 'No puedes cambiar tu propio rol' : undefined}
                      className="rounded-lg border border-white/12 bg-slate-950/60 px-2 py-1 text-xs font-semibold text-slate-100 outline-none transition focus:border-lime-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.isActive
                          ? 'bg-lime-400/15 text-lime-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td className="text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(user)}
                      disabled={isSelf || isPending}
                      title={isSelf ? 'No puedes desactivar tu propia cuenta' : undefined}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.isActive
                          ? 'border-rose-400/30 text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/10'
                          : 'border-lime-400/30 text-lime-300 hover:border-lime-400/60 hover:bg-lime-400/10'
                      }`}
                    >
                      {isPending ? '...' : user.isActive ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              )
            })}

            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
