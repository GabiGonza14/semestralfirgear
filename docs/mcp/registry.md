# Registro de MCPs — FITGEAR

Explicaciones cortas de cada MCP tool construida para FITGEAR. Al terminar los 7,
este documento sirve como material de referencia para la sustentación y como
base para generar la documentación pública del servidor MCP.

Formato por entrada:
- **Tool**, **HU envuelta**, **Rol**, **Rama**, **PR**, y una explicación breve.

> **Ubicación:** el servidor MCP vive en su propio paquete `mcp-server/` (entrypoint
> stdio en `mcp-server/src/server.ts`, tools en `mcp-server/src/tools/`). Reutiliza
> los services/models/middlewares de `backend/src/` sin duplicarlos. Se levanta con
> `cd mcp-server && bun install && bun run start`.

> **Nota de implementación (fix aplicado durante pruebas end-to-end):**
> `syncClerkUser()` sobreescribía `role` en **cada login** según un email
> hardcodeado, revirtiendo cualquier promoción manual a `ADMIN` hecha directo en
> Mongo. Ahora el rol solo se asigna al **crear** el usuario; en logins
> posteriores se respeta el valor ya guardado en la BD. Afecta a las cuatro tools
> de administrador (`get_sales_metrics`, `update_stock`, `list_orders`,
> `manage_categories`), que dependen de `getUserRoleByClerkId()` para el check de
> rol.

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
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
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
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
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
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

---

## 4. `get_sales_metrics`

- **HU envuelta:** HU-16 — Métricas del dashboard de administrador
- **Rol:** **admin** (strict-auth + rol ADMIN)
- **Rama:** `mcp/get-sales-metrics`
- **Issue / PR:** #85 → PR #86 (contra `develop`)

Herramienta MCP **solo para administradores** que devuelve las cuatro métricas
resumen del dashboard: `totalRevenue` (suma de `totalAmount` de las órdenes en
estado `PAID`, `SHIPPED` o `DELIVERED` — se excluyen `PENDING` y `CANCELLED`),
`ordersCount` (total de órdenes), `activeProductsCount` (productos con
`isActive: true`) y `usersCount` (total de usuarios). Es una tool de resumen: sólo
devuelve esos cuatro números, no las listas completas.

**Reuso de código:** llama a `listOrders()`, `listProducts({ includeInactive: true })`
y `listUsers()` de los services de backend — cero lógica duplicada. Replica el
conjunto `REVENUE_STATUSES` de `src/pages/AdminDashboardPage.tsx`, que hasta ahora
computaba estas métricas en el cliente.

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts` (lanza sin JWT
válido). Como Clerk entrega el `sub`, la tool resuelve `clerkUserId → User` vía
`UserModel` y **rechaza con 403** si `role !== 'ADMIN'`. El único input es `token`.

**Cómo levantar el servidor MCP local:**

```bash
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

---

## 5. `update_stock`

- **HU envuelta:** HU-17 — CRUD de productos (sólo la parte de gestión de inventario)
- **Rol:** **admin** (strict-auth + rol ADMIN)
- **Rama:** `mcp/update-stock`
- **Issue / PR:** #87 → PR #88 (contra `develop`)

Herramienta MCP **solo para administradores** que actualiza el stock de un único
producto. **A propósito NO expone el CRUD completo** (nada de crear/eliminar ni de
editar name/price/images/category/discount): una superficie de escritura tan amplia
es demasiado riesgosa para una tool de agente. Inputs: `productId` (ObjectId,
requerido), `token` (requerido), y **exactamente uno** de `stock` (número flat) o
`sizes` (`{ label, stock }[]`), según si la categoría del producto usa tallas. Si el
`productId` no existe devuelve `{ found: false, productId, message }` sin propagar
un stack.

**Reuso de código:** llama a `updateProduct(id, payload)` de
`backend/src/services/productService.ts`, que ya resuelve la lógica
sizes-vs-flat-stock y valida labels duplicados / sizes vacíos (lanza
`HttpError(400)`). La tool sólo traduce esos errores a respuestas legibles y reenvía
únicamente el campo de stock elegido.

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts` (lanza sin JWT
válido). Como Clerk entrega el `sub`, la tool resuelve `clerkUserId → User` vía
`UserModel` y **rechaza con 403** si `role !== 'ADMIN'`.

**Cómo levantar el servidor MCP local:**

```bash
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

**Nota de implementación (fix aplicado durante pruebas end-to-end):** `updateProduct()`
usaba `product.save()`, que en Mongoose revalida **todo** el documento — si un
producto tenía datos legacy inválidos en un campo no relacionado (p. ej. `images: []`
en un producto sembrado antes de que existiera la validación de 1-4 imágenes),
`update_stock` fallaba con un error de `images` aunque solo se tocara el stock.
Se cambió a `ProductModel.findByIdAndUpdate(id, { $set: updateFields }, { new: true,
runValidators: true, context: 'query' })`, que solo valida los campos incluidos en
el `$set`. Verificado con los 48 tests de `mcp-server` y los tests de `backend`
(sin regresiones) más una prueba manual end-to-end vía la tool real.

---

## 6. `list_orders`

- **HU envuelta:** HU-18 — Vista de órdenes de administrador
- **Rol:** **admin** (strict-auth + rol ADMIN)
- **Rama:** `mcp/list-orders`
- **Issue / PR:** #89 → PR #90 (contra `develop`)

Herramienta MCP **solo para administradores** que lista **todas** las órdenes de
todos los clientes (a diferencia de `get_order_status`, acotada a un solo cliente
autenticado). Inputs: `token` (requerido), `status` (opcional, uno de los estados
del modelo `Order`) y `limit` (opcional, 1–100, default 50). Devuelve un array
compacto — por orden: `orderId`, `createdAt`, `customerName`, `customerEmail`,
`status`, `totalAmount` e `itemsCount` (un conteo, no el detalle anidado de ítems).

