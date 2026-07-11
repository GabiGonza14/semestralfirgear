import type { Context } from 'hono'
import type { AppEnv } from '../app'
import { recordAuditAction } from '../services/auditLogService'
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from '../services/categoryService'

export const getCategories = async (c: Context<AppEnv>) => {
  const categories = await listCategories()
  return c.json(categories, 200)
}

export const getCategory = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const category = await getCategoryById(id)
  return c.json(category, 200)
}

export const createCategoryController = async (c: Context<AppEnv>) => {
  const category = await createCategory(c.get('validatedBody'))
  await recordAuditAction({
    actorClerkId: c.get('userId'),
    action: 'CATEGORY_CREATED',
    entityType: 'CATEGORY',
    entityId: String(category._id),
    changes: { name: category.name, requiresSizes: category.requiresSizes },
  })
  return c.json(category, 201)
}

export const updateCategoryController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  const category = await updateCategory(id, c.get('validatedBody'))
  await recordAuditAction({
    actorClerkId: c.get('userId'),
    action: 'CATEGORY_UPDATED',
    entityType: 'CATEGORY',
    entityId: id,
    changes: { name: category.name, requiresSizes: category.requiresSizes },
  })
  return c.json(category, 200)
}

export const deleteCategoryController = async (c: Context<AppEnv>) => {
  const { id } = c.get('validatedParams') as { id: string }
  await deleteCategory(id)
  await recordAuditAction({
    actorClerkId: c.get('userId'),
    action: 'CATEGORY_DELETED',
    entityType: 'CATEGORY',
    entityId: id,
  })
  return c.json({ message: 'Category deleted successfully' }, 200)
}
