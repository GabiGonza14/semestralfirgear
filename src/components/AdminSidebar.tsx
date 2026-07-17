import type { ReactNode } from 'react'
import { SignOutButton, UserButton, useUser } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'

type AdminSection =
  | 'overview'
  | 'inventory'
  | 'categories'
  | 'orders'
  | 'users'
  | 'reviews'
  | 'audit'

interface AdminSidebarProps {
  active: AdminSection
  onChange: (section: AdminSection) => void
}

const sections: AdminSection[] = [
  'overview',
  'inventory',
  'categories',
  'orders',
  'users',
  'reviews',
  'audit',
]

const sectionLabels: Record<AdminSection, string> = {
  overview: 'Resumen',
  inventory: 'Inventario',
  categories: 'Categorías',
  orders: 'Órdenes',
  users: 'Usuarios',
  reviews: 'Reseñas',
  audit: 'Auditoría',
}

function SectionIcon({ section }: Readonly<{ section: AdminSection }>): ReactNode {
  switch (section) {
    case 'overview':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="10" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
    case 'inventory':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 8l9-5 9 5-9 5-9-5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M12 13v8" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )
    case 'categories':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M11.3 3.3 20 12l-8 8-8.7-8.7A2 2 0 0 1 3 9.9V4a1 1 0 0 1 1-1h5.9a2 2 0 0 1 1.4.6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" />
        </svg>
      )
    case 'orders':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M16 4.2a3.2 3.2 0 0 1 0 6.2M21 20c0-2.8-2-5.1-4.7-5.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
    case 'reviews':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9L12 17l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'audit':
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

// Self-contained app shell: FITGEAR admin has no top navbar (removed so the
// fixed sidebar owns the full viewport height) — the logo lives at the top of
// the sidebar instead, and account access (Clerk UserButton) lives at the
// bottom, where the shared Navbar used to put it.
export function AdminSidebar({ active, onChange }: Readonly<AdminSidebarProps>) {
  const { user } = useUser()

  return (
    <aside className="flex h-full flex-col overflow-y-auto border-r border-white/10 bg-slate-950 sm:sticky sm:top-0">
      <div className="border-b border-white/10 px-5 py-5">
        <Link to="/admin" className="text-lg font-black uppercase tracking-widest">
          <span className="text-white">FIT</span>
          <span className="text-lime-400">GEAR</span>
        </Link>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Panel admin
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => onChange(section)}
            aria-current={active === section ? 'page' : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
              active === section
                ? 'bg-lime-400 text-slate-950'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="h-5 w-5 shrink-0 [&>svg]:h-full [&>svg]:w-full">
              <SectionIcon section={section} />
            </span>
            {sectionLabels[section]}
          </button>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <SignOutButton redirectUrl="/login">
          <button
            type="button"
            className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cerrar sesión
          </button>
        </SignOutButton>
        <div className="flex items-center gap-2.5 px-3">
          <UserButton
            appearance={{ elements: { avatarBox: 'h-8 w-8 ring-2 ring-lime-400/40' } }}
            userProfileUrl="/admin/account"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {user?.fullName ?? 'Mi cuenta'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {user?.primaryEmailAddress?.emailAddress ?? ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
