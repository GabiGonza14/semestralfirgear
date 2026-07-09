import { createFileRoute } from '@tanstack/react-router'
import { ProductDetailPage } from '../../src/pages/ProductDetailPage'

// `/product/:id` — migrated from src/pages/ProductDetailPage.tsx (Phase 2).
// The page reads the id via the react-router-shim's useParams(), which maps to
// TanStack's `$id` param.
export const Route = createFileRoute('/_site/product/$id')({
  component: ProductDetailPage,
})
