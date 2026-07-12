import posthog from 'posthog-js'

// HU-34: PostHog client-side wiring. Initialized once (see PostHogProvider in
// app/routes/__root.tsx). Reads the project key/host from Vite-inlined env vars —
// the project API key is public by design (it ships in the browser bundle, same as
// VITE_CLERK_PUBLISHABLE_KEY), but we still read it from env instead of hardcoding.

let initialized = false

const DEFAULT_HOST = 'https://us.i.posthog.com'

// Idempotent, client-only. No-ops during SSR (no window) and when the key is
// absent (graceful degradation — the app must work with analytics disabled).
export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') {
    return
  }

  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) {
    return
  }

  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || DEFAULT_HOST,
    // Automatic exception capture: wires window.onerror / unhandledrejection so
    // uncaught frontend errors reach PostHog Error Tracking (criterion 1). The
    // React Error Boundary complements this for render errors React swallows.
    capture_exceptions: true,
    // Session replay (criterion 5), so errors correlate with the user's session.
    // Mask all input fields so no typed data (passwords, card fields) is recorded.
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
    },
    // Basic event tracking (criterion 5) — on by default, listed for clarity.
    autocapture: true,
    capture_pageview: true,
  })

  initialized = true
}

// Associate subsequent events/errors/replays with the signed-in user (criterion 3:
// error context includes the user). Called once per sign-in from AuthContext, not
// per render. No-ops until PostHog is initialized — safe because `role` comes from
// the async backend sync, which always resolves after init has run.
export function identifyUser(
  distinctId: string,
  properties: { email?: string; role?: string },
): void {
  if (typeof window === 'undefined' || !initialized) {
    return
  }
  posthog.identify(distinctId, properties)
}

// Clear the identified user on sign-out so the next session isn't attributed to
// the previous user.
export function resetUser(): void {
  if (typeof window === 'undefined' || !initialized) {
    return
  }
  posthog.reset()
}

export { posthog }
