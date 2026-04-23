import { SignIn, useAuth } from '@clerk/clerk-react'
import { Link, Navigate } from 'react-router-dom'

export function LoginPage() {
  const { isSignedIn } = useAuth()

  if (isSignedIn) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="flex min-h-screen flex-col bg-gray-50">
      <header className="relative flex h-16 items-center border-b border-gray-200 px-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-600 transition hover:text-gray-900"
        >
          <span aria-hidden>←</span>
          <span>Volver al inicio</span>
        </Link>

        <p className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-[0.18em] text-gray-900 sm:text-xl">
          FITGEAR
        </p>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            forceRedirectUrl="/"
          />
        </div>
      </div>
    </section>
  )
}
