import { Types } from 'mongoose'
import { CategoryModel } from '../models/Category'
import { ProductModel } from '../models/Product'
import { HttpError } from '../utils/httpError'
import { isLocalProductUploadPath, removeLocalUploadFile } from '../utils/uploadPaths'

interface ProductPayload {
  name?: string
  description?: string
  price?: number
  stock?: number
  imageUrl?: string
  categoryId?: string
  isActive?: boolean
  hasDiscount?: boolean
  discountPercentage?: number
}

interface DiscountResult {
  hasDiscount: boolean
  discountPercentage: number
  discountAmount: number
  finalPrice: number
}

function calculateDiscount(
  price: number,
  hasDiscount: boolean,
  discountPercentage: number,
): DiscountResult {
  if (!hasDiscount) {
    return { hasDiscount: false, discountPercentage: 0, discountAmount: 0, finalPrice: price }
  }

  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'discountPercentage', message: 'discountPercentage must be between 0 and 100' },
    ])
  }

  const discountAmount = Math.round(price * discountPercentage) / 100
  const finalPrice = Math.round((price - discountAmount) * 100) / 100

  return { hasDiscount: true, discountPercentage, discountAmount, finalPrice }
}

export interface ProductQuery {
  categoryId?: string
  search?: string
  sortBy?: 'createdAt' | 'name' | 'price'
  sortOrder?: 'asc' | 'desc'
}

export async function listProducts(query: ProductQuery) {
  const filter: Record<string, unknown> = {}

  if (query.categoryId) {
    filter.categoryId = query.categoryId
  }

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.name = { $regex: escaped, $options: 'i' }
  }

  const sortBy = query.sortBy ?? 'createdAt'
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1

  return ProductModel.find(filter)
    .populate('categoryId', 'name description')
    .sort({ [sortBy]: sortOrder })
}

export async function getProductById(id: string) {
  const product = await ProductModel.findById(id).populate('categoryId', 'name description')
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }
  return product
}

export async function createProduct(payload: ProductPayload) {
  if (!payload.categoryId) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'categoryId', message: 'categoryId is required' },
    ])
  }

  const categoryExists = await CategoryModel.exists({ _id: payload.categoryId })
  if (!categoryExists) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'categoryId', message: 'categoryId does not exist' },
    ])
  }

  const discount = calculateDiscount(
    payload.price ?? 0,
    payload.hasDiscount ?? false,
    payload.discountPercentage ?? 0,
  )

  return ProductModel.create({
    name: payload.name,
    description: payload.description,
    price: payload.price,
    stock: payload.stock,
    imageUrl: payload.imageUrl,
    categoryId: payload.categoryId,
    isActive: payload.isActive ?? true,
    hasDiscount: discount.hasDiscount,
    discountPercentage: discount.discountPercentage,
    discountAmount: discount.discountAmount,
    finalPrice: discount.finalPrice,
  })
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const product = await ProductModel.findById(id)
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  const previousImageUrl = product.imageUrl
  let imageReplaced = false

  if (payload.categoryId) {
    const categoryExists = await CategoryModel.exists({ _id: payload.categoryId })
    if (!categoryExists) {
      throw new HttpError(400, 'Validation failed', [
        { path: 'categoryId', message: 'categoryId does not exist' },
      ])
    }
    product.categoryId = new Types.ObjectId(payload.categoryId)
  }

  if (payload.name !== undefined) {
    product.name = payload.name
  }
  if (payload.description !== undefined) {
    product.description = payload.description
  }
  if (payload.price !== undefined) {
    product.price = payload.price
  }
  if (payload.stock !== undefined) {
    product.stock = payload.stock
  }
  if (payload.imageUrl !== undefined) {
    imageReplaced = payload.imageUrl !== previousImageUrl
    product.imageUrl = payload.imageUrl
  }
  if (payload.isActive !== undefined) {
    product.isActive = payload.isActive
  }

  const hasDiscount = payload.hasDiscount ?? product.hasDiscount
  const discountPercentage = payload.discountPercentage ?? product.discountPercentage
  const discount = calculateDiscount(product.price, hasDiscount, discountPercentage)
  product.hasDiscount = discount.hasDiscount
  product.discountPercentage = discount.discountPercentage
  product.discountAmount = discount.discountAmount
  product.finalPrice = discount.finalPrice

  await product.save()

  if (imageReplaced && isLocalProductUploadPath(previousImageUrl)) {
    await removeLocalUploadFile(previousImageUrl)
  }

  return product
}

export async function deleteProduct(id: string) {
  const product = await ProductModel.findById(id)
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  const imageUrl = product.imageUrl
  await product.deleteOne()

  if (isLocalProductUploadPath(imageUrl)) {
    await removeLocalUploadFile(imageUrl)
  }
}
