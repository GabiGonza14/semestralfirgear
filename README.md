# FITGEAR

FITGEAR es una tienda de articulos fitness con frontend en React y TanStack Start (SSR sobre Vite), backend en Hono sobre Bun, persistencia en MongoDB, autenticacion con Clerk y flujo de checkout con Stripe. El proyecto separa claramente la capa de presentacion, el consumo de API y la logica del backend para catalogo, carrito, pedidos, usuarios, pagos y administracion.

## Descripcion del proyecto

La aplicacion permite navegar un catalogo real de productos, filtrar por categorias, ver detalle de producto, gestionar el carrito, crear pedidos y completar pagos por Stripe. El frontend consume la API del backend en tiempo real y la informacion principal vive en MongoDB. Cuando el backend responde correctamente, el catalogo se alimenta de datos reales; el fallback local solo existe como respaldo ante errores criticos.

## Credenciales de prueba (revision del profesor)

Cuenta de prueba con rol admin para revisar el panel de administracion y el flujo completo de la tienda.

| Campo | Valor |
|---|---|
| Email | fabiherna14@gmail.com |
| Password | GabiEric14 |

> Esta seccion vive solo en la rama `docs/credenciales-profesor` (no se sube al remoto por defecto): contiene credenciales reales y ambos repos son publicos.

## Tecnologias usadas

- React 19
- Vite
- TypeScript
- TanStack Start (SSR) + TanStack Router
- TanStack React Query
- Clerk
- Framer Motion
- Tailwind CSS
- Hono (framework del backend)
- Bun (runtime del backend)
- MongoDB con Mongoose
- Stripe
- Zod
- Docker / Docker Compose

## Requisitos previos

- Node.js 20 o superior
- npm
- Bun instalado para ejecutar el backend en modo desarrollo
- MongoDB local o remota accesible por red
- Cuenta y claves de Clerk para autenticacion
- Cuenta y claves de Stripe para checkout

## Instalacion

1. Instala dependencias del frontend en la raiz del proyecto:

```bash
npm install
```

2. Instala dependencias del backend si vas a modificar o ejecutar esa capa desde su carpeta:

```bash
cd backend
npm install
```

3. Asegurate de tener configuradas las variables de entorno indicadas abajo.

## Variables de entorno

### Frontend

Crear un archivo `.env` en la raiz del proyecto con:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key
VITE_API_BASE_URL=http://localhost:4000/api
```

### Backend

Crear un archivo `backend/.env` con:

```bash
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/fitgear
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:4000
```

> **Importante — `FRONTEND_URL` debe ser `http://localhost:3000`.** Tras la migracion a TanStack Start el frontend corre en el puerto **3000** (antes era `5173` con el SPA de Vite). El backend usa `FRONTEND_URL` para su politica de CORS: si esta linea quedo en `5173`, el navegador bloquea **todas** las llamadas del frontend por CORS y veras el catalogo vacio ("No hay productos") y la vista de cliente aunque tu cuenta sea ADMIN (la sincronizacion de rol tambien se bloquea). Si ya tenias un `backend/.env` viejo, actualiza esta linea a `3000`. El backend NO recarga el `.env` en caliente: reinicialo tras el cambio.

## Como ejecutar frontend y backend

### Frontend

Desde la raiz del proyecto:

```bash
npm run dev
```

El frontend queda disponible en:

```bash
http://localhost:3000/
```

### Backend

Desde la carpeta `backend`:

```bash
cd backend
bun --watch src/server.ts
```

El backend queda disponible en:

```bash
http://localhost:4000/
```

## Ejecutar con Docker Compose

El repositorio incluye un `docker-compose.yml` que levanta **MongoDB** y el **backend** juntos. Requiere Docker instalado y un archivo `.env` en la raiz con al menos `MONGODB_URI`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` (docker-compose los inyecta al contenedor del backend).

```bash
docker compose up --build
```

El backend queda en `http://localhost:4000` y MongoDB en el puerto `27017`. El frontend se ejecuta aparte con `npm run dev`.

> **Ojo — Docker usa una MongoDB local, no la de Atlas.** `docker-compose.yml` sobrescribe `MONGODB_URI` para apuntar al contenedor de MongoDB local (vacio al inicio), asi que al levantar con Docker **no** veras el catalogo ni los usuarios de la base compartida de Atlas. Para trabajar contra Atlas (datos reales, tu cuenta ADMIN), corre el backend fuera de Docker con `cd backend && bun --watch src/server.ts`, que si lee `backend/.env` y su `MONGODB_URI` de Atlas.

## Estructura del proyecto

