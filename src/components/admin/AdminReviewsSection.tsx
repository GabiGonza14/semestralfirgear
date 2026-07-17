import { useCallback, useEffect, useMemo, useState } from 'react'
import { getReviewsForModeration, moderateReview } from '../../api/fitgearApi'
import type { AdminReview, ReviewModerationAction, ReviewStatus } from '../../types'
import { formatDate } from '../../utils/format'

// Filter values: a concrete status, or ALL for the whole queue.
type StatusFilter = ReviewStatus | 'ALL'

const PAGE_SIZE = 20

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
  { value: 'HIDDEN', label: 'Ocultas' },
  { value: 'ALL', label: 'Todas' },
]

const STATUS_BADGE: Record<ReviewStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700' },
  APPROVED: { label: 'Aprobada', className: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Rechazada', className: 'bg-rose-50 text-rose-700' },
  HIDDEN: { label: 'Oculta', className: 'bg-slate-100 text-slate-500' },
}

function Stars({ value }: Readonly<{ value: number }>) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`h-3.5 w-3.5 ${star <= value ? 'text-amber-400' : 'text-slate-300'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5-4.7-4.6 6.5-.9L12 2.5z" />
        </svg>
      ))}
    </span>
  )
}

export function AdminReviewsSection() {
  const [filter, setFilter] = useState<StatusFilter>('PENDING')
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // Reject flow: which review is being rejected, plus the reason text.
  const [rejectTarget, setRejectTarget] = useState<AdminReview | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getReviewsForModeration(filter === 'ALL' ? undefined : filter)
      setReviews(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las reseñas.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  // Changing the status filter fetches a different queue — start back at page 1.
  useEffect(() => {
    setPage(1)
  }, [filter])

  const totalPages = Math.max(1, Math.ceil(reviews.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedReviews = useMemo(
    () => reviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [reviews, currentPage],
  )

  const runModeration = async (
    id: string,
    action: ReviewModerationAction,
    reason?: string,
  ) => {
    setPendingId(id)
    setError(null)
    try {
      await moderateReview(id, action, reason)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo moderar la reseña.')
    } finally {
      setPendingId(null)
    }
  }

  const confirmReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      return
    }
    const target = rejectTarget
    setRejectTarget(null)
    await runModeration(target.id, 'reject', rejectReason.trim())
    setRejectReason('')
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Moderación de reseñas</h3>
          <p className="text-xs text-slate-500">
            Aprueba, rechaza u oculta reseñas. Solo las aprobadas aparecen en la tienda.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.value
                  ? 'bg-emerald-700 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando reseñas...</p>
      ) : reviews.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">No hay reseñas en esta vista.</p>
      ) : (
        <ul className="space-y-3">
          {pagedReviews.map((review) => {
            const isPending = pendingId === review.id
            const badge = STATUS_BADGE[review.status]

            return (
              <li
                key={review.id}
                className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{review.productName}</span>
                      <Stars value={review.rating} />
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {review.reviewerName}
                      {review.reviewerEmail ? ` · ${review.reviewerEmail}` : ''} ·{' '}
                      {formatDate(review.createdAt)}
                    </p>
                  </div>
                </div>

                {review.comment ? (
                  <p className="text-sm leading-relaxed text-slate-600">{review.comment}</p>
                ) : (
                  <p className="text-sm italic text-slate-500">Sin comentario.</p>
                )}

                {review.status === 'REJECTED' && review.rejectionReason ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    Razón del rechazo: {review.rejectionReason}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {review.status !== 'APPROVED' ? (
                    <button
                      type="button"
                      onClick={() => runModeration(review.id, 'approve')}
                      disabled={isPending}
                      className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  ) : null}
                  {review.status !== 'REJECTED' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectReason('')
                        setRejectTarget(review)
                      }}
                      disabled={isPending}
                      className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  ) : null}
                  {review.status !== 'HIDDEN' ? (
                    <button
                      type="button"
                      onClick={() => runModeration(review.id, 'hide')}
                      disabled={isPending}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Ocultar
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
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

      {/* Reject reason modal */}
      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Rechazar reseña</h4>
              <p className="mt-1 text-xs text-slate-500">
                Se enviará un email a {rejectTarget.reviewerName} con la razón del rechazo.
              </p>
            </div>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              maxLength={500}
              rows={3}
              autoFocus
              placeholder="Explica por qué esta reseña no cumple con las normas."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null)
                  setRejectReason('')
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Rechazar y notificar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
