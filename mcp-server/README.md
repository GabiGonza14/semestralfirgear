# FITGEAR MCP Server

Servidor **MCP (Model Context Protocol)** de FITGEAR — un paquete independiente que
expone la lógica de negocio del backend como herramientas para agentes (Claude Code,
Codex, etc.) sobre transporte **stdio**.

Es un proceso aparte del API REST (`backend/`), pero **reutiliza** sus
services/models/middlewares en vez de duplicarlos.

## Estructura

```
mcp-server/
├── package.json          # @modelcontextprotocol/sdk, zod
├── tsconfig.json
└── src/
    ├── server.ts         # entrypoint stdio, registra las 7 tools
    ├── tools/            # una tool por archivo
    └── __tests__/        # tests deterministas (bun:test)
```

Las tools importan desde `../../../backend/src/...` (services, models, middlewares,
utils). La conexión a Mongo y la validación de Clerk JWT (`requireAuth.ts`) son las
mismas del backend.

## Herramientas

| Tool | HU | Rol |
|------|----|----|
| `search_products` | HU-07 | público |
| `get_product_details` | HU-08 | público |
| `get_order_status` | HU-15 | cliente (JWT) |
| `get_sales_metrics` | HU-16 | admin |
| `update_stock` | HU-17 | admin |
| `list_orders` | HU-18 | admin |
| `manage_categories` | HU-20 | admin |

Detalle de cada una en [`../docs/mcp/registry.md`](../docs/mcp/registry.md).

## Correr localmente

```bash
cd mcp-server
bun install
MONGODB_URI="mongodb://127.0.0.1:27017/fitgear" CLERK_SECRET_KEY="sk_test_..." bun run start
```

## Tests

```bash
cd mcp-server
bun test
```

## Uso desde Claude Code

En `~/.claude.json` (o el `settings.json` de Claude Code):

```json
{
  "mcpServers": {
    "fitgear": {
      "command": "bun",
      "args": ["run", "start"],
      "cwd": "/ruta/a/SemestralFitGEAR/mcp-server",
      "env": {
        "MONGODB_URI": "mongodb://127.0.0.1:27017/fitgear",
        "CLERK_SECRET_KEY": "sk_test_..."
      }
    }
  }
}
```
