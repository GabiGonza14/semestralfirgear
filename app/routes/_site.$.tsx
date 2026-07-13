import { createFileRoute } from '@tanstack/react-router'
import { NotFoundPage } from '../../src/pages/NotFoundPage'

// `_site/$` — splat catch-all for any path that doesn't match a registered
// route, migrated from AppRouter.tsx's `<Route path="*" element={<NotFoundPage />} />`.
// Nested under `_site` (not a router-level defaultNotFoundComponent) so a 404
// still gets the site chrome, matching the original nesting inside SiteLayout.
export const Route = createFileRoute('/_site/$')({
  component: NotFoundPage,
})
