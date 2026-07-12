import { useUser } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useCart } from '../context/CartContext'

const shopLinks: Array<{ label: string; to: string; search?: { category: string } }> = [
  { label: 'Pesas', to: '/shop', search: { category: 'Pesas' } },
  { label: 'Bandas', to: '/shop', search: { category: 'Bandas' } },
  { label: 'Colchonetas', to: '/shop', search: { category: 'Colchonetas' } },
  { label: 'Ver todo', to: '/shop' },
]

const accountLinks = [
  { label: 'Mis pedidos', to: '/orders' },
  { label: 'Mi cuenta', to: '/account' },
]

export function Footer() {
  const { openCart } = useCart()
  const { isSignedIn } = useUser()
  const visibleAccountLinks = accountLinks.filter((link) => link.to !== '/orders' || isSignedIn)

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
          </div>

          {/* Shop links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-lime-400 mb-4">
              Tienda
            </h3>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    search={link.search}
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
              {visibleAccountLinks.map((link) => (
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
