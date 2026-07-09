import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '../../src/pages/LandingPage'
import { CustomerGuard } from '../lib/CustomerGuard'

// `/` — migrated from src/pages/LandingPage.tsx (Phase 2).
export const Route = createFileRoute('/_site/')({
  component: () => (
    <CustomerGuard>
      <LandingPage />
    </CustomerGuard>
  ),
})
