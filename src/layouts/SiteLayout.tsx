import { Outlet } from 'react-router-dom'
import { Footer } from '../components/Footer'
import { HomeCategoryNav } from '../components/HomeCategoryNav'
import { Navbar } from '../components/Navbar'
import { useLocation } from 'react-router-dom'

export function SiteLayout() {
  const location = useLocation()
  const showHomeCategoryNav = location.pathname === '/'

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      {showHomeCategoryNav ? <HomeCategoryNav /> : null}
      <main className="mx-auto w-full max-w-[95%] px-2 py-8 sm:px-3 lg:px-3">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
