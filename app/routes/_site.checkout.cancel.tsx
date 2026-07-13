import { createFileRoute } from '@tanstack/react-router'
import { CheckoutCancelPage } from '../../src/pages/CheckoutCancelPage'
import { CustomerGuard } from '../lib/CustomerGuard'

// `/checkout/cancel` — migrated from src/pages/CheckoutCancelPage.tsx
// (Phase 3). Same guard composition as checkout/success.
export const Route = createFileRoute('/_site/checkout/cancel')({
  validateSearch: (search: Record<string, unknown>): { orderId?: string } => ({
    orderId: typeof search.orderId === 'string' ? search.orderId : undefined,
  }),
  component: () => (
    <CustomerGuard>
      <CheckoutCancelPage />
    </CustomerGuard>
  ),
})
