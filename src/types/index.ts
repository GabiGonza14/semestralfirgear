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

export interface BackendOrder {
  id: string
  userId: string
  customerName?: string
  totalAmount: number
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  createdAt: string
  items: BackendOrderItem[]
}

export interface CartItemModel {
  product: Product
  quantity: number
  /** Only set for products whose category requires sizes. */
  size?: SizeLabel
}
