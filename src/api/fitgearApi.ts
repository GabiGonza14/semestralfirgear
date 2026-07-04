import { apiRequest } from './apiClient'
import type { BackendOrder, BackendOrderItem, BackendUser, Product, SizeLabel } from '../types'
import { resolveMediaUrl } from '../utils/media'

interface MongoCategory {
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
  images: string[]
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
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED'
  createdAt: string
  items: MongoOrderItem[]
}

function mapProduct(product: MongoProduct): Product {
  const categoryName =
    typeof product.categoryId === 'string'
      ? 'Sin categoria'
      : product.categoryId?.name ?? 'Sin categoria'

  const images = (product.images ?? []).map(resolveMediaUrl)

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

export async function getProducts(params?: {
  categoryId?: string
  search?: string
  sortBy?: 'createdAt' | 'name' | 'price'
  sortOrder?: 'asc' | 'desc'
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