**Reuso de código:** llama a `listOrders()` de
`backend/src/services/orderService.ts` **tal cual** — el filtro por `status` y el
`limit` se aplican dentro de la tool sobre el array resultante, sin añadir
parámetros al service ni tocar el controlador REST.

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts` (lanza sin JWT
válido). Como Clerk entrega el `sub`, la tool resuelve `clerkUserId → User` vía
`UserModel` y **rechaza con 403** si `role !== 'ADMIN'`.

**Cómo levantar el servidor MCP local:**

```bash
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

---

## 7. `manage_categories`

- **HU envuelta:** HU-20 — API de categorías
- **Rol:** **admin** (strict-auth + rol ADMIN)
- **Rama:** `mcp/manage-categories`
- **Issue / PR:** #91 → PR #92 (contra `develop`)

Herramienta MCP **solo para administradores** que expone el **CRUD completo** de
categorías en una sola tool, con un discriminador `action`: `list` | `create` |
`update` | `delete`. A diferencia del CRUD de productos (reducido a `update_stock`
por su mayor superficie de riesgo), el modelo `Category` es simple (`name`,
`description`, `requiresSizes`) y sus invariantes ya están protegidas en el service.
El input es una unión discriminada de Zod: `token` siempre requerido; `list` sin más
campos; `create` requiere `name` (opcional `description`, `requiresSizes`); `update`
requiere `id` más al menos un campo; `delete` requiere `id`.

**Reuso de código:** llama a `listCategories()`, `createCategory()`,
`updateCategory()` y `deleteCategory()` de `backend/src/services/categoryService.ts`
**tal cual** — no se reimplementan sus validaciones (nombre único
case-insensitive, guard de borrado en uso). La tool sólo traduce los
`HttpError(404)`/`HttpError(409)` a resultados legibles `{ ok: false, statusCode,
message }`.

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts` (lanza sin JWT
válido). Resuelve `clerkUserId → User` vía `UserModel` y **rechaza con 403** si
`role !== 'ADMIN'` — la comprobación aplica a las cuatro acciones, incluido `list`.

**Cómo levantar el servidor MCP local:**

```bash
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

---

## 9. `get_low_stock_alerts`

- **HU envuelta:** HU-46 — Alertas de stock bajo para el administrador
- **Rol:** **admin** (strict-auth + rol ADMIN)
- **Rama:** `feature/hu46-low-stock-alerts`
- **Issue / PR:** #43 → PR (contra `test-infra`)

Herramienta MCP **solo para administradores**, de **solo lectura**, para detección
proactiva de reabastecimiento: devuelve todos los productos que están **en o por
debajo** de su `lowStockThreshold` (umbral configurable por producto, default 5),
ordenados de menor a mayor stock (los más críticos primero). Su único input es
`token`. Devuelve `{ count, products: [...] }`, donde cada producto trae `id`,
`name`, `stock`, `lowStockThreshold`, `isActive` y `category`.

**Reuso de código:** llama a `getLowStockProducts()` de
`backend/src/services/lowStockService.ts` — **la misma función** que respalda el
endpoint REST `GET /api/admin/low-stock` que alimenta la UI del dashboard, así el
tool y el panel nunca divergen. La lógica de "cuándo emailear al admin" (solo en el
**cruce** descendente del umbral) vive en el mismo módulo (`crossedLowStockThreshold`),
y la disparan `updateProduct` (edición admin / `update_stock`) y `decrementProductStock`
(orden pagada) reutilizando `dispatchNotification` (HU-30/31).

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts` (lanza sin JWT
válido). Como Clerk entrega el `sub`, la tool resuelve `clerkUserId → User` vía
`UserModel` y **rechaza con 403** si `role !== 'ADMIN'`. El único input es `token`.

**Cómo levantar el servidor MCP local:**

```bash
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

---

## 8. `update_order_status`

- **HU envuelta:** HU-42 — Cambio de estado de órdenes desde el admin
- **Rol:** **admin** (strict-auth + rol ADMIN)

Herramienta MCP **solo para administradores** para mover una orden por su ciclo de
vida (`PENDING → PAID → SHIPPED → DELIVERED`, o `CANCELLED`) como parte de un flujo
de automatización logística. Inputs: `orderId` (requerido), `token` (requerido),
`status` (uno de los 5 estados del ciclo) y `trackingNumber` (opcional, solo se usa
al pasar a `SHIPPED`). Devuelve `{ ok: true, orderId, status }` o, para errores de
transición inválida / orden inexistente, `{ ok: false, orderId, message }`.

**Reuso de código:** llama a `updateOrderStatus()` de
`backend/src/services/orderService.ts` **tal cual** — el mismo punto de entrada que
usa el endpoint REST del panel. La máquina de estados
(`backend/src/utils/orderStatus.ts`) sólo permite transiciones válidas hacia
adelante (`PAID` nunca es un destino manual: el pago viene de Stripe). Cada cambio
se audita en `OrderEvent` con el admin que lo hizo, y pasar a `SHIPPED` dispara el
email de notificación al cliente (HU-31).

**Autenticación:** usa `requireAuthStrict` de `requireAuth.ts` (lanza sin JWT
válido). Resuelve `clerkUserId → User` vía `UserModel` y **rechaza con 403** si
`role !== 'ADMIN'`.

**Cómo levantar el servidor MCP local:**

```bash
cd mcp-server
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear bun run start
```

---
