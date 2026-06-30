import type { Context } from 'hono'
import type { AppEnv } from '../app'
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  type ProductQuery,
  updateProduct,
} from '../services/productService'

export const getProducts = async (c: Context<AppEnv>) => {
  const query = (c.get('validatedQuery') ?? c.req.query()) as ProductQuery
  const products = await listProducts(query)
  return c.json(products, 200)
}

export const getProduct = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const product = await getProductById(id)
  return c.json(product, 200)
}

export const createProductController = async (c: Context<AppEnv>) => {
  const product = await createProduct(c.get('validatedBody'))
  return c.json(product, 201)
}

export const updateProductController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const product = await updateProduct(id, c.get('validatedBody'))
  return c.json(product, 200)
}

export const deleteProductController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  await deleteProduct(id)
  return c.json({ message: 'Product deleted successfully' }, 200)
}
