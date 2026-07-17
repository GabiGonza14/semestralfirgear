import { SignIn, useAuth } from '@clerk/tanstack-react-start'
import { Navigate } from '@tanstack/react-router'
import { AuthPageShell } from '../components/auth/AuthPageShell'
import { clerkDarkAppearance } from '../lib/clerkAppearance'

export function LoginPage() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Navigate to="/post-login" replace />
  }

  return (
    <AuthPageShell>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido de vuelta</h1>
        <p className="mt-2 text-sm text-slate-400">
          Inicia sesión para continuar con tu entrenamiento.
        </p>
      </div>
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        forceRedirectUrl="/post-login"
        appearance={clerkDarkAppearance}
      />
    </AuthPageShell>
  )
}
