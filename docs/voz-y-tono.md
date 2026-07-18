# FITGEAR — Voz, tono y microcopy

> **Parte 2 de 8 del rediseño** (issue #164). Junto con [`design.md`](./design.md)
> (Parte 1), este documento es la referencia que consultan las Partes 3–7: define
> **cómo suena** FITGEAR. Marco de referencia: *Voice Graph* de Torrey
> Podmajersky y el *Microcopy Canvas* — aquí aplicados a este proyecto, no
> reproducidos en abstracto.

**Voz** = la personalidad de marca; es estable, no cambia. **Tono** = cómo se
adapta esa voz al contexto (un error no suena igual que una felicitación). Todo
el copy de la app debería poder responder "sí" a: *¿suena a FITGEAR?* y *¿el
tono encaja con el momento del cliente?*

---

## 1. Atributos de voz

Cuatro rasgos. Para cada uno, qué **sí** es y qué **no** es (estilo Voice Graph).

| Atributo | Es | No es |
|----------|----|-------|
| **Directo** | Frases cortas, verbo al frente, cero relleno. "Todo tu equipo, en un solo lugar." | Instrucciones de manual: "Filtra por categoría, busca productos y ordena para encontrar el accesorio ideal." |
| **Motivador (sin gritar)** | Energía atlética con propósito. "Supera tu límite." | Hype vacío, mayúsculas sostenidas, signos de exclamación de más. |
| **Cercano — de tú** | Tutea siempre. "Inicia sesión para continuar con tu entrenamiento." | Usted, ni voseo ("se adapta a **vos**" → "a **ti**"). Mezclar registros. |
| **Honesto y tranquilizador** | Asume la responsabilidad y anticipa dudas. "Tuvimos un problema **de nuestro lado** y ya lo registramos." | Culpar al usuario o al sistema; jerga: "error en el backend", "en esta fase". |

**Regla de oro:** si un cliente no reconocería la palabra (fase, backend,
endpoint, flujo logístico, inventario, PENDING), no va en la UI.

---

## 2. El tono cambia con el contexto

La voz es la misma; el tono se ajusta al estado emocional del cliente.

| Contexto | Estado del cliente | Tono | Ejemplo (real, de esta app) |
|----------|-------------------|------|------------------------------|
| **Neutral / navegación** | Explorando | Claro y con empuje | "Catálogo FITGEAR — Todo tu equipo de entrenamiento, en un solo lugar." |
| **Éxito** | Satisfecho | Cálido, breve, próximo paso | "Gracias por tu compra. Ya estamos preparando tu pedido para el envío." |
| **Error / vacío** | Frustrado o dudando | Calmado, sin culpa, con salida | "No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría, o limpia los filtros para ver todo." |
| **Cerca de la compra** | Evaluando riesgo | Tranquilizador, concreto | "Compra protegida con Stripe · Envío rápido a todo el país · Devoluciones fáciles" |

### Fórmula para estados vacíos y de error

**Explica qué pasó + ofrece el siguiente paso.** Nunca solo "no hay nada".

- ❌ "Sin resultados."
- ✅ "No encontramos productos con esos filtros. Prueba con otra búsqueda o categoría, o limpia los filtros para ver todo."
- ✅ "Cuando completes una compra, tus pedidos aparecerán aquí. Mientras tanto, explora el catálogo y arma tu equipo."

### Microcopy de confianza (cerca de comprar)

Anticipa la duda **antes** de que frene la decisión. Usa el copy de confianza
que ya existe (no inventes badges nuevos): "Compra protegida con Stripe",
"Envío rápido a todo el país", "Devoluciones fáciles". Mantenlo corto y
verificable — nunca prometas lo que el producto no cumple.

---

## 3. Glosario de términos fijos

Un término por concepto. Elegidos por lo que dice un cliente hispanohablante en
una tienda, y por lo que ya predomina en el código.

| Concepto | ✅ Usar | ❌ Evitar | Nota |
|----------|--------|----------|------|
| Cesta de compra | **carrito** | bolsa, cesta | Ya es consistente en la app. |
| Compra registrada | **pedido** | orden, compra (como sustantivo de estado) | Cliente dice "mis pedidos". *Excepción:* el **panel de administración** usa "órdenes" como término operativo interno — no es cara-cliente. |
| Comentario de producto | **reseña** | opinión, valoración | Ya es consistente. |
| Catálogo | **catálogo** | tienda (para el listado) | "Tienda" = la sección; "catálogo" = el listado de productos. |
| Registro / entrar | **iniciar sesión** | loguearse, acceder | — |
| Tratamiento | **tú** | usted, vos | Tutea siempre; nada de voseo. |
| Ítems del resumen | **artículos** | items | Evita el anglicismo. |

Al tocar copy en las Partes 3–7, respeta este glosario. No hace falta cazar
cada uso histórico en un solo PR, pero de aquí en adelante se escribe así.

---

## 4. Ortografía y acentos

La misma palabra escrita de dos formas se lee como descuido, aunque el diseño
esté pulido. **Siempre con tilde:** página, catálogo, envío, categoría,
información, sesión, también, rápido, fácil, artículo, número, máximo, aquí, aún,
está/están (verbo), versión, límite. Ojo con los pares mínimos: *esta/está*,
*tu/tú*, *que/qué*, *mas/más* — la tilde cambia el significado.

Nota: **solo** y los demostrativos (este, esta, esos) van **sin** tilde según la
ortografía vigente de la RAE.

---

## 5. Antes / Después (cambios reales de esta parte)

| Dónde | Antes | Después |
|-------|-------|---------|
| 404 (`NotFoundPage`) | "Ruta no encontrada / La pagina que buscas no existe **en esta fase** de FITGEAR." | "Página no encontrada / No encontramos la página que buscas. Puede que el enlace haya cambiado o que ya no esté disponible." |
| Subtítulo Shop | "Filtra por categoria, busca productos y ordena para encontrar el accesorio ideal." | "Todo tu equipo de entrenamiento, en un solo lugar." |
| Error genérico (`ErrorBoundary`) | "Ocurrió un error inesperado y ya lo registramos. Puedes recargar la página para continuar." | "Tuvimos un problema de nuestro lado y ya lo registramos. Recarga la página para seguir donde estabas." |
| Checkout OK | "Stripe confirmo el pago y la orden ya puede pasar al **flujo logistico**." | "Confirmamos tu pago. Ya estamos preparando tu pedido para el envío." |
| Checkout pendiente | "Estamos sincronizando el estado de pago con el **backend** para dejar la orden al dia." | "Estamos confirmando tu pago. En un momento verás tu pedido actualizado." |
| Sin pedidos | "Cuando completes una compra, tus pedidos apareceran aqui." | "Cuando completes una compra, tus pedidos aparecerán aquí. Mientras tanto, explora el catálogo y arma tu equipo." |
| Hero (voseo) | "Resistencia que se adapta a **vos**." | "Resistencia que se adapta a **ti**." |

Estos ejemplos son el patrón a replicar en las Partes 3–7.
