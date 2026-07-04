import { useEffect, useState } from 'react'

interface ProductGalleryProps {
  images: string[]
  alt: string
}

// Mount with `key={product.id}` from the parent so switching products resets
// the selected thumbnail and closes any open lightbox for free.
export function ProductGallery({ images, alt }: Readonly<ProductGalleryProps>) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const activeImage = images[selectedIndex] ?? images[0]

  const closeLightbox = () => setIsLightboxOpen(false)

  useEffect(() => {
    if (!isLightboxOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox()
      } else if (event.key === 'ArrowLeft') {
        setSelectedIndex((current) => (current - 1 + images.length) % images.length)
      } else if (event.key === 'ArrowRight') {
        setSelectedIndex((current) => (current + 1) % images.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, images.length])

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsLightboxOpen(true)}
        className="block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white to-slate-100 p-6"
        aria-label="Ampliar imagen"
      >
        <img src={activeImage} alt={alt} className="mx-auto h-full max-h-[34rem] w-full rounded-2xl object-contain" />
      </button>

      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Ver imagen ${index + 1}`}
              aria-current={index === selectedIndex}
              className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-white to-slate-100 p-2 transition ${
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

      {isLightboxOpen ? (
        <div
          role="button"
          tabIndex={0}
          onClick={closeLightbox}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              closeLightbox()
            }
          }}
          aria-label="Cerrar imagen ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Cerrar"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-white/40 hover:bg-white/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedIndex((current) => (current - 1 + images.length) % images.length)
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
                  setSelectedIndex((current) => (current + 1) % images.length)
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
          <img src={activeImage} alt={alt} className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain" />
        </div>
      ) : null}
    </div>
  )
}
