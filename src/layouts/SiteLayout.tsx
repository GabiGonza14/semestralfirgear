import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { Navbar } from '../components/Navbar'

export function SiteLayout() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  // Plain BrowserRouter doesn't reset scroll on navigation — without this,
  // clicking into a new page (e.g. a related product) keeps the old scroll
  // position instead of starting at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      {isLanding ? (
        // Landing owns its full-bleed dark sections end to end.
        <main className="flex-1">
          <Outlet />
        </main>
      ) : (
        // Every other page: contained, dark surface.
        <main className="flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <Outlet />
          </div>
        </main>
      )}

      <Footer />
    </div>
  )
}
