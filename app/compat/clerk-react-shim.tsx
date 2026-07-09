import type { ReactNode } from 'react'
import {
  AuthenticateWithRedirectCallback,
  SignIn,
  SignUp,
  UserButton,
  UserProfile,
  useAuth,
  useUser,
} from '@clerk/tanstack-react-start'

// Compatibility shim: the shared SPA components (Navbar, AuthContext, the auth
// pages) import from '@clerk/clerk-react'. For the TanStack Start build ONLY,
// vite.config.start.ts aliases '@clerk/clerk-react' to this file so those
// components use the TanStack Start Clerk SDK instead. The SPA build keeps using
// the real @clerk/clerk-react.
//
// Note (Phase 1 gotcha): @clerk/tanstack-react-start does NOT export the
// <SignedIn>/<SignedOut> control components, so we recreate them with useUser().
// Unlike those, <SignIn>/<SignUp>/<AuthenticateWithRedirectCallback>/<UserProfile>
// ARE exported directly (core auth components, not framework-router bindings),
// so they're just re-exported as-is (Phase 3, #112).

export { AuthenticateWithRedirectCallback, SignIn, SignUp, UserButton, UserProfile, useAuth, useUser }

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
