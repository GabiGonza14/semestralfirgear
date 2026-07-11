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

export interface CartItemModel {
  product: Product
  quantity: number
  /** Only set for products whose category requires sizes. */
  size?: SizeLabel
}
