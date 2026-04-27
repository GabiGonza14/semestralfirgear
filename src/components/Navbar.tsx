import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import fitGearLogo from '../assets/images/FitGear_Logo.png'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { items } = useCart()
  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0)
  const shouldReloadDocument = location.pathname.startsWith('/checkout/')
  const homePath = isAdmin ? '/admin' : '/'
  const showBackButton = location.pathname !== '/'

  function navigateTo(path: string) {
    if (shouldReloadDocument) {
      window.location.assign(path)
      return
    }
    navigate(path)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/90 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <div className="w-[78px] sm:w-[90px]">
            {showBackButton ? (
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:border-lime-300 hover:bg-lime-50 hover:text-lime-700"
                aria-label="Volver al inicio"
              >
                <span aria-hidden>←</span>
                <span>Atras</span>
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => navigateTo(homePath)}
            className="group inline-flex items-center text-left"
            aria-label="Ir al inicio"
          >
            <img
              src={fitGearLogo}
              alt="Fit Gear"
              className="h-12 w-auto object-contain transition group-hover:scale-[1.02] sm:h-14"
            />
          </button>
        </div>

        <div className="hidden flex-1 md:flex" aria-hidden />

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <NavLink
              to="/admin"
              className="rounded-full px-4 py-2 text-sm font-semibold text-lime-700 transition hover:bg-lime-50"
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-lime-300 hover:bg-lime-50"
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
                  avatarBox: 'h-10 w-10 ring-2 ring-lime-300/80',
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
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-lime-300 hover:bg-lime-50"
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
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-lime-500 px-1 text-[10px] font-bold text-slate-900">
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
