import { Link } from '@tanstack/react-router'
import type { ReactElement } from 'react'

interface Program {
  title: string
  body: string
  to: string
  search?: { category: string }
  icon: ReactElement
  /** Per-card accent classes — full strings so Tailwind keeps them. */
  tile: string
  glow: string
  ring: string
  link: string
}

const icon = 'h-6 w-6'

// Training goals mapped to real catalog categories so every card deep-links into
// a working /shop filter. Each goal gets its own accent for colour variety while
// lime stays the lead brand hue.
const programs: Program[] = [
  {
    title: 'Fuerza',
    body: 'Mancuernas y cargas para desarrollar potencia y masa muscular de forma progresiva.',
    to: '/shop',
    search: { category: 'Pesas' },
    tile: 'bg-lime-400 text-slate-900',
    glow: 'hover:shadow-[0_28px_60px_-30px_rgba(163,230,53,0.5)]',
    ring: 'hover:border-lime-400/40',
    link: 'text-lime-400 hover:text-lime-300',
    icon: (
      <svg className={icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 8v8M7 6v12M17 6v12M20 8v8M7 12h10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Resistencia',
    body: 'Bandas elasticas y accesorios funcionales para trabajar fuerza-resistencia en cualquier lugar.',
    to: '/shop',
    search: { category: 'Bandas' },
    tile: 'bg-cyan-400 text-slate-900',
    glow: 'hover:shadow-[0_28px_60px_-30px_rgba(34,211,238,0.5)]',
    ring: 'hover:border-cyan-400/40',
    link: 'text-cyan-300 hover:text-cyan-200',
    icon: (
      <svg className={icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 12h3l2.5 6L13 4l2.5 9 1.5-3H21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Movilidad',
    body: 'Colchonetas y rodillos para flexibilidad, recuperacion y entrenamiento de piso.',
    to: '/shop',
    search: { category: 'Colchonetas' },
    tile: 'bg-violet-400 text-slate-900',
    glow: 'hover:shadow-[0_28px_60px_-30px_rgba(167,139,250,0.5)]',
    ring: 'hover:border-violet-400/40',
    link: 'text-violet-300 hover:text-violet-200',
    icon: (
      <svg className={icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.9" />
        <path d="M5 21l3-6 4 1 4-3M8 15l-1-4 5-1 3 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Cardio',
    body: 'Cuerdas y herramientas ligeras para quemar calorias y mejorar tu capacidad aerobica.',
    to: '/shop',
    search: { category: 'Accesorios' },
    tile: 'bg-amber-400 text-slate-900',
    glow: 'hover:shadow-[0_28px_60px_-30px_rgba(251,191,36,0.5)]',
    ring: 'hover:border-amber-400/40',
    link: 'text-amber-300 hover:text-amber-200',
    icon: (
      <svg className={icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M3 13h4l2 5 4-12 2 7h6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export function ProgramCards() {
  return (
    <section>
      <div data-reveal className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">
          Nuestros programas
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Explora por objetivo
        </h2>
        <p className="mt-3 text-slate-400">
          Elige tu meta y te llevamos directo al equipo que necesitas para lograrla.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {programs.map((program) => (
          <div
            key={program.title}
            data-reveal
            className={`group flex flex-col rounded-3xl border border-white/[0.07] bg-white/[0.03] p-7 transition duration-300 hover:-translate-y-1.5 hover:bg-white/[0.05] ${program.ring} ${program.glow}`}
          >
            <div
              className={`mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-110 group-hover:-rotate-3 ${program.tile}`}
            >
              {program.icon}
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">{program.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{program.body}</p>
            <Link
              to={program.to}
              search={program.search}
              className={`mt-6 inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide transition ${program.link}`}
            >
              Ver mas
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
