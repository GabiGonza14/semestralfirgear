import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'
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
  const [syncing, setSyncing] = useState(false)
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
  }, [isLoaded, user])

  const role: UserRole | null = useMemo(() => {
    return backendUser?.role ?? null
  }, [backendUser])

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
