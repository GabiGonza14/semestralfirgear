import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../../src/context/AuthContext'

// TanStack Start re-implementation of src/routes/CustomerRoute.tsx.
//
// The original used <SignedIn>/<SignedOut> from @clerk/clerk-react (not exported
// by the TanStack Start SDK) to redirect a signed-in ADMIN away from the public
// customer pages toward /admin. Here we drive that off useAuth()'s isAdmin
// (which itself resolves the backend role via useUser() — see AuthContext).
//
// Crucially, children are ALWAYS rendered so the page is real SSR content (the
// admin check only resolves client-side after Clerk + the backend sync load);
// an admin is redirected client-side once that resolves. /admin isn't migrated
// yet (Phase 4, #107) — the redirect intentionally targets it for forward
// compatibility.
export function CustomerGuard({ children }: { children: ReactNode }) {
  const { isLoaded, isAdmin } = useAuth()

  useEffect(() => {
    if (isLoaded && isAdmin && typeof window !== 'undefined') {
      window.location.assign('/admin')
    }
  }, [isLoaded, isAdmin])

  return <>{children}</>
}
