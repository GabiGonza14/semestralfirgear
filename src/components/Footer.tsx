import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const shopLinks = [
  { label: 'Pesas', to: '/shop?category=Pesas' },
  { label: 'Bandas', to: '/shop?category=Bandas' },
  { label: 'Colchonetas', to: '/shop?category=Colchonetas' },
  { label: 'Ver todo', to: '/shop' },
]

const accountLinks = [
  { label: 'Mis pedidos', to: '/orders' },
  { label: 'Mi cuenta', to: '/account' },
]

export function Footer() {
  const { openCart } = useCart()

  return (
    <footer className="bg-slate-950 border-t border-white/[0.06]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer grid */}
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="text-2xl font-black uppercase tracking-widest">
              <span className="text-white">FIT</span>
              <span className="text-lime-400">GEAR</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Accesorios fitness premium para quienes toman su entrenamiento en serio.
              Envios rapidos, calidad garantizada.
            </p>
            <div className="mt-6 flex gap-3">
              {/* TODO: reemplazar por <a href> al perfil social real. */}
              <button
                type="button"
                aria-label="Instagram"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-lime-400/40 hover:text-lime-400"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                </svg>
              </button>
              {/* TODO: reemplazar por <a href> al perfil social real. */}
              <button
                type="button"
                aria-label="Twitter / X"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-slate-400 transition hover:border-lime-400/40 hover:text-lime-400"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400 mb-4">
              Shop
            </h3>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400 mb-4">
              Mi cuenta
            </h3>
            <ul className="space-y-3">
              {accountLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openCart}
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Carrito
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] py-6 sm:flex-row">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} FITGEAR. Todos los derechos reservados.
          </p>
          <p className="text-xs text-slate-400">
            Pagos seguros con{' '}
            <span className="text-slate-400 font-semibold">Stripe</span>
            {' · '}
            Autenticacion con{' '}
            <span className="text-slate-400 font-semibold">Clerk</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
