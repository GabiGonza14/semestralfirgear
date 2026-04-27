import { CTAButton } from './CTAButton'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 px-6 py-16 shadow-2xl shadow-lime-500/10 sm:px-10">
      <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-lime-400/20 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-56 w-56 rounded-full bg-lime-300/15 blur-3xl" />

      <div className="relative z-10 max-w-3xl">
        <p className="mb-4 inline-flex rounded-full border border-lime-400/40 bg-lime-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-lime-200">
          FITGEAR Performance Store
        </p>
        <h1 className="text-4xl font-black uppercase leading-tight text-white sm:text-6xl">
          Equipa tu entrenamiento, supera tu limite.
        </h1>
        <p className="mt-5 text-lg text-slate-200">
          Accesorios fitness para atletas reales: fuerza, movilidad y cardio con
          calidad premium y experiencia de compra rapida.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CTAButton to="/shop">Comprar ahora</CTAButton>
          <CTAButton to="/shop" variant="secondary">
            Explorar catalogo
          </CTAButton>
        </div>
      </div>
    </section>
  )
}
