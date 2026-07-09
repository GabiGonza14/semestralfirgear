import { createFileRoute } from '@tanstack/react-router'
import { OrdersPage } from '../../src/pages/OrdersPage'
import { CustomerGuard } from '../lib/CustomerGuard'
import { ProtectedGuard } from '../lib/ProtectedGuard'

// `/orders` — migrated from src/pages/OrdersPage.tsx (Phase 3). Protected:
// original wraps it in CustomerRoute + ProtectedRoute, so both guards apply
// here in the same order.
export const Route = createFileRoute('/_site/orders')({
  component: () => (
    <CustomerGuard>
      <ProtectedGuard>
        <OrdersPage />
      </ProtectedGuard>
    </CustomerGuard>
  ),
})
