import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { connectDatabase } from '../config/db'
import { getOrderStatusTool } from './tools/getOrderStatus'
import { getProductDetailsTool } from './tools/getProductDetails'
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

server.registerTool(
  'get_product_details',
  {
    description:
      'Fetch full details for a single FITGEAR product by its id. Returns core fields (name, description, price, finalPrice, discount, stock, isActive, category, images) or a clear not-found result if the product does not exist.',
    inputSchema: {
      productId: { type: 'string', description: 'Mongo ObjectId of the product' },
      token: {
        type: 'string',
        description: 'Optional Clerk JWT bearer token for authenticated requests',
      },
    },
  },
  async (args) => {
    const result = await getProductDetailsTool(args)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  },
)

server.registerTool(
  'get_order_status',
  {
    description:
      "Fetch the authenticated customer's own order history and status. Requires a valid Clerk JWT (protected tool). Returns the caller's orders with status, totals, and items, or an empty list if they have none.",
    inputSchema: {
      token: {
        type: 'string',
        description: 'Clerk JWT bearer token of the requesting customer (required)',
      },
    },
  },
  async (args) => {
    const result = await getOrderStatusTool(args)
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
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
