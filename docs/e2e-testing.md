# Pruebas E2E (Playwright)

Suite de pruebas end-to-end deterministas que interactúan con la aplicación real vía navegador. Cumple el Punto 6 del cierre del semestral: "Pruebas deterministicas con Playwright que interactuen con la pagina, cubriendo TODAS las funcionalidades."

La suite tiene dos capas con requisitos muy distintos:

## `e2e/public/` — sin credenciales

34 tests que cubren landing, catálogo (búsqueda/filtros/orden/autocompletado), detalle de producto, carrito, reseñas (visitante anónimo), páginas de checkout (éxito/cancelación), 404 y rutas protegidas (redirección a `/login`). Todos mockean las respuestas del backend vía `page.route()`, así que no necesitan MongoDB, Clerk ni Stripe reales — solo el build de producción del frontend.

```bash
npm run build && npm run test:e2e -- e2e/public
```

o simplemente `npm run test:e2e` (corre las dos capas; la autenticada se salta sola si faltan las variables de abajo).

## `e2e/authenticated/` — necesita una sesión real de Clerk

`customer-flow.spec.ts` y `admin-panel.spec.ts` verifican flujos que requieren un usuario real (creación de un pedido real vía Stripe, contenido del panel admin) — no hay forma honesta de simular "esta cuenta es admin" sin la resolución de rol real del backend (`backend/src/services/userService.ts`).

Variables de entorno requeridas (en `.env` de la raíz o exportadas antes de correr):

| Variable | Qué es | Notas |
|---|---|---|
| `CLERK_PUBLISHABLE_KEY` / `VITE_CLERK_PUBLISHABLE_KEY` | Publishable key de Clerk | Ya usada por el frontend |
| `CLERK_SECRET_KEY` | Secret key de Clerk | Ya usada por el backend |
| `E2E_CUSTOMER_EMAIL` | Email de **cualquier** usuario de Clerk existente | Se usa para los specs de cliente. El usuario se crea a mano en el Clerk Dashboard (Users → Create user) — Claude/CI nunca crean cuentas ni manejan contraseñas |
| `E2E_ADMIN_EMAIL` | Email exacto que `resolveRole()` en `backend/src/services/userService.ts` hardcodea como `ADMIN` | Debe coincidir carácter por carácter con ese valor |

El sign-in usa la estrategia de "ticket" de `@clerk/testing` (`clerk.signIn({ page, emailAddress })`): entra vía la Backend API de Clerk sin contraseña ni UI, así que **solo hace falta el email**, no un password.

Además del login necesitas:

- El backend (`cd backend && bun run dev`) y MongoDB corriendo y alcanzables.
- Al menos un producto activo sin tallas obligatorias en el catálogo (si no hay ninguno, el test de creación de pedido se salta con un mensaje explícito en vez de fallar — no existe aún un seed script, ver README "Próximos pasos opcionales").

Si falta cualquiera de las dos variables (`E2E_CUSTOMER_EMAIL` / `E2E_ADMIN_EMAIL`), el spec o `describe` block correspondiente se **salta** (`test.skip`), nunca falla — así la suite se mantiene verde sin secretos y el CI puede sumarlos más adelante sin romper nada.

```bash
E2E_CUSTOMER_EMAIL="cliente@ejemplo.com" \
E2E_ADMIN_EMAIL="admin@ejemplo.com" \
npm run build && npm run test:e2e
```

## Notas de diseño

- La suite corre contra `npm run build && npm run start` (build de producción), no contra `vite dev` — el dev server de Vite es intermitente bajo navegaciones frescas de Playwright y rompe el determinismo que pide el requisito.
- `fullyParallel: false` / `workers: 1`: bajo el server de SSR con varios workers en paralelo la hidratación se atrasa bajo contención de CPU y los clicks aterrizan en DOM aún no hidratado — flakiness clásica. Serial es más lento pero elimina esa contención.
- Reportes: `npm run test:e2e:report` (HTML) tras una corrida con `reporter` habilitado; en CI (`process.env.CI`) además reintenta una vez por test.
