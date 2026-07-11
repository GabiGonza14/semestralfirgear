import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { connectDatabase } from '../../backend/src/config/db'
import { getLowStockAlertsTool } from './tools/getLowStockAlerts'
import { getOrderStatusTool } from './tools/getOrderStatus'
import { getProductDetailsTool } from './tools/getProductDetails'
import { getProductReviewsTool } from './tools/getProductReviews'
import { getSalesMetricsTool } from './tools/getSalesMetrics'
import { listOrdersTool } from './tools/listOrders'
import { manageCategoriesTool } from './tools/manageCategories'
import { searchProductsTool } from './tools/searchProducts'
import { updateOrderStatusTool } from './tools/updateOrderStatus'
import { updateStockTool } from './tools/updateStock'

const server = new McpServer({
  name: 'fitgear-mcp',
  version: '1.0.0',
})

// `inputSchema` must be a Zod raw shape (an object of Zod validators). It acts as
// a permissive SDK-level gate; each tool re-parses with its own strict schema
// (discriminated unions, "exactly one of", etc.) before doing any work.

server.registerTool(
  'search_products',
  {
    description:
      'Search the FITGEAR product catalog. Returns a compact list of active products filtered by text, category, and/or sort order. Mirrors the shop UI filters.',
    inputSchema: {
      search: z.string().optional().describe('Free-text search on product name'),
      categoryId: z.string().optional().describe('Filter by category ObjectId'),
      sortBy: z
        .enum(['createdAt', 'name', 'price'])
        .optional()
        .describe('Field to sort by (default: createdAt)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc)'),
      limit: z.number().optional().describe('Max products to return (1–100, default 20)'),
      token: z
        .string()
        .optional()
        .describe('Optional Clerk JWT bearer token for authenticated requests'),
    },
  },
  async (args) => {
    const results = await searchProductsTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
    }
  },
)

server.registerTool(
  'get_product_details',
  {
    description:
      'Fetch full details for a single FITGEAR product by its id. Returns core fields (name, description, price, finalPrice, discount, stock, isActive, category, images) or a clear not-found result if the product does not exist.',
    inputSchema: {
      productId: z.string().describe('Mongo ObjectId of the product'),
      token: z
        .string()
        .optional()
        .describe('Optional Clerk JWT bearer token for authenticated requests'),
    },
  },
  async (args) => {
    const result = await getProductDetailsTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'get_product_reviews',
  {
    description:
      "Fetch a FITGEAR product's customer reviews and rating summary by product id. Public read — returns a summary (count, averageRating, per-star distribution) plus each review (rating, comment, reviewerName, createdAt), or a clear not-found result if the product does not exist. Useful for including satisfaction signals in recommendations or analysis.",
    inputSchema: {
      productId: z.string().describe('Mongo ObjectId of the product'),
      token: z
        .string()
        .optional()
        .describe('Optional Clerk JWT bearer token for authenticated requests'),
    },
  },
  async (args) => {
    const result = await getProductReviewsTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'get_order_status',
  {
    description:
      "Fetch the authenticated customer's own order history and status. Requires a valid Clerk JWT (protected tool). Returns the caller's orders with status, totals, and items, or an empty list if they have none.",
    inputSchema: {
      token: z
        .string()
        .optional()
        .describe('Clerk JWT bearer token of the requesting customer (required)'),
    },
  },
  async (args) => {
    const result = await getOrderStatusTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'get_sales_metrics',
  {
    description:
      'Return the FITGEAR admin dashboard summary metrics: totalRevenue (PAID/SHIPPED/DELIVERED orders), ordersCount, activeProductsCount, and usersCount. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role.',
    inputSchema: {
      token: z
        .string()
        .optional()
        .describe('Clerk JWT bearer token of the requesting admin (required)'),
    },
  },
  async (args) => {
    const result = await getSalesMetricsTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'get_low_stock_alerts',
  {
    description:
      'Return every FITGEAR product currently at or below its configured low-stock threshold, most-critical (lowest stock) first — for proactive restocking. Read-only. Each entry has id, name, stock, lowStockThreshold, isActive, and category, plus a top-level count. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role.',
    inputSchema: {
      token: z
        .string()
        .optional()
        .describe('Clerk JWT bearer token of the requesting admin (required)'),
    },
  },
  async (args) => {
    const result = await getLowStockAlertsTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'update_stock',
  {
    description:
      "Update a single product's stock (inventory management only — not full product CRUD). Provide exactly one of `stock` (flat number) or `sizes` (per-size breakdown), depending on the product's category. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role.",
    inputSchema: {
      productId: z.string().describe('Mongo ObjectId of the product'),
      token: z.string().describe('Clerk JWT bearer token of the requesting admin (required)'),
      stock: z
        .number()
        .optional()
        .describe('New flat stock count (for products whose category does not require sizes)'),
      sizes: z
        .array(z.object({ label: z.string(), stock: z.number() }))
        .optional()
        .describe('Per-size stock breakdown (for sized categories): [{ label, stock }]'),
    },
  },
  async (args) => {
    const result = await updateStockTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'list_orders',
  {
    description:
      'List ALL orders across every customer (admin order view). Returns a compact array — per order: orderId, createdAt, customer name/email, status, totalAmount, and itemsCount. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role. Optional filters: status and limit.',
    inputSchema: {
      token: z.string().describe('Clerk JWT bearer token of the requesting admin (required)'),
      status: z
        .enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
        .optional()
        .describe('Optional filter by order status'),
      limit: z.number().optional().describe('Max orders to return (1–100, default 50)'),
    },
  },
  async (args) => {
    const result = await listOrdersTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'update_order_status',
  {
    description:
      'Update an order\'s lifecycle status (PENDING -> PAID -> SHIPPED -> DELIVERED, or CANCELLED) as part of logistics automation. Only valid forward transitions are allowed (e.g. never DELIVERED -> PENDING; PAID is set by the payment flow, not manually). Moving to SHIPPED emails the customer and accepts an optional trackingNumber. Every change is written to the order audit history with the acting admin. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role.',
    inputSchema: {
      orderId: z.string().describe('Mongo ObjectId of the order'),
      token: z.string().describe('Clerk JWT bearer token of the requesting admin (required)'),
      status: z
        .enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
        .describe('Target lifecycle status'),
      trackingNumber: z
        .string()
        .optional()
        .describe('Optional tracking number, used only when status is SHIPPED'),
    },
  },
  async (args) => {
    const result = await updateOrderStatusTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'manage_categories',
  {
    description:
      'Full CRUD for product categories (name, description, requiresSizes) via an `action` discriminator: list | create | update | delete. Admin-only — requires a valid Clerk JWT whose user has the ADMIN role (all actions, including list). Service invariants (unique name, in-use delete guard) are enforced and surfaced as readable ok:false results.',
    inputSchema: {
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The category operation to perform'),
      token: z.string().describe('Clerk JWT bearer token of the requesting admin (required)'),
      id: z.string().optional().describe('Category ObjectId (required for update and delete)'),
      name: z
        .string()
        .optional()
        .describe('Category name (required for create; optional for update)'),
      description: z.string().optional().describe('Category description (optional)'),
      requiresSizes: z
        .boolean()
        .optional()
        .describe('Whether products in this category require a size breakdown (optional)'),
    },
  },
  async (args) => {
    const result = await manageCategoriesTool(args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
