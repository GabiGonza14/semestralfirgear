import { CategoryModel } from '../models/Category'
import { ProductModel } from '../models/Product'
import { HttpError } from '../utils/httpError'

interface CategoryPayload {
  name?: string
  description?: string
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

export async function listCategories() {
  return CategoryModel.find().sort({ createdAt: -1 })
}

export async function getCategoryById(id: string) {
  const category = await CategoryModel.findById(id)
  if (!category) {
    throw new HttpError(404, 'Category not found')
  }
  return category
}

export async function createCategory(payload: CategoryPayload) {
  const normalizedName = normalizeName(payload.name ?? '')

  const existing = await CategoryModel.findOne({
    name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  })

  if (existing) {
    throw new HttpError(409, 'Category name already exists')
  }

  return CategoryModel.create({
    name: payload.name,
    description: payload.description ?? '',
  })
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  const category = await CategoryModel.findById(id)
  if (!category) {
    throw new HttpError(404, 'Category not found')
  }

  if (payload.name) {
    const normalizedName = normalizeName(payload.name)
    const duplicate = await CategoryModel.findOne({
      _id: { $ne: id },
      name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    })

    if (duplicate) {
      throw new HttpError(409, 'Category name already exists')
    }

    category.name = payload.name
  }

  if (payload.description !== undefined) {
    category.description = payload.description
  }

  await category.save()
  return category
}

export async function deleteCategory(id: string) {
  const category = await CategoryModel.findById(id)
  if (!category) {
    throw new HttpError(404, 'Category not found')
  }

  const inUse = await ProductModel.exists({ categoryId: id })
  if (inUse) {
    throw new HttpError(409, 'Category cannot be deleted because it is used by products')
  }

  await category.deleteOne()
}
