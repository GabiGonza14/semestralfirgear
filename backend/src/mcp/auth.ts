import { verifyToken } from '@clerk/backend'
import { env } from '../config/env'

export class McpAuthError extends Error {
  constructor(message = 'Unauthorized: invalid or expired token') {
    super(message)
    this.name = 'McpAuthError'
  }
}

/**
 * Validates a Clerk JWT session token passed by the MCP client.
 * Returns the Clerk user ID (sub) on success, throws McpAuthError on failure.
 */
export async function requireMcpAuth(token: string | undefined): Promise<string> {
  if (!token || token.trim() === '') {
    throw new McpAuthError('Unauthorized: token is required for this tool')
  }

  try {
    const payload = await verifyToken(token, { secretKey: env.clerkSecretKey })
    return payload.sub
  } catch {
    throw new McpAuthError('Unauthorized: invalid or expired token')
  }
}
