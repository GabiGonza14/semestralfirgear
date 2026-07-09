import type { ReactNode } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-react-start'

// Root route. `shellComponent` renders the full HTML document shell (per the
// current TanStack Start + Clerk integration). The Clerk publishable key is
// client-safe and comes from the EXISTING `VITE_CLERK_PUBLISHABLE_KEY`
// (Vite-inlined into the browser bundle). The server session verification uses
// CLERK_SECRET_KEY, which is read server-side only via clerkMiddleware (see
// app/start.ts) and never reaches the client.
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'FITGEAR — TanStack Start (Fase 1)' },
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
