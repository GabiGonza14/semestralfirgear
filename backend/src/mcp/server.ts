// stdio MCP transport uses stdout exclusively for JSON-RPC messages.
// Redirect all console output to stderr to avoid corrupting the protocol.
console.log = console.error
console.info = console.error
console.warn = console.error
console.debug = console.error

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { connectDatabase } from '../config/db'
import { categoryToolDefs } from './tools/categoryTools'
import { orderToolDefs } from './tools/orderTools'
import { productToolDefs } from './tools/productTools'
import { userToolDefs } from './tools/userTools'

const server = new McpServer({
  name: 'fitgear-mcp',
  version: '1.0.0',
})

const allTools = [
  ...productToolDefs,
  ...categoryToolDefs,
  ...orderToolDefs,
  ...userToolDefs,
]

for (const tool of allTools) {
  server.tool(tool.name, tool.description, tool.schema, tool.handler as Parameters<typeof server.tool>[3])
}

async function main() {
  await connectDatabase()

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('MCP server failed to start:', err)
  process.exit(1)
})
