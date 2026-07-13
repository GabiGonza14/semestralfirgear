import { SignIn, useAuth } from '@clerk/tanstack-react-start'
import { Link, Navigate } from '@tanstack/react-router'
import { clerkDarkAppearance } from '../lib/clerkAppearance'

export function LoginPage() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Navigate to="/post-login" replace />
  }

  return (
    <section className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Lime ambient glow */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-lime-400/10 blur-[120px]" />

      <header className="relative flex h-16 items-center border-b border-white/[0.06] px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver al inicio
        </Link>

        <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-black uppercase tracking-widest">
          <span className="text-white">FIT</span>
          <span className="text-lime-400">GEAR</span>
        </p>
      </header>

      <div className="relative flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido de vuelta</h1>
            <p className="mt-2 text-sm text-slate-400">
              Inicia sesion para continuar con tu entrenamiento.
            </p>
          </div>
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            forceRedirectUrl="/post-login"
            appearance={clerkDarkAppearance}
          />
        </div>
      </div>
    </section>
  )
}
