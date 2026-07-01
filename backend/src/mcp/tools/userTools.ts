import { z } from 'zod'
import { listUsers, getUserById } from '../../services/userService'
import { McpAuthError, requireMcpAuth } from '../auth'
import { HttpError } from '../../utils/httpError'

function errorText(err: unknown): string {
  if (err instanceof McpAuthError) return err.message
  if (err instanceof HttpError) return `Error ${err.statusCode}: ${err.message}`
  if (err instanceof Error) return err.message
  return 'Unknown error'
}

export const userToolDefs = [
  {
    name: 'listUsers',
    description: 'List all registered users. Requires a valid Clerk JWT (admin).',
    schema: {
      token: z.string().describe('Clerk JWT session token'),
    },
    handler: async (params: { token: string }) => {
      try {
        await requireMcpAuth(params.token)
        const users = await listUsers()
        return { content: [{ type: 'text' as const, text: JSON.stringify(users, null, 2) }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
  {
    name: 'getUser',
    description: 'Get a user by ID. Requires a valid Clerk JWT.',
    schema: {
      token: z.string().describe('Clerk JWT session token'),
      id: z.string().describe('User ObjectId'),
    },
    handler: async (params: { token: string; id: string }) => {
      try {
        await requireMcpAuth(params.token)
        const user = await getUserById(params.id)
        return { content: [{ type: 'text' as const, text: JSON.stringify(user, null, 2) }] }
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true }
      }
    },
  },
] as const
