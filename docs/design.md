# FITGEAR — Sistema de diseño (norte)

> **Parte 1 de 8 del rediseño** (issue #163). Este documento es la referencia
> única que consultan las Partes 3–8. Los valores viven como tokens CSS en
> [`src/index.css`](../src/index.css); aquí se explican y se dice **cuándo**
> usar cada uno.

Tailwind v4 es _CSS-first_: los tokens **son** variables CSS. Los declarados en
`@theme` además generan utilidades (`text-*`, `ease-*`, `rounded-*`, …).

## Capas de tokens

Tres capas, de lo más concreto a lo más abstracto:

| Capa | Qué es | Ejemplo | Los componentes… |
|------|--------|---------|------------------|
| **1 · Base / primitiva** | Valor crudo, sin contexto | `--text-display-lg`, `--duration-fast` | no la tocan directo |
| **2 · Semántica** | Significado, no valor | `--surface-raised`, `--accent`, `--motion-ui` | **piensan aquí** |
| **3 · Componente** | Decisión por componente | `--btn-radius`, `--btn-min-height` | se re-estilan aquí, una vez |

**Regla:** un componente nunca hard-codea un hex ni una duración; usa el token.

---

## Paleta (validada 2026 — **no se rediseña**)

Base casi-negra + _electric lime_: combinación on-trend para e-commerce
atlético dark. Solo se documenta.

| Token semántico | Valor | Tailwind | Uso |
|-----------------|-------|----------|-----|
| `--surface-base` | `#020617` | `slate-950` | Fondo de la app |
| `--surface-raised` | `#0f172a` | `slate-900` | Tarjetas |
| `--surface-overlay` | `#1e293b` | `slate-800` | Modales, inputs |
| `--text-primary` | `#f8fafc` | ~`white` | Titulares / cuerpo |
| `--text-secondary` | `#cbd5e1` | `slate-300` | Copy secundario |
| `--text-muted` | `#94a3b8` | `slate-400` | Menor énfasis (AA en dark) |
| `--accent` | `#a3e635` | `lime-400` | Acento de marca |
| `--accent-hover` | `#bef264` | `lime-300` | Hover del acento |
| `--accent-contrast` | `#0f172a` | `slate-900` | Texto **sobre** relleno lima |

Contraste WCAG AA verificado por `npm run audit:contrast` (todos los pares
reales pasan). `slate-500` queda reservado a íconos/placeholders (umbral 3:1).

---

## Tipografía

Familias: **Inter** (cuerpo, `--font-body`) · **Rajdhani** (display/titulares,
`--font-display`). Los `h1–h3` y `.font-display` usan Rajdhani automáticamente.

### Escala DISPLAY (el hueco que cierra la Parte 1)

Tier grande y en negrita para heroes. `clamp(min, fluida, max)`: referencia
2026 de 96–120px en desktop que **degrada** con gracia a móvil (~375px) en vez
de un tamaño fijo enorme. `line-height` y `letter-spacing` viajan con el token.

| Utilidad | `clamp()` | Rango (móvil → desktop) | Uso |
|----------|-----------|-------------------------|-----|
| `text-display-xl` | `clamp(3.5rem, 8vw + 1rem, 7.5rem)` | 56 → **120px** | Hero full-bleed (Partes 3+) |
| `text-display-lg` | `clamp(3rem, 6vw + 1rem, 6rem)` | 48 → **96px** | Hero de landing (**en uso**: `HeroCarousel`) |
| `text-display-md` | `clamp(2.5rem, 5vw + 1rem, 4.5rem)` | 40 → 72px | Titulares de sección grandes |
| `text-display-sm` | `clamp(2rem, 3vw + 1rem, 3rem)` | 32 → 48px | Sub-heroes |

```tsx
<h2 className="font-display text-display-lg font-black uppercase text-white">
```

### Escala de texto (utilidades Tailwind por defecto)

Cuerpo y menores usan la escala estándar de Tailwind, ya consistente:
`text-lg` (18px) destacados · `text-base` (16px) cuerpo · `text-sm` (14px) UI ·
`text-xs` (12px) etiquetas/eyebrows (normalmente `uppercase tracking-wide`).

---

## Espaciado y radios

**Espaciado:** escala base-4 de Tailwind (`--spacing`, 1 = 0.25rem). No se
purga porque la app la usa de forma consistente. Convención de secciones:
`px-4 sm:px-6 lg:px-8` (gutter) + `py-16 lg:py-20` (ritmo vertical) dentro de
`max-w-7xl mx-auto`.

**Radios** (aliases semánticos sobre la rampa):

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-pill` | `9999px` | Botones, chips |
| `--radius-card` | `1.5rem` (24px) | Tarjetas de producto/contenido |
| `--radius-panel` | `2rem` (32px) | Paneles hero / CTA |

---

## Motion

Primitivas (`@theme`) → semánticas (`:root`). Los componentes eligen por
**intención**, no por número.

| Duración | Valor | | Semántico | → | Intención |
|----------|-------|-|-----------|---|-----------|
| `--duration-instant` | 100ms | | `--motion-ui` | `--duration-fast` | Hover, focus, estado pequeño |
| `--duration-fast` | 180ms | | `--motion-enter` | `--duration-base` | Contenido que entra en vista |
| `--duration-base` | 260ms | | `--motion-panel` | `--duration-slow` | Drawers, modales |
| `--duration-slow` | 420ms | | | | |
| `--duration-slower` | 700ms | | | | |

**Easing** (genera utilidades `ease-*`):

| Token | Curva | Uso |
|-------|-------|-----|
| `--ease-out-athletic` | `cubic-bezier(0.22, 1, 0.36, 1)` | Curva por defecto (`--motion-ease`) |
| `--ease-in-out-athletic` | `cubic-bezier(0.65, 0, 0.35, 1)` | Movimientos simétricos |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Overshoot lúdico (usar con criterio) |

### `prefers-reduced-motion` — punto único y centralizado

Un solo bloque al final de `src/index.css` neutraliza **toda** animación/
transición CSS y el scroll suave. El motion por JS (GSAP) lee el mismo ajuste
del SO vía `prefersReducedMotion()` en `src/lib/gsap.ts`. **No** se maneja
reduced-motion componente por componente. La **Parte 8 (#170)** construye los
hooks de animación sobre estos tokens y debe respetar el mismo switch.

---

## Botones — vocabulario unificado

Un único componente: [`src/components/ui/Button.tsx`](../src/components/ui/Button.tsx).
Todo botón (un `<button>` real o un `<Link>` estilizado vía
`getButtonClassName()`) pasa por aquí. Tokens en `--btn-*`.

| Variante | Aspecto | Uso |
|----------|---------|-----|
| `primary` | Relleno lima, texto oscuro | Acción principal (1 por vista) |
| `secondary` | Borde, superficie clara | Superficies claras / menor énfasis |
| `ghost` | Outline sobre dark | Acción terciaria / "silenciosa" |

```tsx
<Button variant="primary">Comprar</Button>
<Button variant="ghost" onClick={openCart}>Ver carrito</Button>
// Link estilizado como botón:
<Link to="/shop" className={getButtonClassName({ variant: 'primary' })}>…</Link>
```

Base compartida: `rounded-[var(--btn-radius)]`, focus ring visible,
`transition` con `--btn-duration` / `--btn-ease`, y **`min-h-[var(--btn-min-height)]`**.

---

## Regla de touch target: **44px mínimo**

Norma del sistema (WCAG 2.5.5 / práctica móvil). Todo elemento interactivo
mide **≥ 44×44px** de área táctil. Token: `--size-touch-min: 2.75rem`.

- Botones: `min-h-[var(--btn-min-height)]` en la base (piso garantizado).
- Chips / botones ícono: `min-h-[var(--size-touch-min)]` + `inline-flex items-center`
  (ej. `CategoryFilter`, antes ~36px). Las flechas del carrusel ya son `h-11 w-11`.

Al añadir cualquier control nuevo, verifica el piso de 44px antes de mergear.
