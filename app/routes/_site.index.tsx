import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '../../src/pages/LandingPage'

// `/` — migrated from src/pages/LandingPage.tsx (Phase 2).
export const Route = createFileRoute('/_site/')({
  component: LandingPage,
})
