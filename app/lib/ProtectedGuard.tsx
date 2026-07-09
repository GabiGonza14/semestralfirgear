import { useEffect, type ReactNode } from 'react'
import { useUser } from '@clerk/tanstack-react-start'
import { useAuth } from '../../src/context/AuthContext'

// TanStack Start re-implementation of src/routes/ProtectedRoute.tsx.
//
// The original used <SignedIn>/<SignedOut> from @clerk/clerk-react (not exported
// by the TanStack Start SDK) to redirect signed-out visitors to /login, and
// signed-in non-admins away from adminOnly pages. Here we drive that off Clerk's
// own useUser() for sign-in state, plus useAuth()'s isAdmin (backend role sync,
// see AuthContext) for the adminOnly check — same split CustomerGuard uses.
//
// Children are ALWAYS rendered so the page is real SSR content; the redirect
// happens client-side once auth state resolves, same pattern as CustomerGuard.
export function ProtectedGuard({
  children,
  adminOnly = false,
}: {
  children: ReactNode
  adminOnly?: boolean
}) {
  const { isLoaded: clerkLoaded, isSignedIn } = useUser()
  const { isLoaded: authLoaded, isAdmin } = useAuth()

  useEffect(() => {
    if (!clerkLoaded || typeof window === 'undefined') {
      return
    }
    if (!isSignedIn) {
      window.location.assign('/login')
      return
    }
    if (adminOnly && authLoaded && !isAdmin) {
      window.location.assign('/shop')
    }
  }, [clerkLoaded, isSignedIn, adminOnly, authLoaded, isAdmin])

  return <>{children}</>
}
