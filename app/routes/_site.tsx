import { useEffect } from 'react'
import { Outlet, createFileRoute, useLocation } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../../src/context/AuthContext'
import { CartProvider, useCart } from '../../src/context/CartContext'
import { Navbar } from '../../src/components/Navbar'
import { Footer } from '../../src/components/Footer'
import { CartDrawer } from '../../src/components/cart/CartDrawer'
import { queryClient } from '../../src/lib/queryClient'
import { CustomerGuard } from '../lib/CustomerGuard'

// Pathless layout route (migrated from src/layouts/SiteLayout.tsx): wraps the
// public routes in the site chrome (Navbar / Footer / cart drawer) plus the
// Auth + Cart providers the shared components rely on. The Clerk provider itself
// lives higher up, in __root.tsx.
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
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      {isLanding ? (
        // Landing owns its full-bleed dark sections end to end.
        <main className="flex-1">
          <CustomerGuard>
            <Outlet />
          </CustomerGuard>
        </main>
      ) : (
        // Every other page: contained, dark surface.
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <CustomerGuard>
              <Outlet />
            </CustomerGuard>
          </div>
        </main>
      )}

      <Footer />
      <CartDrawer />
    </div>
  )
}
