import { createFileRoute } from '@tanstack/react-router'
import { SignInButton, SignOutButton, UserButton, useUser } from '@clerk/tanstack-react-start'

// Single minimal test route for Phase 1. It renders a unique server-side marker
// string (asserted against the raw HTML / "view source" to prove real SSR) plus
// a basic Clerk sign-in / sign-out interaction to confirm Clerk initializes in
// the new entrypoint. No real FITGEAR pages are migrated in this phase (#107).
//
// Note: this beta build of @clerk/tanstack-react-start does NOT export the
// <SignedIn>/<SignedOut> control components, so we gate on the exported
// useUser() hook instead. The SSR marker below sits OUTSIDE that gate, so it is
// always server-rendered regardless of Clerk's client-side load state.
export const Route = createFileRoute('/')({
  component: Home,
})

const SSR_MARKER = 'FITGEAR TanStack Start SSR OK — Fase 1'

function Home() {
  const { isLoaded, isSignedIn } = useUser()

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5 }}>
      <h1>FITGEAR — TanStack Start</h1>
      {/* Must appear in the initial server response (view source), not only
          after hydration — this is the SSR verification marker. */}
      <p data-testid="ssr-marker">{SSR_MARKER}</p>

      <section style={{ marginTop: '1.5rem' }}>
        {!isLoaded ? (
          <p>Cargando Clerk…</p>
        ) : isSignedIn ? (
          <>
            <p>Sesión iniciada.</p>
            <UserButton />
            <SignOutButton>
              <button type="button">Cerrar sesión</button>
            </SignOutButton>
          </>
        ) : (
          <>
            <p>No has iniciado sesión.</p>
            <SignInButton mode="modal">
              <button type="button">Iniciar sesión</button>
            </SignInButton>
          </>
        )}
      </section>
    </main>
  )
}
