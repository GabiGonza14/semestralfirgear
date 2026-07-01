import { z } from 'zod'
import { listCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../../services/categoryService'
import { McpAuthError, requireMcpAuth } from '../auth'
import { HttpError } from '../../utils/httpError'

function errorText(err: unknown): string {
  if (err instanceof McpAuthError) return err.message
  if (err instanceof HttpError) return `Error ${err.statusCode}: ${err.message}`
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

export const categoryToolDefs = [
  {
    name: 'listCategories',
    description: 'List all product categories. Public — no token required.',
    schema: {},
    handler: async (_params: Record<string, never>) => {
      try {
        const categories = await listCategories()
        return { content: [{ type: 'text' as const, text: JSON.stringify(categories, null, 2) }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
  {
    name: 'getCategory',
    description: 'Get a single category by ID. Public — no token required.',
    schema: {
      id: z.string().describe('Category ObjectId (24-char hex)'),
    },
    handler: async (params: { id: string }) => {
      try {
        const category = await getCategoryById(params.id)
        return { content: [{ type: 'text' as const, text: JSON.stringify(category, null, 2) }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
  {
    name: 'createCategory',
    description: 'Create a new category. Requires a valid Clerk JWT (admin).',
    schema: {
      token: z.string().describe('Clerk JWT session token'),
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    },
    handler: async (params: { token: string; name: string; description?: string }) => {
      try {
        await requireMcpAuth(params.token)
        const category = await createCategory({ name: params.name, description: params.description })
        return { content: [{ type: 'text' as const, text: JSON.stringify(category, null, 2) }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
  {
    name: 'updateCategory',
    description: 'Update a category by ID. Requires a valid Clerk JWT (admin).',
    schema: {
      token: z.string().describe('Clerk JWT session token'),
      id: z.string().describe('Category ObjectId'),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
    },
    handler: async (params: { token: string; id: string; name?: string; description?: string }) => {
      try {
        await requireMcpAuth(params.token)
        const category = await updateCategory(params.id, { name: params.name, description: params.description })
        return { content: [{ type: 'text' as const, text: JSON.stringify(category, null, 2) }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
  {
    name: 'deleteCategory',
    description: 'Delete a category by ID. Requires a valid Clerk JWT (admin).',
    schema: {
      token: z.string().describe('Clerk JWT session token'),
      id: z.string().describe('Category ObjectId'),
    },
    handler: async (params: { token: string; id: string }) => {
      try {
        await requireMcpAuth(params.token)
        await deleteCategory(params.id)
        return { content: [{ type: 'text' as const, text: 'Category deleted successfully' }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
] as const
