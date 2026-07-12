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
// For non-adminOnly routes, children render unconditionally (original "SSR
// content" behavior — see CustomerGuard) and the effect below redirects once
// Clerk resolves signed-out.
//
// For adminOnly routes, children are withheld unless `isAdmin` is true RIGHT
// NOW — deliberately not gated on clerkLoaded/authLoaded readiness. Clerk's own
// `isLoaded` can flicker false for a beat during sign-out, so a readiness-gated
// check (e.g. "clerkLoaded && !isSignedIn") can miss that exact render and let
// this component fall through to `children` for one frame — long enough for
// AdminDashboardPage's "acceso denegado" card to paint before the redirect
// effect's window.location.assign actually unloads the page. `isAdmin` itself
// doesn't have that gap: it's derived synchronously from `user`/`backendUser`
// (see AuthContext's `role` memo) and flips to false the instant `user` does,
// on sign-out or otherwise. Hiding on anything less than a confirmed `true`
// means the admin dashboard is briefly blank instead of momentarily loaded or
// wrong — same tradeoff CustomerGuard doesn't need since it has no denied-state
// UI to accidentally expose.
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

    const wantsLoginRedirect = !isSignedIn
    const wantsShopRedirect = adminOnly && authLoaded && !isAdmin

    if (!wantsLoginRedirect && !wantsShopRedirect) {
      return
    }

    // Don't navigate on the first bad read — isSignedIn/isAdmin can blip false
    // for a beat (Clerk's background token refresh, or this app's own
    // AuthContext resync) without the session actually being gone. Confirm the
    // condition still holds after a short delay; the effect's cleanup cancels
    // this if isSignedIn/authLoaded/isAdmin change before it fires (i.e. the
    // blip already self-corrected), so only a redirect that's still true ~600ms
    // later actually navigates. A genuine sign-out/non-admin still redirects,
    // just delayed by that much.
    const timeoutId = window.setTimeout(() => {
      if (wantsLoginRedirect) {
        window.location.assign('/login')
      } else if (wantsShopRedirect) {
        window.location.assign('/shop')
      }
    }, 600)

    return () => window.clearTimeout(timeoutId)
  }, [clerkLoaded, isSignedIn, adminOnly, authLoaded, isAdmin])

  if (adminOnly && !isAdmin) {
    return null
  }

  return <>{children}</>
}
