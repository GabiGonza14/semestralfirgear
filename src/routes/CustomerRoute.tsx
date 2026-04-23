import { SignedIn, SignedOut } from '@clerk/clerk-react'
import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface CustomerRouteProps {
  children: ReactElement
}

export function CustomerRoute({ children }: CustomerRouteProps) {
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
      <SignedOut>{children}</SignedOut>
      <SignedIn>{isAdmin ? <Navigate to="/admin" replace /> : children}</SignedIn>
    </>
  )
}