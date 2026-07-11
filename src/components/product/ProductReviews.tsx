import { useEffect, useState } from 'react'
import { ApiError } from '../../api/apiClient'
import { createProductReview, getProductReviews } from '../../api/fitgearApi'
import { useAuth } from '../../context/AuthContext'
import type { ProductReviewsResponse } from '../../types'
import { formatDate } from '../../utils/format'

// Read-only star row. `value` is rounded to the nearest whole star for display.
function Stars({ value, className = 'h-4 w-4' }: { value: number; className?: string }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${className} ${star <= rounded ? 'text-amber-400' : 'text-slate-600'}`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5-4.7-4.6 6.5-.9L12 2.5z" />
        </svg>
      ))}
    </span>
  )
}

// Interactive 1–5 star picker for the submit form.
function StarInput({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
          aria-pressed={value === star}
          className="rounded p-0.5 transition"
        >
          <svg
            className={`h-7 w-7 transition ${star <= active ? 'text-amber-400' : 'text-slate-600 hover:text-slate-500'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5-4.7-4.6 6.5-.9L12 2.5z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function errorMessageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Solo puedes reseñar productos que hayas comprado.'
    if (error.status === 409) return 'Ya dejaste una reseña para este producto.'
    if (error.status === 401) return 'Inicia sesión para dejar una reseña.'
  }
  return error instanceof Error ? error.message : 'No se pudo enviar la reseña.'
}

export function ProductReviews({ productId }: { productId: string }) {
  // Re-fetch once auth resolves so the viewer eligibility flags (which depend on
  // the attached token) are accurate rather than anonymous-on-first-paint.
  const { isLoaded: authLoaded } = useAuth()
  const [data, setData] = useState<ProductReviewsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    void getProductReviews(productId)
      .then((result) => {
        if (active) setData(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'No se pudieron cargar las reseñas.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [productId, authLoaded])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (rating < 1) {
      setSubmitError('Selecciona una calificación de 1 a 5 estrellas.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const result = await createProductReview(productId, {
        rating,
        comment: comment.trim() ? comment.trim() : undefined,
      })
      setData(result)
      setRating(0)
      setComment('')
    } catch (err: unknown) {
      setSubmitError(errorMessageFor(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-slate-800" />
        <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-900" />
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-white">Reseñas</h2>
        <p className="text-sm text-slate-400">{error ?? 'No se pudieron cargar las reseñas.'}</p>
      </section>
    )
  }

  const { summary, reviews, viewer } = data

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Opiniones</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">Reseñas de clientes</h2>
        </div>
        {summary.count > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{summary.averageRating.toFixed(1)}</span>
            <div className="space-y-1">
              <Stars value={summary.averageRating} />
              <p className="text-xs text-slate-400">
                {summary.count} {summary.count === 1 ? 'reseña' : 'reseñas'}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Write area — state depends on the viewer's eligibility flags. */}
      {viewer.canReview ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5"
        >
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white">Tu calificación</label>
            <StarInput value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <label htmlFor="review-comment" className="block text-sm font-semibold text-white">
              Comentario <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Cuéntales a otros clientes qué te pareció el producto."
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-lime-400/40"
            />
          </div>
          {submitError ? (
            <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-100">
              {submitError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-lime-400 px-6 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Enviando...' : 'Publicar reseña'}
          </button>
        </form>
      ) : viewer.hasReviewed && viewer.ownReviewStatus === 'REJECTED' ? (
        <p className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-200">
          Tu reseña sobre este producto no fue publicada. Revisa tu email para más detalles.
        </p>
      ) : viewer.hasReviewed && viewer.ownReviewStatus === 'PENDING' ? (
        <p className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm text-amber-200">
          Gracias por tu reseña. Nuestro equipo la está revisando antes de publicarla — te avisaremos por email si hay algún inconveniente.
        </p>
      ) : viewer.hasReviewed && viewer.ownReviewStatus === 'HIDDEN' ? (
        <p className="rounded-2xl border border-white/[0.08] bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
          Tu reseña sobre este producto fue retirada de la tienda por nuestro equipo.
        </p>
      ) : viewer.hasReviewed ? (
        <p className="rounded-2xl border border-lime-400/20 bg-lime-400/[0.06] px-4 py-3 text-sm text-lime-200">
          Gracias por tu reseña. Ya está publicada en la tienda.
        </p>
      ) : viewer.authenticated && !viewer.purchased ? (
        <p className="rounded-2xl border border-white/[0.08] bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
          Solo los clientes que compraron este producto pueden dejar una reseña.
        </p>
      ) : !viewer.authenticated ? (
        <p className="rounded-2xl border border-white/[0.08] bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
          Inicia sesión con la cuenta con la que compraste para dejar una reseña.
        </p>
      ) : null}

      {/* List */}
      {reviews.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no hay reseñas. ¡Sé el primero en opinar!</p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="space-y-2 rounded-2xl border border-white/[0.06] bg-slate-900/40 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">{review.reviewerName}</span>
                  <Stars value={review.rating} />
                </div>
                <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
              </div>
              {review.comment ? (
                <p className="text-sm leading-relaxed text-slate-300">{review.comment}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
