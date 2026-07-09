import { createFileRoute } from '@tanstack/react-router'
import { CheckoutSuccessPage } from '../../src/pages/CheckoutSuccessPage'
import { CustomerGuard } from '../lib/CustomerGuard'

// `/checkout/success` — migrated from src/pages/CheckoutSuccessPage.tsx
// (Phase 3). Original wraps it only in CustomerRoute (no ProtectedRoute), so
// only CustomerGuard applies here. validateSearch keeps orderId/session_id
// typed through TanStack navigation for the useSearchParams shim.
export const Route = createFileRoute('/_site/checkout/success')({
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === 'string' ? search.orderId : undefined,
    session_id: typeof search.session_id === 'string' ? search.session_id : undefined,
  }),
  component: () => (
    <CustomerGuard>
      <CheckoutSuccessPage />
    </CustomerGuard>
  ),
})
