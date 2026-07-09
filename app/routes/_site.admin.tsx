import { createFileRoute } from '@tanstack/react-router'
import { AdminDashboardPage } from '../../src/pages/AdminDashboardPage'
import { ProtectedGuard } from '../lib/ProtectedGuard'

// `/admin` — migrated from src/pages/AdminDashboardPage.tsx (Phase 4). Section
// switching (overview/inventory/categories/orders/users) is internal useState
// driven by AdminSidebar, not nested routing, so this is a single route file.
//
// Matches AppRouter.tsx:86-93: guarded only by ProtectedRoute adminOnly, NOT
// wrapped in CustomerRoute — no CustomerGuard here.
export const Route = createFileRoute('/_site/admin')({
  component: () => (
    <ProtectedGuard adminOnly>
      <AdminDashboardPage />
    </ProtectedGuard>
  ),
})
