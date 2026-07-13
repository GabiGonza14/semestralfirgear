import { createFileRoute } from '@tanstack/react-router'
import { SsoCallbackPage } from '../../src/pages/SsoCallbackPage'

// `/sso-callback` — migrated from src/pages/SsoCallbackPage.tsx (Phase 3). In
// the original AppRouter.tsx this sits under SiteLayout but is NOT wrapped in
// CustomerRoute, so no guard here either — Clerk's own redirect handles the
// post-SSO destination.
export const Route = createFileRoute('/_site/sso-callback')({
  component: SsoCallbackPage,
})
