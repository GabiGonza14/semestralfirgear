import { createStart } from '@tanstack/react-start'
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'

// Server-side Start configuration. `clerkMiddleware()` runs on every request
// and makes the Clerk auth context available to server functions / route
// loaders. It reads CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY from the SERVER
// environment (process.env) — these are NOT `VITE_`-prefixed, so they are never
// inlined into the client bundle. By default it does NOT protect any route;
// protection is opt-in per route (added in later phases, #107).
export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware()],
  }
})
