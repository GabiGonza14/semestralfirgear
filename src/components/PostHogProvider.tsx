import { useEffect, type ReactNode } from 'react'
import { initPostHog } from '../lib/posthog'

// HU-34: initializes PostHog once, client-side (in an effect so it never runs
// during SSR). Rendered high in app/routes/__root.tsx, alongside ClerkProvider,
// so analytics/session-replay are live from the first client paint. Renders
// children unchanged — it's a side-effect wrapper, not a context provider.
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return <>{children}</>
}
