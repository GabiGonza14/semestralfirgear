import { z } from 'zod'
import { requireAuthStrict } from '../../middlewares/requireAuth'
import { UserModel } from '../../models/User'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../services/categoryService'
import { HttpError } from '../../utils/httpError'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'id must be a valid ObjectId')

// The Category model is simple (name, description, requiresSizes) and its service
// already guards its own invariants (case-insensitive unique name, can't delete a
// category still in use), so the full CRUD is safe to expose as one tool keyed by
// an `action` discriminator.
export const manageCategoriesInputSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('list'), token: z.string().min(1, 'token is required') }),
  z.object({
    action: z.literal('create'),
    token: z.string().min(1, 'token is required'),
    name: z.string().trim().min(1, 'name is required'),
    description: z.string().trim().optional(),
    requiresSizes: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('update'),
    token: z.string().min(1, 'token is required'),
    id: objectId,
    name: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    requiresSizes: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('delete'),
    token: z.string().min(1, 'token is required'),
    id: objectId,
  }),
])

export type ManageCategoriesInput = z.infer<typeof manageCategoriesInputSchema>

export interface CategoryView {
  id: string
  name: string
  description: string
  requiresSizes: boolean
}

interface RawCategory {
  _id: unknown
  name: string
  description: string
  requiresSizes: boolean
}

function mapCategory(category: RawCategory): CategoryView {
  return {
    id: String(category._id),
    name: category.name,
    description: category.description,
    requiresSizes: category.requiresSizes,
  }
}

export type ManageCategoriesResult =
  | { action: 'list'; ok: true; categories: CategoryView[] }
  | { action: 'create' | 'update'; ok: true; category: CategoryView }
  | { action: 'delete'; ok: true; id: string }
  | { action: ManageCategoriesInput['action']; ok: false; statusCode: number; message: string }

export async function manageCategoriesTool(raw: unknown): Promise<ManageCategoriesResult> {
  const input = manageCategoriesInputSchema.parse(raw)

  // Protected admin-only tool — the role check applies to ALL actions, list included.
  const auth = await requireAuthStrict(input.token)
  const clerkUserId = auth.userId
  const user = clerkUserId
    ? await UserModel.findOne({ clerkUserId }).select('role')
    : null
  if (!user || user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: admin role required')
  }

  try {
    switch (input.action) {
      case 'list': {
        const categories = (await listCategories()) as unknown as RawCategory[]
        return { action: 'list', ok: true, categories: categories.map(mapCategory) }
      }
      case 'create': {
        const category = (await createCategory({
          name: input.name,
          description: input.description,
          requiresSizes: input.requiresSizes,
        })) as unknown as RawCategory
        return { action: 'create', ok: true, category: mapCategory(category) }
      }
      case 'update': {
        if (
          input.name === undefined &&
          input.description === undefined &&
          input.requiresSizes === undefined
        ) {
          throw new HttpError(400, 'update requires at least one of name/description/requiresSizes')
        }
        const category = (await updateCategory(input.id, {
          name: input.name,
          description: input.description,
          requiresSizes: input.requiresSizes,
        })) as unknown as RawCategory
        return { action: 'update', ok: true, category: mapCategory(category) }
      }
      case 'delete': {
        await deleteCategory(input.id)
        return { action: 'delete', ok: true, id: input.id }
      }
    }
  } catch (err) {
    // Translate the service's thrown HttpError (404 not-found, 409 duplicate /
    // in-use) into a clean, readable result instead of a raw stack.
    if (err instanceof HttpError) {
      return { action: input.action, ok: false, statusCode: err.statusCode, message: err.message }
    }
    throw err
  }
}
