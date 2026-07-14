import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import { ErrorBoundary } from '../../src/components/ErrorBoundary'
import { PostHogProvider } from '../../src/components/PostHogProvider'
// Imported as a STRING (?inline), not a URL: the compiled Tailwind + brand CSS
// is inlined into a <style> in the shell <head> below, so it is applied at the
// very first paint with no external fetch gap. Loading it as an external
// <link> instead left a brief streaming-SSR window where the document painted
// unstyled before /assets/*.css arrived (FOUC).
import appCss from '../../src/index.css?inline'

// Root route. `shellComponent` renders the full HTML document shell (per the
// current TanStack Start + Clerk integration). The Clerk publishable key is
// client-safe and comes from the EXISTING `VITE_CLERK_PUBLISHABLE_KEY`
// (Vite-inlined into the browser bundle). The server session verification uses
// CLERK_SECRET_KEY, which is read server-side only via clerkMiddleware (see
// app/start.ts) and never reaches the client.
//
// The global stylesheet (Tailwind + brand CSS), Google Fonts, and favicon used
// to be wired in the SPA's index.html — that file is gone (Phase 5, #107), so
// this shell is now the only place they're loaded from.
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#020617' },
      { title: 'FITGEAR — Accesorios fitness premium' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Rajdhani:wght@500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // Inline dark background on <html>/<body> so the very first paint is already
    // on-brand dark. The base rule `body { background: var(--fg-black) }` lives
    // in the external stylesheet (src/index.css), which is NOT applied yet during
    // the brief streaming-SSR window before /assets/*.css loads — without this
    // shim that window flashes as unstyled (bright) content (FOUC). #020617 is
    // --fg-black, duplicated here on purpose since the variable isn't live yet.
    <html lang="es" style={{ backgroundColor: '#020617' }}>
      <head>
        <HeadContent />
        {/* Compiled Tailwind + brand CSS inlined so it is applied at the first
            paint (no external stylesheet fetch) — this is what eliminates the
            FOUC. The inline background above stays as a belt-and-suspenders. */}
        <style dangerouslySetInnerHTML={{ __html: appCss }} />
      </head>
      <body style={{ backgroundColor: '#020617' }}>
        {/* HU-34: PostHog initialized here (alongside ClerkProvider, before the
            route tree) so analytics + session replay are live from first paint.
            The ErrorBoundary wraps the route tree so React render errors reach
            PostHog too. */}
        <PostHogProvider>
          <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
            <ErrorBoundary>{children}</ErrorBoundary>
          </ClerkProvider>
        </PostHogProvider>
        <Scripts />
      </body>
    </html>
  )
}
