import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { recordAuditAction } from '../services/auditLogService'
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  type ProductQuery,
  suggestProducts,
  updateProduct,
} from '../services/productService'

export const getProducts = async (c: Context<AppEnv>) => {
  const query = (c.get('validatedQuery') ?? c.req.query()) as ProductQuery
  const products = await listProducts(query)
  return c.json(products, 200)
}

// HU-51: type-ahead suggestions for the catalog search bar.
export const getProductSuggestions = async (c: Context<AppEnv>) => {
  const { search } = c.get('validatedQuery') as { search?: string }
  const suggestions = await suggestProducts(search ?? '')
  return c.json(suggestions, 200)
}

export const getProduct = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const product = await getProductById(id)
  return c.json(product, 200)
}

export const createProductController = async (c: Context<AppEnv>) => {
  const product = await createProduct(c.get('validatedBody'))
  await recordAuditAction({
    actorClerkId: c.get('userId'),
    action: 'PRODUCT_CREATED',
    entityType: 'PRODUCT',
    entityId: String(product._id),
    changes: { name: product.name, price: product.price, stock: product.stock },
  })
  return c.json(product, 201)
}

export const updateProductController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const product = await updateProduct(id, c.get('validatedBody'))
  await recordAuditAction({
    actorClerkId: c.get('userId'),
    action: 'PRODUCT_UPDATED',
    entityType: 'PRODUCT',
    entityId: id,
    changes: { name: product.name, price: product.price, stock: product.stock, isActive: product.isActive },
  })
  return c.json(product, 200)
}

export const deleteProductController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  await deleteProduct(id)
  await recordAuditAction({
    actorClerkId: c.get('userId'),
    action: 'PRODUCT_DELETED',
    entityType: 'PRODUCT',
    entityId: id,
  })
  return c.json({ message: 'Product deleted successfully' }, 200)
}
