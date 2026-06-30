import { Link } from 'react-router-dom'

const points = [
  'Productos probados por atletas y entrenadores reales',
  'Envio express en 24-48h a todo el pais',
  'Pago seguro con Stripe y devoluciones sin complicaciones',
]

export function WhyFitgear() {
  return (
    <section className="relative overflow-hidden">
      {/* Full-bleed editorial background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {/* Lighter overlays: image stays vivid on the right, text legible on the left */}
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
        <div className="fg-drift pointer-events-none absolute -left-32 top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-lime-400/15 blur-[120px]" />
        <div className="fg-drift-slow pointer-events-none absolute bottom-0 right-10 h-[300px] w-[300px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-xl">
          <p data-reveal className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">
            Por que FITGEAR
          </p>
          <h2
            data-reveal
            className="font-display mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-5xl"
          >
            Entrena con equipo
            <br />
            en el que <span className="text-lime-400">confiar</span>
          </h2>
          <p data-reveal className="mt-6 max-w-md text-base leading-relaxed text-slate-300 md:text-lg">
            No vendemos relleno. Cada accesorio del catalogo esta seleccionado para
            durar y rendir, sesion tras sesion.
          </p>

          <ul className="mt-8 space-y-4">
            {points.map((point) => (
              <li key={point} data-reveal className="flex items-start gap-3 text-slate-200">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-400/15 text-lime-400">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-sm leading-relaxed md:text-base">{point}</span>
              </li>
            ))}
          </ul>

          <Link
            data-reveal
            to="/shop"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-lime-400 px-8 py-4 text-sm font-bold uppercase tracking-wide text-slate-900 transition hover:bg-lime-300 hover:shadow-[0_0_36px_-6px_rgba(163,230,53,0.65)]"
          >
            Explora el catalogo
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
