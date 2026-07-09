import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '../../src/pages/LoginPage'

// `/login/$` — splat route catching Clerk's internal <SignIn routing="path">
// sub-views (factor-one, forgot-password, sso-callback, etc.). Clerk manages
// those transitions itself via the History API once <SignIn> is mounted; this
// route just needs to keep rendering the same page for any /login/* path
// instead of 404ing.
export const Route = createFileRoute('/login/$')({
  component: LoginPage,
})
