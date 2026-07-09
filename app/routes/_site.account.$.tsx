import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '../../src/pages/AccountPage'
import { CustomerGuard } from '../lib/CustomerGuard'
import { ProtectedGuard } from '../lib/ProtectedGuard'

// `/account/$` — splat route catching Clerk's internal <UserProfile
// routing="path" path="/account"> sub-views (security, sessions, etc.), same
// reasoning as login.$.tsx.
export const Route = createFileRoute('/_site/account/$')({
  component: () => (
    <CustomerGuard>
      <ProtectedGuard>
        <AccountPage />
      </ProtectedGuard>
    </CustomerGuard>
  ),
})
