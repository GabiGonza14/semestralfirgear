import { Link } from '@tanstack/react-router'

export function NotFoundPage() {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-10 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-lime-400">404</p>
      <h1 className="mt-3 text-4xl font-black text-white">Ruta no encontrada</h1>
      <p className="mt-3 text-slate-300">La pagina que buscas no existe en esta fase de FITGEAR.</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full bg-lime-400 px-6 py-3 text-sm font-semibold text-slate-950"
      >
        Volver al inicio
      </Link>
    </section>
  )
}
