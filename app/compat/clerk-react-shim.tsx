import type { ReactNode } from 'react'
import { UserButton, useAuth, useUser } from '@clerk/tanstack-react-start'

// Compatibility shim: the shared SPA components (Navbar, AuthContext) import
// from '@clerk/clerk-react'. For the TanStack Start build ONLY,
// vite.config.start.ts aliases '@clerk/clerk-react' to this file so those
// components use the TanStack Start Clerk SDK instead. The SPA build keeps using
// the real @clerk/clerk-react.
//
// Note (Phase 1 gotcha): @clerk/tanstack-react-start does NOT export the
// <SignedIn>/<SignedOut> control components, so we recreate them with useUser().

export { UserButton, useAuth, useUser }

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser()
  return isSignedIn ? <>{children}</> : null
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser()
  // Match Clerk's behaviour: only reveal signed-out UI once Clerk has loaded,
  // so we never briefly flash it for a user who is actually signed in.
  return isLoaded && !isSignedIn ? <>{children}</> : null
}
