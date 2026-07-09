import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '../../src/pages/AccountPage'
import { CustomerGuard } from '../lib/CustomerGuard'
import { ProtectedGuard } from '../lib/ProtectedGuard'

// `/account` — migrated from src/pages/AccountPage.tsx (Phase 3). Protected,
// same guard composition as orders.
export const Route = createFileRoute('/_site/account')({
  component: () => (
    <CustomerGuard>
      <ProtectedGuard>
        <AccountPage />
      </ProtectedGuard>
    </CustomerGuard>
  ),
})
