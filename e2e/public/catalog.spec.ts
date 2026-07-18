import { test, expect } from '@playwright/test'
import { mockCatalog, mockCatalogServerError } from '../support/mockApi'
import {
  PRODUCT_BAND,
  PRODUCT_DUMBBELL,
  PRODUCT_OUT_OF_STOCK,
  PRODUCT_SHIRT,
} from '../fixtures/catalog'

// Funcionalidad: "Catalogo de productos con busqueda, filtros, ordenamiento y
// autocompletado" (README).
test.describe('Shop catalog', () => {
  test('lists every active product on load', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/shop')

    await expect(page.locator('article')).toHaveCount(4)
    await expect(page.getByText('4 productos')).toBeVisible()
  })

  test('filters by category', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/shop')
    await expect(page.locator('article')).toHaveCount(4)

    await page.getByRole('button', { name: 'Ropa' }).click()

    await expect(page.locator('article')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: PRODUCT_SHIRT.name })).toBeVisible()

    await page.getByRole('button', { name: 'Todas' }).click()
    await expect(page.locator('article')).toHaveCount(4)
  })

  test('filters by price range', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/shop')

    // Custom listbox (Select component), not a native <select>: open it via
    // its trigger button, then click the desired option.
    await page.getByRole('button', { name: 'Filtrar por precio' }).click()
    await page.getByRole('option', { name: 'Menos de $20' }).click()

    await expect(page.locator('article')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: PRODUCT_BAND.name })).toBeVisible()
  })

  test('sorts by price ascending and descending', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/shop')
    await expect(page.locator('article')).toHaveCount(4)

    // Changing sort re-fetches /products (with a new sortBy query) before the
    // client re-applies its own sort — wait for that round-trip explicitly
    // rather than relying on the assertion's retry window to outrun it.
    const refetch = page.waitForResponse((response) => response.url().includes('/api/products?'))
    await page.getByRole('button', { name: 'Ordenar productos' }).click()
    await page.getByRole('option', { name: 'Precio: menor a mayor' }).click()
    await refetch
    await expect(page.locator('article h3').first()).toHaveText(PRODUCT_BAND.name)

    const refetch2 = page.waitForResponse((response) => response.url().includes('/api/products?'))
    await page.getByRole('button', { name: 'Ordenar productos' }).click()
    await page.getByRole('option', { name: 'Precio: mayor a menor' }).click()
    await refetch2
    await expect(page.locator('article h3').first()).toHaveText(PRODUCT_DUMBBELL.name)
  })

  test('searches by product name and clears filters from the empty state', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/shop')

    await page.getByRole('combobox', { name: 'Buscar producto' }).fill('mancuerna')
    await expect(page.locator('article')).toHaveCount(1)
    await expect(page.getByRole('heading', { name: PRODUCT_DUMBBELL.name })).toBeVisible()

    await page.getByRole('combobox', { name: 'Buscar producto' }).fill('no-existe-este-producto')
    await expect(page.getByText('Sin resultados')).toBeVisible()

    await page.getByRole('button', { name: 'Limpiar filtros' }).click()
    await expect(page.locator('article')).toHaveCount(4)
  })

  test('marks an out-of-stock product and disables its add-to-cart button', async ({ page }) => {
    await mockCatalog(page)
    await page.goto('/shop')

    const card = page.locator('article').filter({ hasText: PRODUCT_OUT_OF_STOCK.name })
    await expect(card.getByText('Agotado')).toBeVisible()
    await expect(card.getByRole('button', { name: 'Sin stock' })).toBeDisabled()
  })

  test('shows the autocomplete dropdown and navigates to the chosen product', async ({ page }) => {
    await mockCatalog(page, {
      suggestions: {
        manc: [{ id: PRODUCT_DUMBBELL._id, name: PRODUCT_DUMBBELL.name, imageUrl: PRODUCT_DUMBBELL.images[0] }],
      },
    })
    await page.goto('/shop')

    await page.getByRole('combobox', { name: 'Buscar producto' }).fill('manc')

    const listbox = page.getByRole('listbox')
    await expect(listbox).toBeVisible()
    await expect(listbox.getByRole('option')).toHaveCount(1)

    await listbox.getByText(PRODUCT_DUMBBELL.name).click()

    await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_DUMBBELL._id}`))
  })

  test('falls back to the local catalog when the backend returns a 5xx', async ({ page }) => {
    await mockCatalogServerError(page)
    await page.goto('/shop')

    // Static fallback data from src/data/products.ts, not the mocked backend.
    await expect(page.getByRole('heading', { name: 'Banda Elastica Pro Set' })).toBeVisible()
  })
})

// Isolated from the 4-product default fixture above so pagination (30/page)
// actually has more than one page to paginate through.
test.describe('Shop catalog pagination', () => {
  test('paginates results past the first page', async ({ page }) => {
    const manyProducts = Array.from({ length: 32 }, (_, index) => ({
      ...PRODUCT_DUMBBELL,
      _id: `prod-page-${index}`,
      name: `Producto de pagina ${index + 1}`,
    }))

    await mockCatalog(page, { products: manyProducts })
    await page.goto('/shop')

    await expect(page.locator('article')).toHaveCount(30)
    await expect(page.getByText('página 1 de 2')).toBeVisible()

    await page.getByRole('button', { name: 'Página siguiente' }).click()

    await expect(page.locator('article')).toHaveCount(2)
    await expect(page.getByText('página 2 de 2')).toBeVisible()
  })
})
