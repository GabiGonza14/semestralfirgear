import { apiDownload, apiRequest } from './apiClient'
import type {
  AdminReview,
  AuditEntityType,
  AuditLogEntry,
  BackendOrder,
  BackendOrderItem,
  BackendUser,
  InventoryReport,
  OrderEvent,
  OrderStatus,
  Product,
  ProductReviewsResponse,
  ProductSuggestion,
  ReviewModerationAction,
  ReviewStatus,
  SizeLabel,
  UserRole,
} from '../types'
import { resolveMediaUrl } from '../utils/media'

export interface MongoCategory {
  _id: string
  name: string
  description: string
  requiresSizes: boolean
}

export interface ProductSizeInput {
  label: SizeLabel
  stock: number
}

export interface ProductUpsertInput {
  name: string
  description: string
  price: number
  stock: number
  /** HU-46: stock at-or-below this flags the product as low (default 5). */
  lowStockThreshold: number
  /** Existing image URLs to keep (edit flow only — empty when creating). */
  existingImages: string[]
  /** New photos to upload — combined with existingImages, max 4 total. */
  newImageFiles: File[]
  categoryId: string
  isActive: boolean
  hasDiscount: boolean
  discountPercentage: number
  /** Only meaningful when the selected category requires sizes. */
  sizes: ProductSizeInput[]
}

interface MongoProductCategory {
  _id: string
  name: string
  description: string
}

interface MongoProductSize {
  label: SizeLabel
  stock: number
}

interface MongoProduct {
  _id: string
  name: string
  description: string
  price: number
  stock: number
  lowStockThreshold?: number
  images: string[]
  // Legacy field from before the `images` array existed. Some products in the
  // shared Atlas DB predate that migration and still carry this instead of a
  // populated `images` array.
  imageUrl?: string
  sizes?: MongoProductSize[]
  isActive: boolean
  categoryId: string | MongoProductCategory | null
  createdAt?: string
  hasDiscount?: boolean
  discountPercentage?: number
  discountAmount?: number
  finalPrice?: number
}

interface MongoOrderUser {
  _id: string
  fullName?: string
  email?: string
}

