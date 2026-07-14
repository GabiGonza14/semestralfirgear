import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '../../src/pages/AccountPage'
import { ProtectedGuard } from '../lib/ProtectedGuard'

// `/admin/account/$` — splat route catching Clerk's internal <UserProfile
// routing="path" path="/admin/account"> sub-views (security, sessions, etc.),
// same reasoning as _site.account.$.tsx.
export const Route = createFileRoute('/_site/admin_/account/$')({
  component: () => (
    <ProtectedGuard adminOnly>
      <AccountPage path="/admin/account" />
    </ProtectedGuard>
  ),
})
