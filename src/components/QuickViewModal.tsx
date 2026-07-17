import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useCart } from '../context/CartContext'
import { EASE_OUT_ATHLETIC, MOTION_DURATION } from '../lib/motion'
import type { Product } from '../types'
import { formatCurrency } from '../utils/format'

interface QuickViewModalProps {
  product: Product
  onClose: () => void
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'

/**
 * "Vista rápida": a read-mostly product preview so shoppers can size up an item
 * without leaving the catalog. Presentational — it reuses the same cart action
 * and product data the card already has; it adds no new logic or data shape.
 *
 * Accessible dialog: role="dialog" aria-modal, labelled by the product name,
 * initial focus on Close, Tab/Shift+Tab trapped inside, Escape closes, a click
 * on the backdrop closes, and focus returns to the trigger (handled by the
 * caller). The enter transition uses the shared motion tokens and is neutralised
 * under reduced motion by the app-wide MotionConfig.
 */
export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addItem } = useCart()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = `quickview-${product.id}`

  const outOfStock = product.stock <= 0
  const lowStock = !outOfStock && product.stock <= 5
  const hasSizes = product.sizes.length > 0
  const [added, setAdded] = useState(false)

  // Focus management: move focus into the dialog on open, trap Tab within it,
  // and close on Escape.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) {
      return
    }
    const previouslyFocused = document.activeElement as HTMLElement | null
    const closeButton = panel.querySelector<HTMLElement>('[data-quickview-close]')
    closeButton?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') {
        return
      }
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      )
      if (focusable.length === 0) {
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Close on a pointer press outside the panel (listener, not an onClick on
    // the backdrop, so no static element carries a click handler).
    const handlePointerDown = (event: PointerEvent) => {
      if (panel && !panel.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)
    // Lock background scroll while the dialog is open.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.body.style.overflow = previousOverflow
      // Best-effort restore if the caller didn't move focus itself.
      previouslyFocused?.focus?.()
    }
  }, [onClose])

  const handleAdd = () => {
    addItem(product)
    setAdded(true)
  }

  // Portal to <body>: the card carries a hover `translate` (hoverLift) which
  // would otherwise become the containing block for this fixed overlay and clip
  // it inside the card's overflow-hidden.
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.base, ease: EASE_OUT_ATHLETIC }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900 shadow-2xl shadow-black/50"
      >
        <button
          type="button"
          data-quickview-close
          onClick={onClose}
          aria-label="Cerrar vista rápida"
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-slate-950/60 text-slate-200 transition hover:border-white/30 hover:bg-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-b from-white to-slate-100 p-6">
          <img
            src={product.image}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>

        <div className="space-y-4 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime-400">
              {product.category}
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-bold tracking-tight text-white">
              {product.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {product.hasDiscount ? (
              <>
                <span className="text-2xl font-bold tracking-tight text-white">
                  {formatCurrency(product.finalPrice)}
                </span>
                <span className="text-sm text-slate-500 line-through">
                  {formatCurrency(product.price)}
                </span>
                <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-rose-400/30">
                  -{product.discountPercentage}%
                </span>
              </>
            ) : (
              <span className="text-2xl font-bold tracking-tight text-white">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          {product.description ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-slate-400">
              {product.description}
            </p>
          ) : null}

          <p className="text-sm font-medium">
            {outOfStock ? (
              <span className="text-slate-400">Sin stock por ahora</span>
            ) : lowStock ? (
              <span className="text-amber-300">¡Quedan pocas! Últimas {product.stock}</span>
            ) : (
              <span className="text-lime-400">Disponible</span>
            )}
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            {hasSizes ? (
              // Sized products need a size picked first — send them to the detail
              // page, same as the card's "Ver tallas".
              <Link
                to="/product/$id"
                params={{ id: product.id }}
                className="inline-flex min-h-[var(--size-touch-min)] flex-1 items-center justify-center gap-2 rounded-full bg-lime-400 px-5 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
              >
                Ver tallas
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={outOfStock}
                className="inline-flex min-h-[var(--size-touch-min)] flex-1 items-center justify-center gap-2 rounded-full bg-lime-400 px-5 text-sm font-bold text-slate-900 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {outOfStock ? 'Sin stock' : added ? 'Agregado ✓' : 'Agregar al carrito'}
              </button>
            )}
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              className="inline-flex min-h-[var(--size-touch-min)] items-center justify-center gap-2 rounded-full border border-white/12 px-5 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            >
              Ver detalle
            </Link>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
