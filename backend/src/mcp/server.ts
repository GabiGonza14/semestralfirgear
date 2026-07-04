import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { connectDatabase } from '../config/db'
import { searchProductsInputSchema, searchProductsTool } from './tools/searchProducts'

const server = new McpServer({
  name: 'fitgear-mcp',
  version: '1.0.0',
})

server.registerTool(
  'search_products',
  {
    description:
      'Search the FITGEAR product catalog. Returns a compact list of active products filtered by text, category, and/or sort order. Mirrors the shop UI filters.',
    inputSchema: {
      search: { type: 'string', description: 'Free-text search on product name' },
      categoryId: { type: 'string', description: 'Filter by category ObjectId' },
      sortBy: {
        type: 'string',
        enum: ['createdAt', 'name', 'price'],
        description: 'Field to sort by (default: createdAt)',
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction (default: desc)',
      },
      limit: {
        type: 'number',
        description: 'Max products to return (1–100, default 20)',
      },
      token: {
        type: 'string',
        description: 'Optional Clerk JWT bearer token for authenticated requests',
      },
    },
  },
  async (args) => {
    const results = await searchProductsTool(args)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    }
  },
)

async function main() {
  await connectDatabase()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('FITGEAR MCP server running on stdio')
}

main().catch((err) => {
  console.error('MCP server failed to start:', err)
  process.exit(1)
})
