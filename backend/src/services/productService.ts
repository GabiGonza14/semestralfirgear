import { Types } from 'mongoose'
import { cloudinary } from '../config/cloudinary'
import { CategoryModel } from '../models/Category'
import { ProductModel } from '../models/Product'
import { HttpError } from '../utils/httpError'
import { logger } from '../utils/logger'
import { isLocalProductUploadPath, removeLocalUploadFile } from '../utils/uploadPaths'
import { notifyAdminsOfLowStockCrossing } from './lowStockService'

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
  // Cloudinary public IDs for the just-uploaded files in `images`, in upload
  // order — set by uploadProductImage.ts, not client-authored.
  newImagePublicIds?: string[]
  sizes?: ProductSizeInput[]
  categoryId?: string
  isActive?: boolean
  hasDiscount?: boolean
  discountPercentage?: number
  lowStockThreshold?: number
}

async function resolveCategoryOrThrow(categoryId: string) {
  const category = await CategoryModel.findById(categoryId)
  if (!category) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'categoryId', message: 'categoryId does not exist' },
    ])
  }
  return category
}

interface RemovableImage {
  url: string
  publicId: string
}

// Best-effort cleanup, run after the DB write that actually drops the image
// reference has already succeeded — a failed delete here must never fail the
// request or block deleting the rest. Cloudinary asset first (has a publicId);
// falls back to the legacy local-disk path for pre-migration images.
async function removeUploadedImages(images: RemovableImage[]) {
  for (const { url, publicId } of images) {
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId)
      } catch (error) {
        logger.error('Failed to delete Cloudinary asset', { publicId, error })
      }
    } else if (isLocalProductUploadPath(url)) {
      await removeLocalUploadFile(url)
    }
  }
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

// Computes the sizes-vs-flat-stock fields to persist for a product being
// edited: sized categories derive stock from the size breakdown, others use
// the flat field directly. Pulled out of updateProduct to keep its branching
// simple. `currentSizesCount` is the size-count of the untouched document,
// used to validate the post-update state when the caller doesn't touch sizes.
function computeSizesOrStock(
  requiresSizes: boolean,
  payload: Pick<ProductPayload, 'sizes' | 'stock'>,
  currentSizesCount: number,
): { sizes?: ProductSizeInput[]; stock?: number } {
  if (!requiresSizes) {
    return { sizes: [], ...(payload.stock !== undefined ? { stock: payload.stock } : {}) }
  }

  let result: { sizes?: ProductSizeInput[]; stock?: number } = {}
  let resultingSizesCount = currentSizesCount

  if (payload.sizes !== undefined) {
    const { sizes, stock } = resolveSizesAndStock(true, payload.sizes, 0)
    result = { sizes, stock }
    resultingSizesCount = sizes.length
  } else if (payload.stock !== undefined) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'stock', message: 'Stock is derived from sizes for this category; update sizes instead' },
    ])
  }

  if (resultingSizesCount === 0) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'sizes', message: 'This category requires at least one size with stock' },
    ])
  }

  return result
}

export interface ProductQuery {
  categoryId?: string
  search?: string
  sortBy?: 'createdAt' | 'name' | 'price'
  sortOrder?: 'asc' | 'desc'
  includeInactive?: boolean
}

export async function listProducts(query: ProductQuery) {
  const filter: Record<string, unknown> = {}

  // Hide inactive products from the public catalog; admin passes includeInactive.
  if (!query.includeInactive) {
    filter.isActive = true
  }

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

// HU-51: search autocomplete. Minimum query length before suggestions kick in.
export const SUGGESTION_MIN_CHARS = 2
// AC: at most 5 suggestions.
export const SUGGESTION_LIMIT = 5

export interface ProductSuggestion {
  id: string
  name: string
  imageUrl: string
}

/**
 * HU-51: fast type-ahead suggestions for the catalog search bar. Optimised for
 * the "<200ms" acceptance criterion — a lean, projected query (only the fields
 * the dropdown renders), capped at 5 rows, with no category populate. Only
 * active products are suggested, and a query shorter than SUGGESTION_MIN_CHARS
 * returns nothing (the dropdown only opens from 2 characters).
 */
export async function suggestProducts(search: string): Promise<ProductSuggestion[]> {
  const trimmed = search.trim()
  if (trimmed.length < SUGGESTION_MIN_CHARS) {
    return []
  }

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  const docs = await ProductModel.find({
    isActive: true,
    name: { $regex: escaped, $options: 'i' },
  })
    .select('name images')
    .sort({ name: 1 })
    .limit(SUGGESTION_LIMIT)
    .lean()

  return docs.map((product) => ({
    id: String(product._id),
    name: product.name,
    imageUrl: product.images?.[0] ?? '',
  }))
}

export async function createProduct(payload: ProductPayload) {
  if (!payload.categoryId) {
    throw new HttpError(400, 'Validation failed', [
      { path: 'categoryId', message: 'categoryId is required' },
    ])
  }

  const category = await resolveCategoryOrThrow(payload.categoryId)

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
    // Omit when undefined so the schema default (5) applies.
    ...(payload.lowStockThreshold !== undefined
      ? { lowStockThreshold: payload.lowStockThreshold }
      : {}),
    images: payload.images ?? [],
    // On create every image is a fresh upload, so this lines up 1:1 with
    // `images` in order — no existing images to correlate against.
    imagePublicIds: payload.newImagePublicIds ?? [],
    sizes,
    categoryId: payload.categoryId,
    isActive: payload.isActive ?? true,
    hasDiscount: discount.hasDiscount,
    discountPercentage: discount.discountPercentage,
    discountAmount: discount.discountAmount,
    finalPrice: discount.finalPrice,
  })
}

