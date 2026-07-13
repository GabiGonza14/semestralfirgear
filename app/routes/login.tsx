import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '../../src/pages/LoginPage'

// `/login` — migrated from src/pages/LoginPage.tsx (Phase 3). Standalone: the
// original AppRouter.tsx renders /login/* outside SiteLayout (own header, no
// Navbar/Footer/cart), so this route is a sibling of _site, not a child.
export const Route = createFileRoute('/login')({
  component: LoginPage,
})
