import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { connectDatabase } from '../config/db'
import { getOrderStatusTool } from './tools/getOrderStatus'
import { getProductDetailsTool } from './tools/getProductDetails'
import { getSalesMetricsTool } from './tools/getSalesMetrics'
import { searchProductsInputSchema, searchProductsTool } from './tools/searchProducts'
import { updateStockTool } from './tools/updateStock'

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

server.registerTool(
  'get_sales_metrics',
  {
    description:
      'Return the FITGEAR admin dashboard summary metrics: totalRevenue (PAID/SHIPPED/DELIVERED orders), ordersCount, activeProductsCount, and usersCount. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role.',
    inputSchema: {
      token: {
        type: 'string',
        description: 'Clerk JWT bearer token of the requesting admin (required)',
      },
    },
  },
  async (args) => {
    const result = await getSalesMetricsTool(args)
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
  'update_stock',
  {
    description:
      "Update a single product's stock (inventory management only — not full product CRUD). Provide exactly one of `stock` (flat number) or `sizes` (per-size breakdown), depending on the product's category. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role.",
    inputSchema: {
      productId: { type: 'string', description: 'Mongo ObjectId of the product' },
      token: {
        type: 'string',
        description: 'Clerk JWT bearer token of the requesting admin (required)',
      },
      stock: {
        type: 'number',
        description: 'New flat stock count (for products whose category does not require sizes)',
      },
      sizes: {
        type: 'array',
        description: 'Per-size stock breakdown (for sized categories): [{ label, stock }]',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            stock: { type: 'number' },
          },
        },
      },
    },
  },
  async (args) => {
    const result = await updateStockTool(args)
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
