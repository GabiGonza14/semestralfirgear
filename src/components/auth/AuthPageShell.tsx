import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { CursorSpotlight } from '../CursorSpotlight'
import { SectionDecor } from '../SectionDecor'

// Shared shell for Login/SignUp: same header, background and centered
// wrapper on both — only the title, description and Clerk widget differ,
// which the caller passes as children.
//
// `min-h-dvh` (not `min-h-screen`): on short windows the previous fixed
// viewport unit could measure smaller than the actual rendered content
// (title + Clerk card), pushing the section taller than one screen and
// throwing off the vertical centering. `dvh` tracks the real visible
// viewport instead.
export function AuthPageShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <section className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Lime ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-lime-400/10 blur-[120px]" />

      {/* Dot texture, same pattern as Shop — dim base layer edge-to-edge,
          brighter masked layer on top — plus a cursor-follow spotlight that
          Shop doesn't have (see CursorSpotlight). */}
      <SectionDecor pattern="dots" dotOpacity={0.16} glowA="bg-lime-400/5" glowB="bg-cyan-500/5" />
      <SectionDecor pattern="dots" dotOpacity={0.36} glowA="bg-lime-400/6" glowB="bg-cyan-500/6" />
      <CursorSpotlight />

      <header className="relative flex h-16 items-center border-b border-white/[0.06] px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al inicio
        </Link>

        <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-black uppercase tracking-widest">
          <span className="text-white">FIT</span>
          <span className="text-lime-400">GEAR</span>
        </p>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </section>
  )
}
