import { useState } from 'react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  itemName: string
  /** Singular label used in the "Eliminar {entityLabel}" heading. Defaults to "producto". */
  entityLabel?: string
  /**
   * When set, deletion is blocked (e.g. a category still has products): shows
   * this message and an amber warning instead of the confirm button.
   */
  blockedMessage?: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmModal({
  isOpen,
  itemName,
  entityLabel = 'producto',
  blockedMessage,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  const isBlocked = Boolean(blockedMessage)

  const handleConfirm = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      await onConfirm()
      onClose()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : `No se pudo eliminar el ${entityLabel}.`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-slate-900 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-400">Eliminar {entityLabel}</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">Confirmar accion</h3>

        {isBlocked ? (
          <p className="mt-3 text-sm text-slate-400">{blockedMessage}</p>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Vas a eliminar <span className="font-semibold text-white">{itemName}</span> de forma
            permanente.
          </p>
        )}

        {isBlocked ? (
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            No se puede eliminar mientras tenga elementos asociados.
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
          >
            {isBlocked ? 'Entendido' : 'Cancelar'}
          </button>
          {isBlocked ? null : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="rounded-full bg-rose-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