interface MongoUser {
  _id: string
  clerkUserId: string
  fullName: string
  email: string
  role: 'ADMIN' | 'CUSTOMER'
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

interface MongoOrderItem {
  _id: string
  productId:
    | string
    | {
        _id: string
        name: string
        images?: string[]
      }
    | null
  quantity: number
  size?: SizeLabel
  unitPrice: number
  subtotal: number
}

interface MongoOrder {
  _id: string
  userId: string | MongoOrderUser | null
  totalAmount: number
  status: OrderStatus
  createdAt: string
  items: MongoOrderItem[]
  shippedAt?: string
  refundReason?: string
  shippingAddress?: BackendOrder['shippingAddress']
}

interface MongoOrderEvent {
  _id: string
  orderId: string
  type: string
  actorClerkId?: string
  reason?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface MongoAuditLog {
  _id: string
  actorClerkId?: string
  actorEmail?: string
  action: string
  entityType: AuditEntityType
  entityId?: string
  changes?: Record<string, unknown>
  createdAt: string
}

function mapProduct(product: MongoProduct): Product {
  const categoryName =
    typeof product.categoryId === 'string'
      ? 'Sin categoria'
      : product.categoryId?.name ?? 'Sin categoria'

  const images =
    product.images && product.images.length > 0
      ? product.images.map(resolveMediaUrl)
      : product.imageUrl
        ? [resolveMediaUrl(product.imageUrl)]
        : []

  return {
    id: product._id,
    categoryId:
      typeof product.categoryId === 'string'
        ? product.categoryId
        : product.categoryId?._id ?? '',
    name: product.name,
    category: categoryName,
    price: product.price,
    stock: product.stock,
    // Legacy products predating HU-46 have no threshold — fall back to the same
    // default (5) the backend schema applies.
    lowStockThreshold: product.lowStockThreshold ?? 5,
    image: images[0] ?? '',
    images,
    sizes: product.sizes ?? [],
    description: product.description,
    isActive: product.isActive,
    featured: false,
    hasDiscount: product.hasDiscount ?? false,
    discountPercentage: product.discountPercentage ?? 0,
    discountAmount: product.discountAmount ?? 0,
    finalPrice: product.finalPrice ?? product.price,
  }
}

function toProductFormData(payload: ProductUpsertInput) {
  const formData = new FormData()

  formData.set('name', payload.name)
  formData.set('description', payload.description)
  formData.set('price', String(payload.price))
  formData.set('stock', String(payload.stock))
  formData.set('lowStockThreshold', String(payload.lowStockThreshold))
  formData.set('categoryId', payload.categoryId)
  formData.set('isActive', String(payload.isActive))
  formData.set('hasDiscount', String(payload.hasDiscount))
  formData.set('discountPercentage', String(payload.discountPercentage))
  formData.set('existingImages', JSON.stringify(payload.existingImages))
  formData.set('sizes', JSON.stringify(payload.sizes))

  for (const file of payload.newImageFiles) {
    formData.append('images', file)
  }

  return formData
}

function mapUser(user: MongoUser): BackendUser {
  return {
    id: user._id,
    clerkUserId: user.clerkUserId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    // Legacy users synced before HU-44 have no isActive field — treat as active.
    isActive: user.isActive ?? true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

function mapOrderItem(item: MongoOrderItem): BackendOrderItem {
  const productImages = typeof item.productId === 'string' ? undefined : item.productId?.images
  const productImage = productImages?.[0] ? resolveMediaUrl(productImages[0]) : undefined

  return {
    id: item._id,
    productId:
      typeof item.productId === 'string'
        ? item.productId
        : item.productId?._id ?? '',
    productName:
      typeof item.productId === 'string'
        ? 'Producto'
        : item.productId?.name ?? 'Producto eliminado',
    productImage,
    quantity: item.quantity,
    size: item.size,
    unitPrice: item.unitPrice,
    subtotal: item.subtotal,
  }
}

function mapOrder(order: MongoOrder): BackendOrder {
  return {
    id: order._id,
    userId: typeof order.userId === 'string' ? order.userId : order.userId?._id ?? '',
    customerName:
      typeof order.userId === 'string'
        ? undefined
        : order.userId?.fullName ?? 'Usuario eliminado',
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
    items: (order.items ?? []).map(mapOrderItem),
    shippedAt: order.shippedAt,
    refundReason: order.refundReason,
    shippingAddress: order.shippingAddress,
  }
}

export async function getCategories() {
  return apiRequest<MongoCategory[]>('/categories', { method: 'GET' })
}

export async function createCategory(payload: {
  name: string
  description?: string
  requiresSizes: boolean
}) {
  return apiRequest<MongoCategory>('/categories', {
    method: 'POST',
    body: payload,
  })
}

export async function updateCategory(
  id: string,
  payload: Partial<{ name: string; description: string; requiresSizes: boolean }>,
) {
  return apiRequest<MongoCategory>(`/categories/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteCategory(id: string) {
  return apiRequest<{ message: string }>(`/categories/${id}`, {
    method: 'DELETE',
  })
}

export async function getProducts(params?: {
  categoryId?: string
  search?: string
  sortBy?: 'createdAt' | 'name' | 'price'
  sortOrder?: 'asc' | 'desc'
  includeInactive?: boolean
}) {
  const products = await apiRequest<MongoProduct[]>('/products', {
    method: 'GET',
    query: params,
  })
  return products.map(mapProduct)
}

export async function createProduct(payload: ProductUpsertInput) {
  const product = await apiRequest<MongoProduct>('/products', {
    method: 'POST',
    body: toProductFormData(payload),
  })
  return mapProduct(product)
}

export async function updateProduct(id: string, payload: ProductUpsertInput) {
  const product = await apiRequest<MongoProduct>(`/products/${id}`, {
    method: 'PUT',
    body: toProductFormData(payload),
  })
  return mapProduct(product)
}

export async function deleteProduct(id: string) {
  await apiRequest<void>(`/products/${id}`, {
    method: 'DELETE',
  })
}

export async function getProductById(id: string) {
  const product = await apiRequest<MongoProduct>(`/products/${id}`, { method: 'GET' })
  return mapProduct(product)
}

/**
 * HU-51: type-ahead catalog suggestions (up to 5). The backend returns the
 * stored image path; resolve it to a full URL here, same as mapProduct does.
 */
export async function getProductSuggestions(search: string) {
  const suggestions = await apiRequest<ProductSuggestion[]>('/products/suggestions', {
    method: 'GET',
    query: { search },
  })
  return suggestions.map((suggestion) => ({
    ...suggestion,
    imageUrl: suggestion.imageUrl ? resolveMediaUrl(suggestion.imageUrl) : '',
  }))
}

/**
 * HU-49: a product's reviews + rating summary. Public, but when the caller is a
 * signed-in customer the apiClient attaches their token and the response also
 * carries `viewer` eligibility flags (purchased / hasReviewed / canReview). The
 * backend already returns display-ready shapes, so no mapping is needed.
 */
export async function getProductReviews(productId: string) {
  return apiRequest<ProductReviewsResponse>(`/reviews/product/${productId}`, { method: 'GET' })
}

/**
 * Submit a review for a product (HU-49). Requires a signed-in customer who has
 * purchased it; the backend enforces both rules and returns the refreshed
 * reviews payload (including the viewer's updated flags).
 */
export async function createProductReview(
  productId: string,
  payload: { rating: number; comment?: string },
) {
  return apiRequest<ProductReviewsResponse>(`/reviews/product/${productId}`, {
    method: 'POST',
    body: payload,
  })
}

/**
 * HU-50: admin moderation queue. Lists reviews (optionally filtered by status),
 * newest first. Admin-only — the backend returns 403 for a non-admin token.
 */
export async function getReviewsForModeration(status?: ReviewStatus) {
  return apiRequest<AdminReview[]>('/reviews', {
    method: 'GET',
    query: status ? { status } : undefined,
  })
}

/**
 * Approve, reject, or hide a review (admin-only, HU-50). A rejection requires a
 * reason, which is emailed to the customer. Returns the updated review.
 */
export async function moderateReview(
  id: string,
  action: ReviewModerationAction,
  reason?: string,
) {
  return apiRequest<AdminReview>(`/reviews/${id}/moderate`, {
    method: 'PATCH',
    body: { action, reason },
  })
}

export async function syncClerkUser(payload: {
  clerkUserId: string
  fullName: string
  email: string
}) {
  const user = await apiRequest<MongoUser>('/users/sync-clerk', {
    method: 'POST',
    body: payload,
  })

  return mapUser(user)
}

export async function getUsers() {
  const users = await apiRequest<MongoUser[]>('/users', { method: 'GET' })
  return users.map(mapUser)
}

export async function updateUserRole(id: string, role: UserRole) {
  const user = await apiRequest<MongoUser>(`/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
  })
  return mapUser(user)
}

export async function updateUserStatus(id: string, isActive: boolean) {
  const user = await apiRequest<MongoUser>(`/users/${id}/status`, {
    method: 'PATCH',
    body: { isActive },
  })
  return mapUser(user)
}

export interface AdminMetrics {
  totalRevenue: number
  ordersCount: number
  activeProductsCount: number
  usersCount: number
}

/**
 * Server-computed admin dashboard summary (GET /api/admin/metrics). Admin-only:
 * the backend returns 403 for a CUSTOMER token. Single source of truth for the
 * four overview numbers — no client-side aggregation.
 */
export async function getAdminMetrics() {
  return apiRequest<AdminMetrics>('/admin/metrics', { method: 'GET' })
}

/**
 * HU-53: point-in-time inventory report as structured JSON (GET
 * /api/admin/inventory-report). Admin-only. Used to render the PDF/print view;
 * the CSV export uses the same endpoint with ?format=csv.
 */
export async function getInventoryReport() {
  return apiRequest<InventoryReport>('/admin/inventory-report', { method: 'GET' })
}

/**
 * HU-53: downloads the inventory report as a CSV file. Fetches the CSV variant
 * of the endpoint (server-generated, single source of truth) and triggers a
 * browser download using the server-suggested filename.
 */
export async function downloadInventoryReportCsv() {
  const { blob, filename } = await apiDownload('/admin/inventory-report', {
    query: { format: 'csv' },
  })
  triggerBrowserDownload(blob, filename ?? 'inventario.csv')
}

/**
 * HU-53: downloads the inventory report as a PDF file. The PDF is generated
 * server-side (pdf-lib) and downloaded directly — no browser print dialog.
 */
export async function downloadInventoryReportPdf() {
  const { blob, filename } = await apiDownload('/admin/inventory-report', {
    query: { format: 'pdf' },
  })
  triggerBrowserDownload(blob, filename ?? 'inventario.pdf')
}

// Creates a temporary object URL and clicks a hidden anchor to save `blob` as
// `filename`, then revokes the URL. Guarded for SSR (no document).
function triggerBrowserDownload(blob: Blob, filename: string) {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function mapAuditLog(entry: MongoAuditLog): AuditLogEntry {
  return {
    id: entry._id,
    actorClerkId: entry.actorClerkId,
    actorEmail: entry.actorEmail,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    changes: entry.changes,
    createdAt: entry.createdAt,
  }
}

export interface AuditLogFilters {
  action?: string
  actor?: string
  entityType?: AuditEntityType
  dateFrom?: string
  dateTo?: string
  limit?: number
}

/**
 * HU-52: read-only admin-action audit trail (GET /api/admin/audit), newest
 * first. Admin-only: the backend returns 403 for a CUSTOMER token. Optional
 * filters by action, actor (Clerk id or email) and createdAt date range.
 */
export async function getAuditLog(filters: AuditLogFilters = {}) {
  const events = await apiRequest<MongoAuditLog[]>('/admin/audit', {
    method: 'GET',
    query: {
      action: filters.action,
      actor: filters.actor,
      entityType: filters.entityType,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      limit: filters.limit,
    },
  })
  return events.map(mapAuditLog)
}

export async function getOrders() {
  const orders = await apiRequest<MongoOrder[]>('/orders', { method: 'GET' })
  return orders.map(mapOrder)
}

export async function getMyOrders(userId: string) {
  const orders = await apiRequest<MongoOrder[]>(`/orders/user/${userId}`, { method: 'GET' })
  return orders.map(mapOrder)
}

export async function getOrderById(orderId: string) {
  const order = await apiRequest<MongoOrder>(`/orders/${orderId}`, { method: 'GET' })
  return mapOrder(order)
}

export async function createOrder(payload: {
  userId: string
  items: Array<{ productId: string; quantity: number; size?: SizeLabel }>
}) {
  const order = await apiRequest<MongoOrder>('/orders', {
    method: 'POST',
    body: payload,
  })
  return mapOrder(order)
}

export async function cancelOrder(orderId: string) {
  const order = await apiRequest<MongoOrder>(`/orders/${orderId}/cancel`, {
    method: 'PATCH',
  })
  return mapOrder(order)
}

// Customer self-service: cancel a PAID order, or approve a return on a
// SHIPPED one — both auto-refund via Stripe without needing an admin.
export async function selfRefundOrder(orderId: string) {
  const order = await apiRequest<MongoOrder>(`/orders/${orderId}/self-refund`, {
    method: 'POST',
  })
  return mapOrder(order)
}

function mapOrderEvent(event: MongoOrderEvent): OrderEvent {
  return {
    id: event._id,
    orderId: event.orderId,
    type: event.type,
    actorClerkId: event.actorClerkId,
    reason: event.reason,
    metadata: event.metadata,
    createdAt: event.createdAt,
  }
}

/**
 * Issues a full Stripe refund for an order (admin-only). The backend marks it
 * REFUNDED, emails the customer and records the action in the order history.
 */
export async function refundOrder(orderId: string, reason?: string) {
  const order = await apiRequest<MongoOrder>(`/orders/${orderId}/refund`, {
    method: 'POST',
    body: { reason },
  })
  return mapOrder(order)
}

/** Admin-only order event history (refunds, status changes), newest first. */
export async function getOrderHistory(orderId: string) {
  const events = await apiRequest<MongoOrderEvent[]>(`/orders/${orderId}/history`, {
    method: 'GET',
  })
  return events.map(mapOrderEvent)
}

/**
 * Change an order's lifecycle status (admin-only). The backend validates the
 * transition, audits the change, and — when moving to SHIPPED — emails the
 * customer (with the optional tracking number).
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string,
  reason?: string,
) {
  const order = await apiRequest<MongoOrder>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: { status, trackingNumber, reason },
  })
  return mapOrder(order)
}

interface CheckoutSessionResponse {
  sessionId: string
  url: string
}

interface ConfirmCheckoutPaymentResponse {
  status: 'PAID'
}

export async function createCheckoutSession(payload: { orderId: string }) {
  return apiRequest<CheckoutSessionResponse>('/payments/create-checkout-session', {
    method: 'POST',
    body: payload,
  })
}

export async function confirmCheckoutPayment(payload: { orderId: string; sessionId?: string }) {
  return apiRequest<ConfirmCheckoutPaymentResponse>('/payments/confirm-checkout-payment', {
    method: 'POST',
    body: payload,
  })
}
