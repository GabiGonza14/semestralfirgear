import { useState } from 'react'
import { UserButton, useUser } from '@clerk/tanstack-react-start'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isLoaded: clerkLoaded, isSignedIn } = useUser()
  const { isAdmin } = useAuth()
  const { items, openCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)
  const shouldReloadDocument = location.pathname.startsWith('/checkout/')
  const homePath = isAdmin ? '/admin' : '/'

  function navigateTo(path: string) {
    setMobileOpen(false)
    if (shouldReloadDocument) {
      window.location.assign(path)
      return
    }
    navigate({ to: path })
  }

  return (
    <header className="sticky top-0 z-50 bg-slate-950/92 backdrop-blur-md border-b border-white/[0.06]">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-0 sm:px-6 lg:px-8 h-16">

        {/* Logo */}
        <button
          type="button"
          onClick={() => navigateTo(homePath)}
          className="shrink-0 text-left text-xl font-black uppercase tracking-widest"
        >
          <span className="text-white">FIT</span>
          <span className="text-lime-400">GEAR</span>
        </button>

        {/* Desktop nav links */}
        <nav className="hidden md:flex flex-1 items-center gap-1 ml-6">
          {!isAdmin && (
            <>
              <Link
                to="/shop"
                className="px-4 py-2 text-sm font-semibold transition rounded-full"
                activeProps={{ className: 'text-lime-400' }}
                inactiveProps={{ className: 'text-slate-300 hover:text-white hover:bg-white/5' }}
              >
                Tienda
              </Link>
              {isSignedIn && (
                <Link
                  to="/orders"
                  className="px-4 py-2 text-sm font-semibold transition rounded-full"
                  activeProps={{ className: 'text-lime-400' }}
                  inactiveProps={{ className: 'text-slate-300 hover:text-white hover:bg-white/5' }}
                >
                  Mis pedidos
                </Link>
              )}
            </>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="px-4 py-2 text-sm font-semibold transition rounded-full"
              activeProps={{ className: 'text-red-400' }}
              inactiveProps={{ className: 'text-red-400/70 hover:text-red-400 hover:bg-red-500/10' }}
            >
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Shop link (mobile shortcut) */}
          {!isAdmin && (
            <Link
              to="/shop"
              className="hidden sm:inline-flex md:hidden items-center gap-1.5 rounded-full bg-lime-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
            >
              Tienda
            </Link>
          )}

          {clerkLoaded && !isSignedIn ? (
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              aria-label="Iniciar sesion"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-lime-400/40 hover:text-white hover:bg-white/5"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 1 0-14 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}

          {isSignedIn ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9 ring-2 ring-lime-400/40',
                },
              }}
              userProfileUrl={isAdmin ? '/admin' : '/account'}
            />
          ) : null}

          {!isAdmin && (
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                openCart()
              }}
              aria-label="Ver carrito"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:border-lime-400/40 hover:text-white hover:bg-white/5"
            >
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 4h2l2.4 11.5a1 1 0 0 0 1 .8h9.9a1 1 0 0 0 1-.8L21 7H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="10" cy="20" r="1" fill="currentColor" />
                <circle cx="18" cy="20" r="1" fill="currentColor" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-lime-400 px-1 text-[10px] font-black text-slate-900">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Cerrar menu' : 'Abrir menu'}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-300 transition hover:bg-white/5"
          >
            {mobileOpen ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-slate-950 px-4 py-3 space-y-1">
          {!isAdmin && (
            <>
              <button
                type="button"
                onClick={() => navigateTo('/shop')}
                className="block w-full text-left rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Tienda
              </button>
              {isSignedIn && (
                <button
                  type="button"
                  onClick={() => navigateTo('/orders')}
                  className="block w-full text-left rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  Mis pedidos
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateTo('/account')}
                className="block w-full text-left rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Mi cuenta
              </button>
            </>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigateTo('/admin')}
              className="block w-full text-left rounded-xl px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Admin Panel
            </button>
          )}
        </div>
      )}
    </header>
  )
}
