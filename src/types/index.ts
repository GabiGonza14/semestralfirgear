export type UserRole = 'ADMIN' | 'CUSTOMER'

export type SizeLabel = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

export interface ProductSize {
  label: SizeLabel
  stock: number
}

export interface Product {
  id: string
  categoryId: string
  name: string
  category: string
  price: number
  stock: number
  /** HU-46: stock at-or-below this flags the product as low (default 5). */
  lowStockThreshold: number
  /** Cover image — always `images[0]`, kept for consumers that only need one photo. */
  image: string
  images: string[]
  /** Empty for categories that don't use sizes. */
  sizes: ProductSize[]
  description: string
  isActive: boolean
  featured?: boolean
  hasDiscount: boolean
  discountPercentage: number
  discountAmount: number
  finalPrice: number
}

export interface Category {
  id: string
  name: string
  description: string
  requiresSizes: boolean
}

export interface Order {
  id: string
  customerName: string
  total: number
  status: 'pending' | 'paid' | 'shipped'
  createdAt: string
}

export interface BackendUser {
  id: string
  fullName: string
  email: string
  role: UserRole
  clerkUserId: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BackendOrderItem {
  id: string
  productId: string
  productName: string
  productImage?: string
  quantity: number
  size?: SizeLabel
  unitPrice: number
  subtotal: number
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'REFUNDED'

export interface BackendOrder {
  id: string
  userId: string
  customerName?: string
  totalAmount: number
  status: OrderStatus
  createdAt: string
  items: BackendOrderItem[]
}

// An entry in an order's audit history (HU-29), e.g. a refund.
export interface OrderEvent {
  id: string
  orderId: string
  type: string
  actorClerkId?: string
  reason?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// HU-53: one product line in an exportable inventory report.
export interface InventoryReportRow {
  productId: string
  name: string
  category: string
  stock: number
  unitPrice: number
  totalValue: number
  lowStock: boolean
  lowStockThreshold: number
  isActive: boolean
}

export interface InventoryReportSummary {
  productCount: number
  totalUnits: number
  totalInventoryValue: number
  lowStockCount: number
}

// HU-53: a point-in-time inventory report (stock, valuation, low-stock flags).
export interface InventoryReport {
  generatedAt: string
  summary: InventoryReportSummary
  rows: InventoryReportRow[]
}

// HU-52: the kind of entity an admin action targeted.
export type AuditEntityType = 'ORDER' | 'USER' | 'PRODUCT' | 'CATEGORY' | 'REVIEW'

// HU-52: one record in the cross-entity admin-action audit trail.
export interface AuditLogEntry {
  id: string
  actorClerkId?: string
  actorEmail?: string
  action: string
  entityType: AuditEntityType
  entityId?: string
  changes?: Record<string, unknown>
  createdAt: string
}

export interface CartItemModel {
  product: Product
  quantity: number
  /** Only set for products whose category requires sizes. */
  size?: SizeLabel
}

// HU-51: a lightweight catalog search suggestion (autocomplete dropdown).
export interface ProductSuggestion {
  id: string
  name: string
  imageUrl: string
}

// HU-49: product reviews by verified purchasers.
export interface ProductReview {
  id: string
  rating: number
  comment: string | null
  reviewerName: string
  createdAt: string
}

export interface ProductReviewSummary {
  count: number
  /** Mean rating rounded to one decimal; 0 when there are no reviews. */
  averageRating: number
  /** How many reviews gave each star value (1..5). */
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>
}

// The signed-in viewer's review eligibility for a product (soft-auth flags on
// the public reviews response). All false for anonymous visitors.
export interface ProductReviewViewerState {
  authenticated: boolean
  purchased: boolean
  hasReviewed: boolean
  canReview: boolean
  /** HU-50: moderation status of the viewer's own review, or null if they have none. */
  ownReviewStatus: ReviewStatus | null
}

export interface ProductReviewsResponse {
  summary: ProductReviewSummary
  reviews: ProductReview[]
  viewer: ProductReviewViewerState
}

// HU-50: review moderation.
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN'

export type ReviewModerationAction = 'approve' | 'reject' | 'hide'

// A review as seen by an admin in the moderation queue (includes the product,
// the reviewer's identity, moderation state and any rejection reason).
export interface AdminReview {
  id: string
  productId: string
  productName: string
  reviewerName: string
  reviewerEmail: string
  rating: number
  comment: string | null
  status: ReviewStatus
  rejectionReason: string | null
  createdAt: string
  moderatedAt: string | null
}
