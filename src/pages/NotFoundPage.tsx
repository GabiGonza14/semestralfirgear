import { Link } from '@tanstack/react-router'
import { getButtonClassName } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-slate-900/70 px-6 py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
        <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9.5 9.5c.5-1.5 1.8-2.5 3.4-2.3 1.6.2 2.7 1.6 2.5 3.1-.15 1.15-1 1.7-1.8 2.3-.7.5-1.3 1.1-1.3 2.1M12 17h.01"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Página no encontrada</h1>
        <p className="mt-3 max-w-md text-slate-400">
          No encontramos la página que buscas. Puede que el enlace haya cambiado o que ya no esté disponible.
        </p>
      </div>
      <Link to="/" className={getButtonClassName({ variant: 'primary' })}>
        Volver al inicio
      </Link>
    </section>
  )
}
