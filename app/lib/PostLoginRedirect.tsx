import { useEffect } from 'react'
import { useAuth } from '../../src/context/AuthContext'

// Landing spot for Clerk's forceRedirectUrl after sign-in/sign-up (see
// LoginPage/SignUpPage). Clerk resolves before our backend role sync does, so
// it can't redirect straight to /admin — previously forceRedirectUrl pointed
// at "/", which meant every admin briefly saw the full LandingPage (with its
// API-driven sections) before CustomerGuard's effect caught up and bounced
// them to /admin. This route renders nothing but a spinner instead, and
// forwards once the role is known: admins to /admin, everyone else to the
// real landing page.
export function PostLoginRedirect() {
  const { isLoaded, isAdmin } = useAuth()

  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') {
      return
    }
    window.location.assign(isAdmin ? '/admin' : '/')
  }, [isLoaded, isAdmin])

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <p className="text-sm text-slate-400">Verificando tu sesión...</p>
    </div>
  )
}
