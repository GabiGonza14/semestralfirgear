# FITGEAR

FITGEAR es una tienda de articulos fitness con frontend en React y Vite, backend en Express, persistencia en MongoDB, autenticacion con Clerk y flujo de checkout con Stripe. El proyecto separa claramente la capa de presentacion, el consumo de API y la logica del backend para catalogo, carrito, pedidos, usuarios, pagos y administracion.

## Descripcion del proyecto

La aplicacion permite navegar un catalogo real de productos, filtrar por categorias, ver detalle de producto, gestionar el carrito, crear pedidos y completar pagos por Stripe. El frontend consume la API del backend en tiempo real y la informacion principal vive en MongoDB. Cuando el backend responde correctamente, el catalogo se alimenta de datos reales; el fallback local solo existe como respaldo ante errores criticos.

## Tecnologias usadas

- React 19
- Vite
- TypeScript
- React Router
- TanStack React Query
- Clerk
- Framer Motion
- Tailwind CSS
- Express
- MongoDB con Mongoose
- Stripe
- Zod

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
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:4000
```

## Como ejecutar frontend y backend

### Frontend

Desde la raiz del proyecto:

```bash
npm run dev
```

El frontend queda disponible en:

```bash
http://localhost:5173/
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
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── hooks/
│   ├── layouts/
│   ├── pages/
│   ├── routes/
│   └── utils/
├── public/
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## Funcionalidades principales

- Catalogo de productos con busqueda, filtros y ordenamiento.
- Fallback local de respaldo solo ante errores criticos.
- Detalle de producto con informacion y relacionados.
- Carrito con ajuste de cantidades, subtotal, impuestos y envio.
- Creacion de pedidos reales en backend.
- Checkout con Stripe.
- Confirmacion de pago y actualizacion de estado del pedido.
- Login y autenticacion con Clerk.
- Panel de administracion para catalogo, usuarios y pedidos.

## Integraciones

### Stripe

Se usa para crear sesiones de checkout, confirmar pagos y procesar eventos de webhook. El backend expone endpoints para crear y confirmar el pago, y maneja eventos de Stripe para marcar pedidos como pagados.

### Clerk

Gestiona autenticacion y sincronizacion de usuarios hacia el backend.

### MongoDB y Mongoose

Persisten productos, categorias, usuarios, pedidos y eventos de webhook.

### API del backend

El frontend consume la API mediante `src/api/apiClient.ts` y `src/api/fitgearApi.ts`, con base URL configurable por `VITE_API_BASE_URL`.

## Scripts disponibles

### Raiz del proyecto

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

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
- Confirma que la instancia de Clerk permita `http://localhost:5173`.

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
