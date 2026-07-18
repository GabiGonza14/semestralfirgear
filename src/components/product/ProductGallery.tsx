import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT_ATHLETIC, MOTION_DURATION, hoverLift } from '../../lib/motion'

interface ProductGalleryProps {
  images: string[]
  alt: string
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'

// Mount with `key={product.id}` from the parent so switching products resets
// the selected thumbnail and closes any open lightbox for free.
export function ProductGallery({ images, alt }: Readonly<ProductGalleryProps>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const activeImage = images[selectedIndex] ?? images[0]
  const hasMultiple = images.length > 1
  const dialogRef = useRef<HTMLDivElement>(null)

  const closeLightbox = () => setIsLightboxOpen(false)
  const showPrevious = useCallback(
    () => setSelectedIndex((current) => (current - 1 + images.length) % images.length),
    [images.length],
  )
  const showNext = useCallback(
    () => setSelectedIndex((current) => (current + 1) % images.length),
    [images.length],
  )

  // Focus trap + keyboard nav while the lightbox dialog is open.
  useEffect(() => {
    if (!isLightboxOpen) {
      return
    }

    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialog?.querySelector<HTMLElement>('[data-lightbox-close]')?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox()
        return
      }
      if (event.key === 'ArrowLeft') {
        showPrevious()
        return
      }
      if (event.key === 'ArrowRight') {
        showNext()
        return
      }
      if (event.key !== 'Tab' || !dialog) {
        return
      }
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null,
      )
      if (focusable.length === 0) {
        return
      }
      // `focusable.length === 0` already returned above, so both ends exist.
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [isLightboxOpen, showPrevious, showNext])

  return (
    <div>
      <div className="group relative">
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white to-slate-100 p-6"
          aria-label="Ampliar imagen"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={activeImage}
              src={activeImage}
              alt={alt}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: MOTION_DURATION.fast, ease: EASE_OUT_ATHLETIC }}
              className="mx-auto h-full max-h-[34rem] w-full rounded-2xl object-contain transition-transform duration-[var(--duration-base)] ease-out-athletic motion-safe:group-hover:scale-[1.03]"
            />
          </AnimatePresence>
          <span className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur transition duration-[var(--duration-fast)] ease-out-athletic group-hover:opacity-100 group-focus-visible:opacity-100">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Ampliar
          </span>
        </button>
      </div>

      {hasMultiple ? (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={index === selectedIndex}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-white to-slate-100 p-2 ${hoverLift} ${
                index === selectedIndex
                  ? 'border-lime-400 ring-2 ring-lime-400/40'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <img src={image} alt="" className="aspect-square w-full object-contain" />
            </button>
          ))}
        </div>
      ) : null}

      {/* No AnimatePresence here: this is enter-only (mirrors QuickViewModal) —
          closing unmounts the portal immediately, no exit transition to track. */}
      {isLightboxOpen && typeof document !== 'undefined'
        ? createPortal(
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              onClick={closeLightbox}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: MOTION_DURATION.fast, ease: EASE_OUT_ATHLETIC }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
            >
              <button
                type="button"
                data-lightbox-close
                onClick={closeLightbox}
                aria-label="Cerrar"
                className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-white/40 hover:bg-white/10"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              {hasMultiple ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      showPrevious()
                    }}
                    aria-label="Imagen anterior"
                    className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/50 text-white transition hover:border-white/40 sm:left-6"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      showNext()
                    }}
                    aria-label="Siguiente imagen"
                    className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/50 text-white transition hover:border-white/40 sm:right-6"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              ) : null}

              {/* Clicking the image bubbles up and closes the lightbox too — same as clicking anywhere else on the backdrop. */}
              <motion.img
                key={activeImage}
                src={activeImage}
                alt={alt}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: MOTION_DURATION.base, ease: EASE_OUT_ATHLETIC }}
                className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
              />
            </motion.div>,
            document.body,
          )
        : null}
    </div>
  )
}
