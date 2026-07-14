import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '../../src/pages/AccountPage'
import { ProtectedGuard } from '../lib/ProtectedGuard'

// `/admin/account` — the admin-side equivalent of `/account` (_site.account.tsx).
// Reuses the same AccountPage/UserProfile, but guarded with ProtectedGuard
// adminOnly instead of CustomerGuard + ProtectedGuard: CustomerGuard redirects
// any signed-in admin to /admin, which is exactly what made the Navbar's
// UserButton "Manage account" link (userProfileUrl) dead for admins before —
// pointing it at /account just bounced back to /admin. This route never
// applies that redirect, matching _site.admin.tsx's own guard composition.
export const Route = createFileRoute('/_site/admin_/account')({
  component: () => (
    <ProtectedGuard adminOnly>
      <AccountPage path="/admin/account" />
    </ProtectedGuard>
  ),
})