```text
.
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validations/
│   └── package.json
├── app/                  # TanStack Start: routes (app/routes/**), guards (app/lib/**)
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   └── utils/
├── public/
├── package.json
├── vite.config.ts
└── README.md
```

## Funcionalidades principales

- Catalogo de productos con busqueda, filtros, ordenamiento y autocompletado.
- Fallback local de respaldo solo ante errores criticos.
- Detalle de producto con informacion y relacionados.
- Reseñas de productos por compradores verificados, con moderacion de administrador.
- Carrito con ajuste de cantidades, subtotal, impuestos y envio.
- Creacion de pedidos reales en backend.
- Checkout con Stripe, confirmacion de pago, envios y reembolsos.
- Confirmacion de pago y actualizacion de estado del pedido.
- Login y autenticacion con Clerk.
- Panel de administracion para catalogo, usuarios y pedidos.
- Alertas de stock bajo y notificaciones por email (SendGrid).
- Historial de auditoria de acciones de administrador (solo lectura).
- Reporte de inventario exportable en CSV y PDF.
- Servidor MCP (Model Context Protocol) que expone la logica de negocio como herramientas para agentes.

## Integraciones

### Stripe

Se usa para crear sesiones de checkout, confirmar pagos y procesar eventos de webhook. El backend expone endpoints para crear y confirmar el pago, y maneja eventos de Stripe para marcar pedidos como pagados.

### Clerk

Gestiona autenticacion y sincronizacion de usuarios hacia el backend.

### MongoDB y Mongoose

Persisten productos, categorias, usuarios, pedidos y eventos de webhook.

### API del backend

El frontend consume la API mediante `src/api/apiClient.ts` y `src/api/fitgearApi.ts`, con base URL configurable por `VITE_API_BASE_URL`.

### Servidor MCP

El paquete `mcp-server/` expone la logica de negocio del backend como herramientas para agentes (Claude Code, Codex, etc.) sobre transporte stdio, reutilizando los services/models/middlewares de `backend/src/`. Cubre catalogo, ordenes, metricas, inventario, categorias, reseñas y auditoria. Detalle de cada tool en [`docs/mcp/registry.md`](docs/mcp/registry.md) y guia de uso en [`mcp-server/README.md`](mcp-server/README.md).

## Scripts disponibles

### Raiz del proyecto

```bash
npm run dev         # servidor de desarrollo (SSR) en http://localhost:3000
npm run build       # typecheck + build de produccion (dist/client + dist/server)
npm run start       # levanta el build de produccion (node, no requiere el CLI de dev)
npm run typecheck
npm run lint
```

`npm start` corre `vite preview`, que en la version instalada de `@tanstack/react-start`
(sin Nitro) es el mecanismo soportado para servir el build de `dist/` como un
proceso Node real — sirve `dist/client` como estatico y usa `dist/server/server.js`
para el SSR de cada ruta.

### Backend

```bash
cd backend
bun --watch src/server.ts
bun src/server.ts
```

## Solucion de problemas comunes

### El frontend no carga el catalogo

- Verifica que el backend este corriendo en `http://localhost:4000`.
- Revisa que `VITE_API_BASE_URL` apunte a `http://localhost:4000/api`.
- Confirma que MongoDB este activo y que `MONGODB_URI` sea valido.

### El backend no inicia

- Verifica que Bun este instalado.
- Revisa `backend/.env`.
- Confirma que el puerto `4000` no este ocupado.

### MongoDB no conecta

- Asegurate de que el servicio MongoDB este levantado.
- Revisa que la URI corresponda a tu entorno.
- Si usas Docker o remoto, actualiza `MONGODB_URI`.

### Stripe no crea checkout

- Revisa que `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` esten configuradas.
- Confirma que el backend tenga acceso a Internet y credenciales validas.

### Clerk no autentica

- Revisa `VITE_CLERK_PUBLISHABLE_KEY` en el frontend.
- Confirma que la instancia de Clerk permita `http://localhost:3000`.

## Estado actual del proyecto

- Frontend compilando correctamente.
- Backend operativo en modo desarrollo.
- MongoDB conectado localmente.
- API devuelve datos reales para categorias y productos.
- Checkout con Stripe activo.
- El catalogo ya no muestra el mensaje de conexion inestable en condiciones normales.

## Proximos pasos opcionales

- Publicar el backend en un entorno estable de desarrollo o staging.
- Agregar tests automatizados para catalogo, carrito y checkout.
- Reducir el tamaño del bundle principal mediante code splitting.
- Documentar el despliegue en produccion.
- Añadir un seed controlado para entornos limpios de desarrollo.
