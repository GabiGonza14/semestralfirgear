import type { Page } from '@playwright/test'
import { CATEGORIES, PRODUCTS, emptyReviewsResponse } from '../fixtures/catalog'

// Stubs the backend (http://localhost:4000/api/**) so the specs under
// e2e/public/ are deterministic and don't need MongoDB/Bun/Clerk running —
// only the frontend dev server (see playwright.config.ts's webServer). Every
// request under /api is intercepted; anything not explicitly handled below
// fails loudly (501) instead of hanging on a real network call, so a spec
// that forgot to stub an endpoint fails fast with a clear message.
export interface MockCatalogOptions {
  products?: typeof PRODUCTS
  categories?: typeof CATEGORIES
  /** Keyed by the `search` query string sent to /products/suggestions. */
  suggestions?: Record<string, Array<{ id: string; name: string; imageUrl: string }>>
  /** Keyed by productId, response shape of GET /reviews/product/:id. */
  reviews?: Record<string, ReturnType<typeof emptyReviewsResponse>>
}

export async function mockCatalog(page: Page, options: MockCatalogOptions = {}) {
  const products = options.products ?? PRODUCTS
  const categories = options.categories ?? CATEGORIES
  const suggestions = options.suggestions ?? {}
  const reviews = options.reviews ?? {}

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()

    if (path === '/categories' && method === 'GET') {
      return route.fulfill({ json: categories })
    }

    if (path === '/products/suggestions' && method === 'GET') {
      const search = url.searchParams.get('search') ?? ''
      return route.fulfill({ json: suggestions[search] ?? [] })
    }

    if (path === '/products' && method === 'GET') {
      // Mirrors the backend's own query-param filtering (categoryId/search) so
      // related-product lookups (?categoryId=...) return a realistic subset —
      // the shop page's client-side filter re-applies the same rules anyway,
      // so this only matters for callers that trust the server response as-is.
      const categoryId = url.searchParams.get('categoryId')
      const search = url.searchParams.get('search')?.toLowerCase()
      const filtered = products.filter((product) => {
        const matchesCategory = !categoryId || product.categoryId._id === categoryId
        const matchesSearch =
          !search ||
          product.name.toLowerCase().includes(search) ||
          product.description.toLowerCase().includes(search)
        return matchesCategory && matchesSearch
      })
      return route.fulfill({ json: filtered })
    }

    const productDetailMatch = /^\/products\/([^/]+)$/.exec(path)
    if (productDetailMatch && method === 'GET') {
      const found = products.find((product) => product._id === productDetailMatch[1])
      if (found) {
        return route.fulfill({ json: found })
      }
      return route.fulfill({
        status: 404,
        json: { error: { code: 'NOT_FOUND', message: 'Producto no encontrado' } },
      })
    }

    const reviewsMatch = /^\/reviews\/product\/([^/]+)$/.exec(path)
    if (reviewsMatch && method === 'GET') {
      return route.fulfill({ json: reviews[reviewsMatch[1]] ?? emptyReviewsResponse() })
    }

    return route.fulfill({
      status: 501,
      json: { error: { code: 'UNMOCKED', message: `e2e: unmocked ${method} ${path}` } },
    })
  })
}

export interface MockOrder {
  _id: string
  userId: string
  totalAmount: number
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'FAILED' | 'REFUNDED'
  createdAt: string
  items: Array<{
    _id: string
    productId: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
}

export interface MockCheckoutOptions {
  /** GET /orders/:id responses, keyed by orderId. */
  orders?: Record<string, MockOrder>
  /**
   * POST /payments/confirm-checkout-payment behavior. `'paid'` returns 200
   * {status:'PAID'}; `'pending'` returns 409 (the app's "still confirming
   * with Stripe" state, matching the real backend's retryable response).
   */
  confirmPayment?: 'paid' | 'pending'
}

// Stubs the checkout success/cancel pages' endpoints (order lookup + payment
// confirmation) independently of mockCatalog, since those pages don't touch
// /products or /categories at all.
export async function mockCheckout(page: Page, options: MockCheckoutOptions = {}) {
  const orders = options.orders ?? {}
  const confirmPayment = options.confirmPayment ?? 'paid'

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace(/^\/api/, '')
    const method = request.method()

    if (path === '/payments/confirm-checkout-payment' && method === 'POST') {
      if (confirmPayment === 'paid') {
        return route.fulfill({ json: { status: 'PAID' } })
      }
      return route.fulfill({
        status: 409,
        json: { error: { code: 'PAYMENT_PENDING', message: 'El pago aun se esta confirmando en Stripe.' } },
      })
    }

    const orderDetailMatch = /^\/orders\/([^/]+)$/.exec(path)
    if (orderDetailMatch && method === 'GET') {
      const found = orders[orderDetailMatch[1]]
      if (found) {
        return route.fulfill({ json: found })
      }
      return route.fulfill({
        status: 404,
        json: { error: { code: 'NOT_FOUND', message: 'Orden no encontrada' } },
      })
    }

    if (/^\/orders\/[^/]+\/cancel$/.test(path) && method === 'PATCH') {
      const orderId = path.split('/')[2]
      const found = orders[orderId]
      if (!found) {
        return route.fulfill({ status: 404, json: { error: { message: 'Orden no encontrada' } } })
      }
      return route.fulfill({ json: { ...found, status: 'CANCELLED' } })
    }

    return route.fulfill({
      status: 501,
      json: { error: { code: 'UNMOCKED', message: `e2e: unmocked ${method} ${path}` } },
    })
  })
}

/** Simulates a 500 from every catalog endpoint — exercises the local fallback catalog. */
export async function mockCatalogServerError(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace(/^\/api/, '')

    if (path === '/categories' || path === '/products') {
      return route.fulfill({
        status: 500,
        json: { error: { code: 'INTERNAL', message: 'Internal server error' } },
      })
    }

    return route.fulfill({
      status: 501,
      json: { error: { code: 'UNMOCKED', message: `e2e: unmocked ${route.request().method()} ${path}` } },
    })
  })
}
