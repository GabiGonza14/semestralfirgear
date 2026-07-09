import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'
import appCss from '../../src/index.css?url'

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
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
          {children}
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
