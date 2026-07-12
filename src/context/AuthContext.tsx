import { useAuth as useClerkAuth, useUser } from '@clerk/tanstack-react-start'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { setAuthTokenGetter } from '../api/authToken'
import { syncClerkUser } from '../api/fitgearApi'
import { identifyUser, resetUser } from '../lib/posthog'
import type { BackendUser, UserRole } from '../types'

interface AuthContextValue {
  role: UserRole | null
  isAdmin: boolean
  isLoaded: boolean
  backendUser: BackendUser | null
  syncError: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const { getToken } = useClerkAuth()
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null)
  // Starts true (not false): once Clerk resolves with a signed-in user, this
  // context's `isLoaded` must stay false until the sync effect below actually
  // runs and either finishes or determines there's no user — otherwise there's
  // a render where clerk isLoaded=true but syncing hasn't been set yet, making
  // `isLoaded` (= clerkLoaded && !syncing) true with `role` still null. Guards
  // like ProtectedGuard would read that as "loaded, not admin" and redirect
  // before the real role ever loads.
  const [syncing, setSyncing] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Must run before the sync effect below so apiClient already has a token
  // getter by the time syncClerkUser fires — reading window.Clerk directly
  // instead races the post-login redirect and can miss the token entirely.
  useEffect(() => {
    setAuthTokenGetter(user ? getToken : null)
  }, [user, getToken])

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!user) {
      setBackendUser(null)
      setSyncing(false)
      setSyncError(null)
      return
    }

    const email = user.primaryEmailAddress?.emailAddress
    if (!email) {
      setSyncError('No se encontro email principal en la cuenta Clerk.')
      return
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'Usuario FITGEAR'

    let active = true
    setSyncing(true)
    setSyncError(null)

    void syncClerkUser({
      clerkUserId: user.id,
      fullName,
      email,
    })
      .then((savedUser) => {
        if (!active) {
          return
        }
        setBackendUser(savedUser)
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }
        const message = error instanceof Error ? error.message : 'No se pudo sincronizar el usuario.'
        setSyncError(message)
      })
      .finally(() => {
        if (!active) {
          return
        }
        setSyncing(false)
      })

    return () => {
      active = false
    }
    // Keyed on `user?.id`, not `user` itself: Clerk hands out a new `user`
    // object reference on every background session-token refresh (roughly
    // every 50-60s) even though the signed-in identity hasn't changed. Keying
    // on the full object reran this sync (and flipped `isLoaded` false via
    // `syncing`) on that same cadence — with nothing else changing on the
    // page, ProtectedGuard's redirect effect had just enough of a window to
    // catch a stale/transient read and bounce back to /login. `user.id` is
    // stable across a token refresh, so this only reruns on an actual
    // sign-in/sign-out/account switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user?.id])

  // Depends on `user`, not just `backendUser`: when `user` flips to null (sign
  // out), `backendUser` isn't cleared until the effect above runs a render
  // later — without this check, `role` would keep reporting the previous
  // session's role for that one render. On a route like CustomerGuard's
  // (isLoaded && isAdmin -> redirect to /admin), that stale true was enough
  // to bounce a just-signed-out admin from "/" straight back to /admin.
  // HU-34: tie PostHog analytics/errors/replays to the signed-in user. Identify
  // once the backend user (with role) is synced; reset on sign-out. Keyed on the
  // identifying fields so it fires per sign-in/out, not on every render.
  useEffect(() => {
    if (user && backendUser) {
      identifyUser(user.id, { email: backendUser.email, role: backendUser.role })
    } else if (!user) {
      resetUser()
    }
  }, [user, backendUser])

  const role: UserRole | null = useMemo(() => {
    if (!user) {
      return null
    }
    return backendUser?.role ?? null
  }, [backendUser, user])

  const value = useMemo(() => {
    return {
      role,
      isAdmin: role === 'ADMIN',
      isLoaded: isLoaded && !syncing,
      backendUser,
      syncError,
    }
  }, [backendUser, isLoaded, role, syncError, syncing])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
