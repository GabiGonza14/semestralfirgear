import { createFileRoute } from '@tanstack/react-router'
import { ShopPage } from '../../src/pages/ShopPage'

// `/shop` — migrated from src/pages/ShopPage.tsx (Phase 2). Category filtering
// happens inside Shop via the `category`/`search` query params (there is no
// separate /category/:id route). validateSearch keeps those params through
// TanStack navigation so the react-router-shim's useSearchParams round-trips.
export const Route = createFileRoute('/_site/shop')({
  validateSearch: (search: Record<string, unknown>) => ({
    category: typeof search.category === 'string' ? search.category : undefined,
    search: typeof search.search === 'string' ? search.search : undefined,
  }),
  component: ShopPage,
})
