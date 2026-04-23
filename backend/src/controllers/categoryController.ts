import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler'
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from '../services/categoryService'

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await listCategories()
  res.status(200).json(categories)
})

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = (res.locals.validatedParams as { id: string }).id
  const category = await getCategoryById(id)
  res.status(200).json(category)
})

export const createCategoryController = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategory(res.locals.validatedBody)
  res.status(201).json(category)
})

export const updateCategoryController = asyncHandler(async (req: Request, res: Response) => {
  const id = (res.locals.validatedParams as { id: string }).id
  const category = await updateCategory(id, res.locals.validatedBody)
  res.status(200).json(category)
})

export const deleteCategoryController = asyncHandler(async (req: Request, res: Response) => {
  const id = (res.locals.validatedParams as { id: string }).id
  await deleteCategory(id)
  res.status(200).json({ message: 'Category deleted successfully' })
})
