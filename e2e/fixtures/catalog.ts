// Fixture data shaped exactly like the raw backend responses (MongoCategory /
// MongoProduct / ProductSuggestion / ProductReviewsResponse), so mocked routes
// in e2e/support/mockApi.ts can hand them straight to page.route() and the
// frontend's own mapProduct()/mapUser() mappers do the rest — same contract
// the real backend fulfills.

export const CATEGORY_STRENGTH = {
  _id: 'cat-strength',
  name: 'Fuerza',
  description: 'Pesas, mancuernas y accesorios de fuerza',
  requiresSizes: false,
}

export const CATEGORY_APPAREL = {
  _id: 'cat-apparel',
  name: 'Ropa',
  description: 'Indumentaria deportiva',
  requiresSizes: true,
}

export const CATEGORIES = [CATEGORY_STRENGTH, CATEGORY_APPAREL]

export const PRODUCT_DUMBBELL = {
  _id: 'prod-dumbbell',
  name: 'Mancuerna Ajustable 20kg',
  description: 'Mancuerna ajustable de 2 a 20kg, ideal para entrenamiento en casa.',
  price: 89.99,
  stock: 12,
  lowStockThreshold: 5,
  images: ['https://picsum.photos/seed/dumbbell/600/600'],
  sizes: [],
  isActive: true,
  categoryId: CATEGORY_STRENGTH,
  createdAt: '2026-06-01T10:00:00.000Z',
  hasDiscount: false,
  discountPercentage: 0,
  discountAmount: 0,
  finalPrice: 89.99,
}

export const PRODUCT_BAND = {
  _id: 'prod-band',
  name: 'Banda de Resistencia Pro',
  description: 'Banda de resistencia de latex para tonificacion y rehabilitacion.',
  price: 15.5,
  stock: 40,
  lowStockThreshold: 5,
  images: ['https://picsum.photos/seed/band/600/600'],
  sizes: [],
  isActive: true,
  categoryId: CATEGORY_STRENGTH,
  createdAt: '2026-06-05T10:00:00.000Z',
  hasDiscount: true,
  discountPercentage: 20,
  discountAmount: 3.1,
  finalPrice: 12.4,
}

export const PRODUCT_OUT_OF_STOCK = {
  _id: 'prod-kettlebell',
  name: 'Kettlebell 16kg',
  description: 'Kettlebell de fundicion para entrenamiento funcional.',
  price: 65,
  stock: 0,
  lowStockThreshold: 5,
  images: ['https://picsum.photos/seed/kettlebell/600/600'],
  sizes: [],
  isActive: true,
  categoryId: CATEGORY_STRENGTH,
  createdAt: '2026-06-03T10:00:00.000Z',
  hasDiscount: false,
  discountPercentage: 0,
  discountAmount: 0,
  finalPrice: 65,
}

export const PRODUCT_SHIRT = {
  _id: 'prod-shirt',
  name: 'Playera Tecnica FITGEAR',
  description: 'Playera transpirable de secado rapido para entrenar.',
  price: 24.99,
  stock: 30,
  lowStockThreshold: 5,
  images: ['https://picsum.photos/seed/shirt/600/600'],
  sizes: [
    { label: 'S', stock: 8 },
    { label: 'M', stock: 0 },
    { label: 'L', stock: 6 },
  ],
  isActive: true,
  categoryId: CATEGORY_APPAREL,
  createdAt: '2026-06-07T10:00:00.000Z',
  hasDiscount: false,
  discountPercentage: 0,
  discountAmount: 0,
  finalPrice: 24.99,
}

export const PRODUCTS = [PRODUCT_DUMBBELL, PRODUCT_BAND, PRODUCT_OUT_OF_STOCK, PRODUCT_SHIRT]

export const PRODUCT_SUGGESTIONS_FOR_MANCUERNA = [
  { id: PRODUCT_DUMBBELL._id, name: PRODUCT_DUMBBELL.name, imageUrl: PRODUCT_DUMBBELL.images[0] },
]

export function emptyReviewsResponse() {
  return {
    summary: { count: 0, averageRating: 0, distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } },
    reviews: [],
    viewer: { authenticated: false, purchased: false, hasReviewed: false, canReview: false, ownReviewStatus: null },
  }
}

export function reviewsResponseWithData() {
  return {
    summary: { count: 2, averageRating: 4.5, distribution: { '1': 0, '2': 0, '3': 0, '4': 1, '5': 1 } },
    reviews: [
      {
        id: 'review-1',
        rating: 5,
        comment: 'Excelente calidad, muy resistente.',
        reviewerName: 'Ana G.',
        createdAt: '2026-06-10T12:00:00.000Z',
      },
      {
        id: 'review-2',
        rating: 4,
        comment: 'Buena relacion precio-calidad.',
        reviewerName: 'Luis M.',
        createdAt: '2026-06-12T12:00:00.000Z',
      },
    ],
    viewer: { authenticated: false, purchased: false, hasReviewed: false, canReview: false, ownReviewStatus: null },
  }
}
