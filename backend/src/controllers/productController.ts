import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  type ProductQuery,
  updateProduct,
} from '../services/productService'

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = (res.locals.validatedQuery ?? req.query) as ProductQuery
  const products = await listProducts(query)
  res.status(200).json(products)
})

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = (res.locals.validatedParams as { id: string }).id
  const product = await getProductById(id)
  res.status(200).json(product)
})

export const createProductController = asyncHandler(async (req: Request, res: Response) => {
  const product = await createProduct(res.locals.validatedBody)
  res.status(201).json(product)
})

export const updateProductController = asyncHandler(async (req: Request, res: Response) => {
  const id = (res.locals.validatedParams as { id: string }).id
  const product = await updateProduct(id, res.locals.validatedBody)
  res.status(200).json(product)
})

export const deleteProductController = asyncHandler(async (req: Request, res: Response) => {
  const id = (res.locals.validatedParams as { id: string }).id
  await deleteProduct(id)
  res.status(200).json({ message: 'Product deleted successfully' })
})
