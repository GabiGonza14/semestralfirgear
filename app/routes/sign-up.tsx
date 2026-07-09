import { createFileRoute } from '@tanstack/react-router'
import { SignUpPage } from '../../src/pages/SignUpPage'

// `/sign-up` — migrated from src/pages/SignUpPage.tsx (Phase 3). Standalone,
// same reasoning as login.tsx (outside SiteLayout in the original SPA).
export const Route = createFileRoute('/sign-up')({
  component: SignUpPage,
})
