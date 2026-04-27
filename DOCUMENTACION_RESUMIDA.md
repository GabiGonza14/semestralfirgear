# Documentacion resumida del proyecto FITGEAR

## Resumen general
FITGEAR es una tienda de articulos fitness construida con React, Vite, TypeScript, Clerk, TanStack Query, Framer Motion, Express, MongoDB y Stripe. El proyecto separa frontend y backend para manejar catalogo, autenticacion, carrito, pedidos, administracion y pagos.

## Que se implemento y para que sirve cada parte

### Frontend principal
- `src/main.tsx`: arranque de la app. Monta React, Clerk y el `QueryClient` global.
- `src/App.tsx`: envuelve la aplicacion con `AuthProvider`, `CartProvider` y el router.
- `src/routes/AppRouter.tsx`: define todas las rutas publicas, protegidas, de cliente y de admin.
- `src/layouts/SiteLayout.tsx`: estructura comun de pagina con navbar, contenido y footer.

### Paginas
- `src/pages/LandingPage.tsx`: pagina de inicio con hero, categorias y accesos rapidos al shop.
- `src/pages/ShopPage.tsx`: catalogo principal con busqueda, filtros, ordenamiento y fallback local si la API falla.
- `src/pages/ProductDetailPage.tsx`: detalle del producto y productos relacionados.
- `src/pages/CartPage.tsx`: carrito, ajuste de cantidades y creacion de la orden para checkout.
- `src/pages/CheckoutSuccessPage.tsx`: confirmacion final del pago y limpieza del carrito.
- `src/pages/CheckoutCancelPage.tsx`: manejo de pago cancelado y reintento si la orden sigue pendiente.
- `src/pages/AccountPage.tsx`: perfil de usuario con Clerk.
- `src/pages/OrdersPage.tsx`: historial de pedidos del cliente.
- `src/pages/AdminDashboardPage.tsx`: panel administrativo general.

### Componentes de interfaz
- `src/components/Navbar.tsx`: barra superior con logo, acceso atras, carrito y usuario.
- `src/components/Footer.tsx`: pie de pagina con branding.
- `src/components/HeroCarousel.tsx`: banner principal con rotacion automatica.
- `src/components/CategoryCards.tsx`: tarjetas de categorias destacadas.
- `src/components/SearchBar.tsx`: campo de busqueda del shop.
- `src/components/CategoryFilter.tsx`: filtros por categoria.
- `src/components/ProductCard.tsx`: tarjeta de producto para listado.
- `src/components/CartItem.tsx`: item individual del carrito.
- `src/components/CTAButton.tsx`: boton reutilizable para enlaces de accion.
- `src/components/SectionTitle.tsx`: titulo estandarizado para secciones.
- `src/components/EmbeddedAuth.tsx`: integracion embebida de autenticacion.

### Componentes de carrito y pedidos
- `src/components/cart/OrderSummary.tsx`: resumen del pedido con subtotal, impuestos, envio y total.
- `src/components/orders/OrderCard.tsx`: tarjeta de pedido en historial.
- `src/components/orders/OrderItemRow.tsx`: fila de producto dentro del pedido.

### Sistema compartido
- `src/components/ui/Button.tsx`: sistema de botones reutilizable para consistencia visual.
- `src/lib/queryClient.ts`: configuracion central de TanStack Query.
- `src/lib/queryKeys.ts`: claves de cache para invalidacion y lectura consistente.
- `src/lib/format.ts`: utilidades de formato, por ejemplo moneda.

### Hooks y datos
- `src/hooks/useOrdersQueries.ts`: consultas reutilizables para pedidos.
- `src/hooks/usePaymentQueries.ts`: consulta de confirmacion de pago de Stripe.
- `src/data/products.ts`: catalogo local de respaldo.
- `src/data/categories.ts`: categorias locales de respaldo.

### API del frontend
- `src/api/fitgearApi.ts`: capa unica para consumir el backend. Centraliza productos, categorias, pedidos, usuarios y pagos.
- `src/api/apiClient.ts`: cliente HTTP base y manejo de errores.

### Backend
- `backend/src/app.ts`: configura Express, CORS, JSON, archivos estaticos, rutas y manejo de errores.
- `backend/src/routes/index.ts`: agrupa las rutas de la API.
- `backend/src/routes/productRoutes.ts`: CRUD y consulta de productos.
- `backend/src/routes/categoryRoutes.ts`: gestion de categorias.
- `backend/src/routes/orderRoutes.ts`: gestion de pedidos.
- `backend/src/routes/userRoutes.ts`: sincronizacion y administracion de usuarios.
- `backend/src/routes/paymentRoutes.ts`: checkout y confirmacion de pagos.
- `backend/src/controllers/paymentController.ts`: logica del webhook de Stripe.
- `backend/src/services/paymentService.ts`: operaciones de pago y confirmacion.
- `backend/src/services/orderService.ts`: logica de pedidos y estados.
- `backend/src/models/StripeWebhookEvent.ts`: control de eventos procesados para evitar duplicados.

## Flujo de uso
1. El usuario entra a la landing y navega al shop.
2. Filtra o busca productos y abre un detalle.
3. Agrega productos al carrito.
4. Crea la orden y va al checkout de Stripe.
5. Stripe confirma o cancela el pago.
6. La app sincroniza el estado, limpia el carrito y muestra el resultado.

## Mejoras relevantes ya incluidas
- Fallback local del catalogo si la API falla.
- Estilos unificados con botones y jerarquia visual comun.
- Carousel con autoplay estable.
- Ajuste del header para evitar movimiento del logo.
- Confirmacion de pago con cache controlada por TanStack Query.

## Estado actual
La app ya esta funcional para navegar, comprar, pagar, confirmar pedidos y administrar catalogo y usuarios.