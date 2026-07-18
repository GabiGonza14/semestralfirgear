import { useMemo, useState } from 'react'
import { updateUserRole, updateUserStatus } from '../../api/fitgearApi'
import type { BackendUser, UserRole } from '../../types'
import { formatDate } from '../../utils/format'
import { ROLE_LABELS } from '../../utils/userRoleLabels'
import { Select } from '../ui/Select'

interface AdminUsersSectionProps {
  users: BackendUser[]
  /** Mongo _id of the signed-in admin — used to block editing your own account. */
  currentUserId?: string
  onRefresh: () => Promise<void>
}

const PAGE_SIZE = 20

export function AdminUsersSection({ users, currentUserId, onRefresh }: Readonly<AdminUsersSectionProps>) {
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Usuarios registrados</h3>
        <p className="text-xs text-slate-500">
          Cambia el rol o desactiva cuentas. No puedes editar tu propia cuenta.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left text-sm text-slate-600">
          <thead className="text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Nombre</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Rol</th>
              <th className="pb-2 font-medium">Estado</th>
              <th className="pb-2 font-medium">Registro</th>
              <th className="pb-2 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((user) => {
              const isSelf = user.id === currentUserId
              const isPending = pendingId === user.id
              // No admin-on-admin management: another admin's role can't be
              // touched at all, and another admin can't be deactivated (though
              // reactivating one is still allowed — see userAdminService).
              const isOtherAdmin = !isSelf && user.role === 'ADMIN'
              const roleLocked = isSelf || isPending || isOtherAdmin
              const deactivateLocked = isSelf || isPending || (isOtherAdmin && user.isActive)

              return (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-2.5 font-medium text-slate-900">{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>
                    <Select
                      tone="light"
                      label={`Rol de ${user.fullName}`}
                      value={user.role}
                      onChange={(next) => handleRoleChange(user, next as UserRole)}
                      disabled={roleLocked}
                      title={
                        isSelf
                          ? 'No puedes cambiar tu propio rol'
                          : isOtherAdmin
                            ? 'No puedes cambiar el rol de otro administrador'
                            : undefined
                      }
                      options={[
                        { value: 'CUSTOMER', label: ROLE_LABELS.CUSTOMER },
                        { value: 'ADMIN', label: ROLE_LABELS.ADMIN },
                      ]}
                    />
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
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
                      disabled={deactivateLocked}
                      title={
                        isSelf
                          ? 'No puedes desactivar tu propia cuenta'
                          : isOtherAdmin && user.isActive
                            ? 'No puedes desactivar a otro administrador'
                            : undefined
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        user.isActive
                          ? 'border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                          : 'border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50'
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
                <td colSpan={6} className="py-4 text-center text-slate-500">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

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
  )
}
