import { SignedIn, SignedOut } from '@clerk/clerk-react'
import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactElement
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const location = useLocation()
  const { isLoaded, isAdmin } = useAuth()

  if (!isLoaded) {
    return (
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-slate-200">
        Cargando sesion...
      </section>
    )
  }

  return (
    <>
      <SignedOut>
        <Navigate to="/login" replace state={{ from: location.pathname }} />
      </SignedOut>
      <SignedIn>
        {adminOnly && !isAdmin ? <Navigate to="/shop" replace /> : children}
      </SignedIn>
    </>
  )
}
