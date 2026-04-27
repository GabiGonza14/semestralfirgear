# PRD - FITGEAR

## 1. Resumen del producto
FITGEAR es una tienda web de articulos deportivos enfocada en venta de accesorios y equipos de entrenamiento. El objetivo es ofrecer una experiencia de compra clara, rapida y confiable, con catalogo navegable, autenticacion de usuario, carrito, checkout real con Stripe y panel administrativo.

## 2. Problema que resuelve
El usuario necesita encontrar productos deportivos de forma rapida, agregarlos al carrito, pagar de manera segura y revisar sus compras. El equipo necesita una base de administracion para productos, categorias, pedidos y usuarios.

## 3. Objetivos
- Permitir exploracion de catalogo por categoria, busqueda y ordenamiento.
- Facilitar autenticacion y gestion de perfil con Clerk.
- Permitir compra real con checkout y confirmacion de pago con Stripe.
- Ofrecer historial de pedidos y experiencia consistente en todo el sitio.
- Dar herramientas administrativas para operar el catalogo y los pedidos.

## 4. Alcance funcional
### Frontend
- Landing page con hero, categorias destacadas y llamados a la accion.
- Shop con filtros, busqueda, ordenamiento y fallback local si falla la API.
- Vista de producto con informacion detallada y productos relacionados.
- Carrito con control de cantidades y resumen de compra.
- Flujo de checkout con paginas de exito y cancelacion.
- Cuenta de usuario y historial de pedidos.
- Panel admin para operacion interna.

### Backend
- API para categorias, productos, usuarios, pedidos y pagos.
- Integracion con MongoDB para persistencia.
- Integracion con Stripe para sesiones de pago y webhook.
- Control de acceso y validacion de errores.

## 5. Usuarios objetivo
- Cliente final: compra productos y revisa sus pedidos.
- Usuario autenticado: accede a cuenta, checkout y ordenes.
- Administrador: gestiona inventario, categorias, pedidos y usuarios.

## 6. Historias de usuario
- Como visitante, quiero explorar el catalogo para encontrar productos.
- Como cliente, quiero agregar productos al carrito y pagar de forma segura.
- Como usuario autenticado, quiero ver mi historial de pedidos.
- Como administrador, quiero administrar el catalogo y monitorear pedidos.
- Como usuario, quiero que la tienda siga funcionando aunque la API falle temporalmente.

## 7. Requerimientos funcionales
- Autenticacion con Clerk.
- Navegacion protegida para vistas de cliente y administrador.
- Consulta de catalogo desde API con respaldo local.
- Creacion de orden antes del checkout.
- Confirmacion de pago y sincronizacion de estado.
- Invalidez de cache al completar compra o modificar datos.

## 8. Requerimientos no funcionales
- Interfaz responsive para escritorio y movil.
- UI consistente con jerarquia visual clara.
- Manejo de errores amigable.
- Codigo mantenible con componentes reutilizables.
- Rendimiento aceptable en build y navegacion.

## 9. Criterios de exito
- El usuario puede completar un flujo completo: ver producto, agregar al carrito, pagar y confirmar la compra.
- El shop sigue mostrando productos aunque falle la API principal.
- El administrador puede acceder a su panel sin romper la experiencia del cliente.
- La aplicacion compila y despliega sin errores de build.

## 10. Fuera de alcance
- Recomendaciones personalizadas con IA.
- Sistema de cupones y promociones avanzado.
- Multi-idioma.
- Analitica avanzada de negocio.

## 11. Dependencias
- React, Vite y TypeScript en frontend.
- Clerk para autenticacion.
- TanStack Query para cache y sincronizacion.
- Framer Motion para microinteracciones.
- Express, MongoDB y Stripe en backend.

## 12. Riesgos
- Fallos temporales de API o red.
- Datos vacios o inconsistentes en catalogo.
- Desfase entre estado de Stripe y estado interno de la orden.
- Dependencia de variables de entorno para Clerk y backend.

## 13. Estado actual
El producto ya cuenta con catalogo, carrito, checkout, autenticacion, panel admin, fallback de catalogo local y validacion del pago con Stripe.