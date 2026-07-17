import { SignUp, useAuth } from '@clerk/tanstack-react-start'
import { Navigate } from '@tanstack/react-router'
import { AuthPageShell } from '../components/auth/AuthPageShell'
import { clerkDarkAppearance } from '../lib/clerkAppearance'

export function SignUpPage() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Navigate to="/post-login" replace />
  }

  return (
    <AuthPageShell>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Crea tu cuenta</h1>
        <p className="mt-2 text-sm text-slate-400">
          Únete a FITGEAR y equipa tu entrenamiento.
        </p>
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/login"
        forceRedirectUrl="/post-login"
        appearance={clerkDarkAppearance}
      />
    </AuthPageShell>
  )
}
