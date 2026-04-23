export type UserRole = 'ADMIN' | 'CUSTOMER'

export interface Product {
  id: string
  categoryId: string
  name: string
  category: string
  price: number
  stock: number
  image: string
  description: string
  isActive: boolean
  featured?: boolean
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
  unitPrice: number
  subtotal: number
}

export interface BackendOrder {
  id: string
  userId: string
  customerName?: string
  totalAmount: number
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED'
  createdAt: string
  items: BackendOrderItem[]
}

export interface CartItemModel {
  product: Product
  quantity: number
}
