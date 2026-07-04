import { Types } from 'mongoose'
import { CategoryModel } from '../models/Category'
import { ProductModel } from '../models/Product'
import { HttpError } from '../utils/httpError'
import { isLocalProductUploadPath, removeLocalUploadFile } from '../utils/uploadPaths'

interface ProductSizeInput {
  label: string
  stock: number
}

interface ProductPayload {
  name?: string
  description?: string
  price?: number
  stock?: number
  images?: string[]
  sizes?: ProductSizeInput[]
  categoryId?: string
  isActive?: boolean
  hasDiscount?: boolean
  discountPercentage?: number
}

// When a category requires sizes, the per-size breakdown is the source of
// truth for stock — the flat `stock` field becomes an auto-computed sum so
// every existing consumer that just reads `product.stock` keeps working.
function resolveSizesAndStock(
  requiresSizes: boolean,
  sizesInput: ProductSizeInput[] | undefined,
  flatStock: number,
) {
  if (!requiresSizes) {
    return { sizes: [] as ProductSizeInput[], stock: flatStock }
  }

  const sizes = sizesInput ?? []
  if (sizes.length === 0) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'sizes', message: 'This category requires at least one size with stock' },
    ])
  }

  const labels = sizes.map((size) => size.label)
  if (new Set(labels).size !== labels.length) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'sizes', message: 'Duplicate size labels are not allowed' },
    ])
  }

  const stock = sizes.reduce((sum, size) => sum + size.stock, 0)
  return { sizes, stock }
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

  const category = await CategoryModel.findById(payload.categoryId)
  if (!category) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'categoryId', message: 'categoryId does not exist' },
    ])
  }

  const { sizes, stock } = resolveSizesAndStock(category.requiresSizes, payload.sizes, payload.stock ?? 0)

  const discount = calculateDiscount(
    payload.price ?? 0,
    payload.hasDiscount ?? false,
    payload.discountPercentage ?? 0,
  )

  return ProductModel.create({
    name: payload.name,
    description: payload.description,
    price: payload.price,
    stock,
    images: payload.images ?? [],
    sizes,
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

  const previousImages = product.images ?? []
  let removedImages: string[] = []

  if (payload.categoryId) {
    const categoryExists = await CategoryModel.exists({ _id: payload.categoryId })
    if (!categoryExists) {
      throw new HttpError(400, 'Validation failed', [
        { path: 'categoryId', message: 'categoryId does not exist' },
      ])
    }
    product.categoryId = new Types.ObjectId(payload.categoryId)
  }

  // Sizes-requirement is driven by the product's (possibly just-changed) category.
  const effectiveCategory = await CategoryModel.findById(product.categoryId)
  if (!effectiveCategory) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'categoryId', message: 'categoryId does not exist' },
    ])
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

  if (payload.images !== undefined) {
    removedImages = previousImages.filter((url) => !payload.images!.includes(url))
    product.images = payload.images
  }

  if (effectiveCategory.requiresSizes) {
    if (payload.sizes !== undefined) {
      const { sizes, stock } = resolveSizesAndStock(true, payload.sizes, 0)
      product.set('sizes', sizes)
      product.stock = stock
    } else if (payload.stock !== undefined) {
      throw new HttpError(400, 'Validation failed', [
        { path: 'stock', message: 'Stock is derived from sizes for this category; update sizes instead' },
      ])
    }

    if (product.sizes.length === 0) {
      throw new HttpError(400, 'Validation failed', [
        { path: 'sizes', message: 'This category requires at least one size with stock' },
      ])
    }
  } else {
    product.set('sizes', [])
    if (payload.stock !== undefined) {
      product.stock = payload.stock
    }
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

  for (const url of removedImages) {
    if (isLocalProductUploadPath(url)) {
      await removeLocalUploadFile(url)
    }
  }

  return product
}

export async function deleteProduct(id: string) {
  const product = await ProductModel.findById(id)
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  const images = product.images ?? []
  await product.deleteOne()

  for (const url of images) {
    if (isLocalProductUploadPath(url)) {
      await removeLocalUploadFile(url)
    }
  }
}
