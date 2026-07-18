import { useEffect } from 'react'
import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from '../../src/context/AuthContext'
import { CartProvider, useCart } from '../../src/context/CartContext'
import { Navbar } from '../../src/components/Navbar'
import { Footer } from '../../src/components/Footer'
import { CartDrawer } from '../../src/components/cart/CartDrawer'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'
import { SiteMainContent } from '../../src/components/SiteMainContent'
import { queryClient } from '../../src/lib/queryClient'

// Pathless layout route (migrated from src/layouts/SiteLayout.tsx): wraps every
// child route in the site chrome (Navbar / Footer / cart drawer) plus the Auth +
// Cart providers the shared components rely on. The Clerk provider itself lives
// higher up, in __root.tsx.
//
// This layout is purely chrome — it does NOT apply CustomerGuard/ProtectedGuard.
// The original SPA nests /sso-callback (and /admin) under SiteLayout without
// CustomerRoute, so guards are composed per leaf route instead (see
// _site.index.tsx, _site.orders.tsx, etc.), matching AppRouter.tsx exactly.
export const Route = createFileRoute('/_site')({
  component: SiteLayoutRoute,
})

function SiteLayoutRoute() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <SiteChrome />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

function SiteChrome() {
  const location = useLocation()
  const isLanding = location.pathname === '/'
  const isPostLogin = location.pathname === '/post-login'
  const isAdminPage = location.pathname.startsWith('/admin')
  // Address + payment entry shouldn't compete with site chrome for attention
  // (and shouldn't offer an easy scroll-away exit mid-payment) — deliberately
  // scoped to exactly /checkout (not /checkout/success or /checkout/cancel,
  // which aren't "the moment of paying").
  const isCheckoutPage = location.pathname === '/checkout'
  const isShopPage = location.pathname === '/shop'
  const { isLoaded: authLoaded, isAdmin } = useAuth()
  // Admin role sync (backend) resolves after Clerk itself, so /admin briefly
  // renders with no known role yet — and after a logout, isAdmin flips false
  // a beat before ProtectedGuard's redirect actually navigates away. Both are
  // transient: show just the logo instead of a full Navbar/Footer around an
  // empty sidebar (or a flash of the "acceso denegado" card).
  const isAdminBooting = isAdminPage && (!authLoaded || !isAdmin)
  const { closeCart } = useCart()

  // Reset scroll on navigation (client-only; TanStack keeps the old position
  // otherwise), mirroring the original SiteLayout.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Navigating away closes the cart drawer instead of leaving it open.
  useEffect(() => {
    closeCart()
  }, [location.pathname, closeCart])

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={
        // `flex-1` on the admin <main> below relies on `flex-basis: 0` to size
        // itself via flex-grow — which means its own `h-dvh` is ignored by the
        // flex algorithm unless THIS container has a definite height (not just
        // a min-height floor) to distribute. Without a real ceiling here, main
        // — and the whole document — just grows to fit content, and the
        // "only the white pane scrolls" shell silently stops working.
        isAdminPage
          ? 'flex min-h-screen flex-col bg-slate-950 text-slate-100 sm:h-dvh sm:overflow-hidden'
          : 'flex min-h-screen flex-col bg-slate-950 text-slate-100'
      }
    >
      {isPostLogin || isAdminBooting || isAdminPage ? null : <Navbar minimal={isCheckoutPage} />}

      {isAdminBooting ? (
        <main className="flex flex-1 items-center justify-center">
          <span className="text-2xl font-black uppercase tracking-widest">
            <span className="text-white">FIT</span>
            <span className="text-lime-400">GEAR</span>
          </span>
          {/* Outlet stays mounted (just hidden) so ProtectedGuard's redirect
              effect still runs — unmounting it here would strand the user on
              this splash forever instead of bouncing them to /login or /shop. */}
          <div className="hidden">
            <Outlet />
          </div>
        </main>
      ) : isLanding ? (
        // Landing owns its full-bleed dark sections end to end.
        // HU-36: the ErrorBoundary wraps ONLY the routed page (<Outlet />), never
        // Navbar/Footer (rendered as siblings below), so a page-level crash shows
        // the fallback WITH the site chrome intact (criterion 3) — verified live in
        // a real browser, not just by unit test. resetKey is a best-effort reset on
        // navigation, not a guaranteed one (TanStack Router doesn't always remount
        // the routed page after an in-app nav away from a mid-error route) — the
        // fallback's "Recargar página" button is the reliable recovery path.
        <main className="flex-1">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      ) : (
        // Every other page: contained, dark surface. Admin is the one
        // exception — no shared Navbar (AdminSidebar owns its own logo/account
        // instead, see AdminSidebar.tsx), height-capped to the full viewport
        // and non-scrolling from sm+, so the sidebar can stay fixed while only
        // its own content pane scrolls. Below sm (narrow phones) it falls back
        // to normal document flow (stacked sidebar + content, whole page
        // scrolls) — the fixed-shell pattern is desktop-oriented by nature,
        // same as the reference dashboard this was modeled on.
        <SiteMainContent
          isAdminPage={isAdminPage}
          isShopPage={isShopPage}
          isCheckoutPage={isCheckoutPage}
          pathname={location.pathname}
        />
      )}

      {isPostLogin || isAdminPage || isCheckoutPage ? null : <Footer />}
      <CartDrawer />
    </div>
    </MotionConfig>
  )
}
