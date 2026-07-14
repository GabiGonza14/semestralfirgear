import { test, expect } from '@playwright/test'
import { mockCatalog } from '../support/mockApi'
import { PRODUCT_DUMBBELL, emptyReviewsResponse, reviewsResponseWithData } from '../fixtures/catalog'

// Funcionalidad: "Resenas de productos por compradores verificados, con
// moderacion de administrador" (README) — public/anonymous surface. The
// write-eligibility states that need a real purchase + signed-in session are
// covered in e2e/authenticated/customer-flow.spec.ts.
test.describe('Product reviews (anonymous visitor)', () => {
  test('prompts an anonymous visitor to sign in before reviewing', async ({ page }) => {
    await mockCatalog(page, { reviews: { [PRODUCT_DUMBBELL._id]: emptyReviewsResponse() } })
    await page.goto(`/product/${PRODUCT_DUMBBELL._id}`)

    await expect(page.getByRole('heading', { name: 'Reseñas de clientes' })).toBeVisible()
    await expect(
      page.getByText('Inicia sesión con la cuenta con la que compraste para dejar una reseña.'),
    ).toBeVisible()
    // No write form for an ineligible viewer.
    await expect(page.locator('#review-comment')).toHaveCount(0)
  })

  test('renders the empty state when a product has no reviews yet', async ({ page }) => {
    await mockCatalog(page, { reviews: { [PRODUCT_DUMBBELL._id]: emptyReviewsResponse() } })
    await page.goto(`/product/${PRODUCT_DUMBBELL._id}`)

    await expect(page.getByText('Todavía no hay reseñas. ¡Sé el primero en opinar!')).toBeVisible()
  })

  test('lists existing reviews with the average rating summary', async ({ page }) => {
    const response = reviewsResponseWithData()
    await mockCatalog(page, { reviews: { [PRODUCT_DUMBBELL._id]: response } })
    await page.goto(`/product/${PRODUCT_DUMBBELL._id}`)

    await expect(page.getByText(response.summary.averageRating.toFixed(1))).toBeVisible()
    await expect(page.getByText(`${response.summary.count} reseñas`)).toBeVisible()
    for (const review of response.reviews) {
      await expect(page.getByText(review.reviewerName)).toBeVisible()
      if (review.comment) {
        await expect(page.getByText(review.comment)).toBeVisible()
      }
    }
  })
})
