import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { items } = useCart()
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)
  const shouldReloadDocument = location.pathname.startsWith('/checkout/')
  const homePath = isAdmin ? '/admin' : '/'

  function navigateTo(path: string) {
    if (shouldReloadDocument) {
      window.location.assign(path)
      return
    }
    navigate(path)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigateTo(homePath)}
          className="shrink-0 text-left text-xl font-black uppercase tracking-wider text-gray-900"
        >
          FITGEAR
        </button>

        <div className="flex flex-1" aria-hidden>
          <div className="flex h-11 w-full items-center rounded-full border border-transparent px-4 opacity-0">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
              <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <NavLink
              to="/admin"
              className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              Admin
            </NavLink>
          ) : (
            <NavLink
              to="/orders"
              className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 md:inline-flex"
            >
              Mis pedidos
            </NavLink>
          )}

          <SignedOut>
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              aria-label="Iniciar sesion"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 1 0-14 0"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </SignedOut>

          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-10 w-10 ring-2 ring-red-500/60',
                },
              }}
              userProfileUrl={isAdmin ? '/admin' : '/account'}
            />
          </SignedIn>

          {!isAdmin ? (
            <button
              type="button"
              onClick={() => navigateTo('/cart')}
              aria-label="Ir al carrito"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:bg-gray-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
