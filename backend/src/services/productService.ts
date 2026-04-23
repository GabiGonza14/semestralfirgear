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

  return ProductModel.create({
    name: payload.name,
    description: payload.description,
    price: payload.price,
    stock: payload.stock,
    imageUrl: payload.imageUrl,
    categoryId: payload.categoryId,
    isActive: payload.isActive ?? true,
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