// Local uploads are stored as root-relative paths (/uploads/...), but the
// admin form round-trips them as absolute URLs. Normalize before comparing/
// storing so we never delete a file that's actually being kept (and self-heal
// any product whose images were previously saved as absolute URLs). Only
// applies to our OWN local-upload path — an external absolute URL (Cloudinary's
// CDN host) must be kept as-is, since stripping it to a bare pathname would
// discard the host that makes it resolvable at all.
function toRelativeUploadPath(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    try {
      const pathname = new URL(url).pathname
      return pathname.startsWith('/uploads/products/') ? pathname : url
    } catch {
      return url
    }
  }
  return url
}

export async function updateProduct(id: string, payload: ProductPayload) {
  const product = await ProductModel.findById(id)
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  const previousImages = product.images ?? []
  const previousImagePublicIds = product.imagePublicIds ?? []
  const urlToPublicId = new Map(
    previousImages.map((url, index) => [toRelativeUploadPath(url), previousImagePublicIds[index] ?? '']),
  )

  if (payload.categoryId) {
    await resolveCategoryOrThrow(payload.categoryId)
  }
  const targetCategoryId = payload.categoryId ?? product.categoryId.toString()

  // Sizes-requirement is driven by the product's (possibly just-changed) category.
  const effectiveCategory = await resolveCategoryOrThrow(targetCategoryId)

  const updateFields: Record<string, unknown> = {}

  if (payload.name !== undefined) {
    updateFields.name = payload.name
  }
  if (payload.description !== undefined) {
    updateFields.description = payload.description
  }
  if (payload.price !== undefined) {
    updateFields.price = payload.price
  }
  if (payload.categoryId) {
    updateFields.categoryId = new Types.ObjectId(payload.categoryId)
  }

  let removedImages: RemovableImage[] = []
  if (payload.images !== undefined) {
    const nextImages = payload.images.map(toRelativeUploadPath)
    removedImages = previousImages
      .filter((url) => !nextImages.includes(toRelativeUploadPath(url)))
      .map((url) => ({ url, publicId: urlToPublicId.get(toRelativeUploadPath(url)) ?? '' }))
    updateFields.images = nextImages

    // The upload middleware always builds `images` as [...kept, ...newlyUploaded],
    // in that order — so the last `newImagePublicIds.length` entries are the new
    // uploads (their public IDs are already known), and everything before that
    // is a kept image whose public ID we look up from the product's previous state.
    const newImagePublicIds = payload.newImagePublicIds ?? []
    const keptCount = nextImages.length - newImagePublicIds.length
    const keptImages = nextImages.slice(0, keptCount)
    const keptPublicIds = keptImages.map((url) => urlToPublicId.get(url) ?? '')
    updateFields.imagePublicIds = [...keptPublicIds, ...newImagePublicIds]
  }

  const sizesOrStock = computeSizesOrStock(effectiveCategory.requiresSizes, payload, product.sizes.length)
  Object.assign(updateFields, sizesOrStock)

  if (payload.isActive !== undefined) {
    updateFields.isActive = payload.isActive
  }
  if (payload.lowStockThreshold !== undefined) {
    updateFields.lowStockThreshold = payload.lowStockThreshold
  }

  const hasDiscount = payload.hasDiscount ?? product.hasDiscount
  const discountPercentage = payload.discountPercentage ?? product.discountPercentage
  const price = (updateFields.price as number | undefined) ?? product.price
  const discount = calculateDiscount(price, hasDiscount, discountPercentage)
  updateFields.hasDiscount = discount.hasDiscount
  updateFields.discountPercentage = discount.discountPercentage
  updateFields.discountAmount = discount.discountAmount
  updateFields.finalPrice = discount.finalPrice

  // $set (not a full-document save) so Mongoose only validates the fields
  // actually being changed — a product with pre-existing invalid data in an
  // untouched field (e.g. legacy empty `images`) must not block this update.
  const updated = await ProductModel.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { new: true, runValidators: true, context: 'query' },
  )
  if (!updated) {
    throw new HttpError(404, 'Product not found')
  }

  await removeUploadedImages(removedImages)

  // HU-46: an admin edit (including the update_stock MCP tool) can drop stock
  // past the threshold. Compare the pre-update stock against the new stock/
  // threshold and email admins only on the downward crossing. Fire-and-forget —
  // never let alerting affect the update result.
  void notifyAdminsOfLowStockCrossing(
    {
      id: String(updated._id),
      name: updated.name,
      stock: updated.stock,
      lowStockThreshold: updated.lowStockThreshold,
    },
    product.stock,
  )

  return updated
}

export async function deleteProduct(id: string) {
  const product = await ProductModel.findById(id)
  if (!product) {
    throw new HttpError(404, 'Product not found')
  }

  const images = product.images ?? []
  const imagePublicIds = product.imagePublicIds ?? []
  await product.deleteOne()
  await removeUploadedImages(images.map((url, index) => ({ url, publicId: imagePublicIds[index] ?? '' })))
}
