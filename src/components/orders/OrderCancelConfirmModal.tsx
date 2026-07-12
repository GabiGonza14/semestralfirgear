import { useState } from 'react'

interface OrderCancelConfirmModalProps {
  isOpen: boolean
  message: string
  confirmLabel: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

// Shared confirmation step for both order actions that trigger a real Stripe
// refund (cancel a PAID order, or return a SHIPPED one) — same "are you sure"
// pattern as admin's DeleteConfirmModal, so an accidental click never moves
// money on its own.
export function OrderCancelConfirmModal({
  isOpen,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}: OrderCancelConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError(null)

    try {
      await onConfirm()
      onClose()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'No se pudo completar la acción.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-slate-900 p-6 shadow-2xl shadow-black/50">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-white">Confirmar acción</h3>
        <p className="mt-3 text-sm text-slate-300">{message}</p>

        {error ? (
          <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="rounded-full bg-rose-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isConfirming ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
