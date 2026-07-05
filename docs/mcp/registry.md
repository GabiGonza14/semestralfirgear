# Registro de MCPs — FITGEAR

Explicaciones cortas de cada MCP tool construida para FITGEAR. Al terminar los 7,
este documento sirve como material de referencia para la sustentación y como
base para generar la documentación pública del servidor MCP.

Formato por entrada:
- **Tool**, **HU envuelta**, **Rol**, **Rama**, **PR**, y una explicación breve.

---

## 1. `search_products`

- **HU envuelta:** HU-07 — Catálogo con búsqueda y filtros
- **Rol:** público (soft-auth)
- **Rama:** `mcp/search-products`
- **Issue / PR:** #79 → PR #80 (contra `develop`)

Herramienta MCP **pública** que expone el catálogo de FITGEAR a agentes como
Claude Code. Acepta `search` (texto libre), `categoryId`, `sortBy`, `sortOrder`
y `limit` (1–100, default 20), y devuelve una lista compacta con `id`, `name`,
`price`, `finalPrice`, `stock`, `category` e `imageUrl` de cada producto activo.

**Reuso de código:** llama a `listProducts()` de
`backend/src/services/productService.ts` y usa el modelo Mongoose `Product` — cero
lógica duplicada. El filtro `isActive: true` ya lo aplica el service por defecto.

**Autenticación:** cada llamada pasa por `requireAuth.ts`, que valida el JWT de
Clerk usando `@clerk/backend`. Si no hay token o no está configurado
`CLERK_SECRET_KEY`, devuelve `{ authenticated: false }` sin rechazar
(comportamiento correcto para herramientas públicas). Las tools protegidas usarán
`requireAuthStrict`, que sí lanza si no hay token válido.

**Cómo levantar el servidor MCP local:**

```bash
cd backend
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run mcp:start
```

---

## 2. `get_product_details`

- **HU envuelta:** HU-08 — Detalle de producto
- **Rol:** público (soft-auth)
- **Rama:** `mcp/get-product-details`
- **Issue / PR:** #81 → PR #82 (contra `develop`)

Herramienta MCP **pública** para consulta puntual: obtiene la información completa
de un único producto por su `id`. Acepta un único input requerido `productId`
(ObjectId de Mongo) y un `token` opcional, y devuelve `id`, `name`, `description`,
`price`, `finalPrice`, `discount` (si aplica), `stock`, `isActive`, `category` e
`images` (lista de URLs). Si el producto no existe devuelve un resultado limpio
`{ found: false, productId, message }` en vez de propagar un stack.

**Reuso de código:** llama a `getProductById()` de
`backend/src/services/productService.ts` — el mismo service que consume el
controlador REST `productController.getProduct`, así ambos caminos comparten
lógica. El `HttpError(404)` del service se traduce a un not-found legible.

**Autenticación:** igual que `search_products`, cada llamada pasa por
`requireAuth.ts`, que valida el JWT de Clerk con `@clerk/backend`. Sin token o sin
`CLERK_SECRET_KEY` devuelve `{ authenticated: false }` sin rechazar (tool pública).

**Cómo levantar el servidor MCP local:**

```bash
cd backend
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run mcp:start
```

---

## 3. `get_order_status`

- **HU envuelta:** HU-15 — Historial de órdenes del cliente
- **Rol:** protegida (strict-auth)
- **Rama:** `mcp/get-order-status`
- **Issue / PR:** #83 → PR #84 (contra `develop`)

Herramienta MCP **protegida** que devuelve el historial de órdenes del cliente
autenticado. A diferencia de las dos tools públicas, expone datos personales, así
que exige un JWT de Clerk válido y rechaza llamadas sin él. Su único input es
`token`; nunca acepta un `userId` arbitrario, de modo que un cliente solo puede
ver sus propias órdenes. Devuelve `{ authenticated: true, orders: [...] }` con
`id`, `status`, `totalAmount`, fechas e ítems; si el usuario no tiene perfil
vinculado o no tiene órdenes, retorna `orders: []` sin lanzar.

**Reuso de código:** llama a `listOrdersByUserId()` de
`backend/src/services/orderService.ts` — cero lógica duplicada.

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts`, que lanza si el
JWT falta o es inválido. Como Clerk entrega el `sub` (no el `_id` de Mongo), la
tool resuelve primero `clerkUserId → User._id` vía `UserModel` antes de
consultar las órdenes.

**Cómo levantar el servidor MCP local:**

```bash
cd backend
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run mcp:start
```

---
