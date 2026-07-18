// scripts/check-contrast.mjs
// Auditoría de contraste WCAG AA para la paleta dark + lima de FITGEAR.
// Sin dependencias: la fórmula de luminancia/contraste está embebida.
//   node scripts/check-contrast.mjs
//
// Pares = combinaciones reales texto/fondo usadas en la UI (tokens de
// index.css + utilidades Tailwind slate/lime/amber/rose que aparecen en los
// componentes). Si un par de texto normal queda < 4.5:1, hay que ajustarlo.

const palette = {
  // Superficies oscuras
  'slate-950': '#020617', // --fg-black (fondo base)
  'slate-900': '#0f172a', // --fg-dark / tarjetas
  'slate-800': '#1e293b', // --fg-dark-card

  // Texto
  'white': '#ffffff',
  'slate-100': '#f1f5f9', // --fg-light
  'slate-300': '#cbd5e1', // --fg-lighter
  'slate-400': '#94a3b8', // texto secundario frecuente
  'slate-500': '#64748b', // --fg-muted (el más tenue)

  // Acento marca (lima) — se mantiene
  'lime-400': '#a3e635', // --fg-accent
  'lime-300': '#bef264', // --fg-accent-hover

  // Estados (badges con ring)
  'amber-300': '#fcd34d',
  'rose-300': '#fda4af',
  'sky-300': '#7dd3fc',

  // --- Paleta clara del panel admin (dashboard ejecutivo) ---
  'white-bg': '#ffffff',
  'slate-50': '#f8fafc',
  'slate-200': '#e2e8f0',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-500': '#10b981',
  'emerald-600': '#059669',
  'emerald-700': '#047857',
  'amber-50': '#fffbeb',
  'amber-500': '#f59e0b',
  'amber-600': '#d97706',
  'amber-700': '#b45309',
  'amber-800': '#92400e',
  'amber-900': '#78350f',
  'rose-50': '#fff1f2',
  'rose-600': '#e11d48',
  'rose-700': '#be123c',
  'sky-50': '#f0f9ff',
  'sky-700': '#0369a1',
  'teal-50': '#f0fdfa',
  'teal-700': '#0f766e',
  'fuchsia-50': '#fdf4ff',
  'fuchsia-600': '#c026d3',
  'fuchsia-700': '#a21caf',
  'violet-50': '#f5f3ff',
  'violet-700': '#6d28d9',
}

// [texto, fondo, ¿es texto grande? (>=18.66px bold / 24px)]
const pairs = [
  ['white', 'slate-950'],
  ['white', 'slate-900'],
  ['slate-100', 'slate-900'],
  ['slate-300', 'slate-950'],
  ['slate-300', 'slate-900'],
  ['slate-400', 'slate-950'],
  ['slate-400', 'slate-900'],
  ['slate-400', 'slate-800'],
  // slate-500 NO pasa como texto normal (4.24 / 3.75:1) → queda reservado solo
  // para íconos y placeholders no esenciales, que solo exigen el umbral 3:1.
  ['slate-500', 'slate-950', true],
  ['slate-500', 'slate-900', true],
  ['lime-400', 'slate-950', true], // labels/acento (suele ser texto grande/uppercase)
  ['lime-400', 'slate-900', true],
  ['lime-300', 'slate-950', true],
  ['slate-900', 'lime-400'], // texto del botón CTA sobre lima
  ['amber-300', 'slate-900', true], // badge PENDING
  ['rose-300', 'slate-900', true], // badge error/eliminar
  ['sky-300', 'slate-900', true], // badge SHIPPED

  // --- Panel admin: paleta clara ---
  // slate-400 sobre blanco/slate-50 (2.56:1) NO pasa ni como texto grande — se
  // reserva solo para placeholder:text-slate-400 (no evaluado aquí, mismo
  // criterio que el resto del script no audita placeholders). Cualquier texto
  // real usa slate-500 como mínimo.
  ['slate-900', 'white-bg'], // títulos/valores principales
  ['slate-700', 'white-bg'], // texto de formularios
  ['slate-600', 'white-bg'], // texto de tabla/cuerpo
  ['slate-500', 'white-bg'], // texto secundario/terciario (reemplaza a slate-400)
  ['slate-600', 'slate-50'], // texto de tabla sobre fila con fondo sutil
  ['slate-500', 'slate-50'], // texto secundario sobre fondo sutil
  ['white-bg', 'emerald-700'], // botones primarios (texto blanco) — emerald-600 no pasa (3.77:1), se usa 700
  ['white-bg', 'rose-600'], // botones destructivos
  ['white-bg', 'fuchsia-600'], // botón reembolsar
  ['white-bg', 'amber-700'], // botón acceso denegado / chip stock bajo activo — amber-500/600 no pasan
  ['emerald-700', 'emerald-50'], // texto de éxito / badge PAID / precio final
  ['emerald-700', 'white-bg'], // eyebrow labels — texto xs/sm, NO es "grande" pese al uppercase+bold
  ['amber-700', 'amber-50'], // badge PENDING / stock bajo
  ['amber-800', 'amber-50'], // texto dentro de aviso amber
  ['amber-900', 'amber-50'], // heading "Necesitas acceso de administrador"
  ['rose-700', 'rose-50'], // badge FAILED / error boxes
  ['rose-600', 'white-bg'], // links "Eliminar"/"Rechazar"
  ['sky-700', 'sky-50'], // badge SHIPPED
  ['teal-700', 'teal-50'], // badge DELIVERED
  ['fuchsia-700', 'fuchsia-50'], // badge REFUNDED
  ['violet-700', 'violet-50'], // badge USER (auditoría)
  ['slate-700', 'emerald-50'], // Select.tsx tone="light": opción activa/hover en el listbox del admin
  // Sidebar del admin: azul oscuro + verde neón — reusa la paleta dark+lima
  // de siempre (slate-950/lime-400), ya cubierta arriba (lime-400 sobre
  // slate-950, slate-900 sobre lime-400). Solo falta el ítem activo con
  // slate-950 exacto sobre lime-400 (más oscuro que slate-900, así que pasa
  // con más margen todavía).
  ['slate-950', 'lime-400'],
]

// --- WCAG 2.1 relative luminance + contrast ratio ---
function srgbToLinear(c) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function luminance(hex) {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}
function ratio(fg, bg) {
  const L1 = luminance(fg)
  const L2 = luminance(bg)
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]
  return (hi + 0.05) / (lo + 0.05)
}

console.log('\n=== AUDITORÍA DE CONTRASTE WCAG AA (FITGEAR dark + lima) ===\n')
let failed = 0

for (const [fg, bg, isLarge] of pairs) {
  const r = ratio(palette[fg], palette[bg])
  const threshold = isLarge ? 3.0 : 4.5
  const pass = r >= threshold
  if (!pass) failed++
  const tag = isLarge ? 'grande' : 'normal'
  const mark = pass ? 'PASS' : 'FAIL'
  console.log(
    `[${mark}] ${fg.padEnd(10)} sobre ${bg.padEnd(10)} ` +
      `${r.toFixed(2).padStart(5)}:1  (min ${threshold} · texto ${tag})`,
  )
}

console.log(
  `\n${failed === 0 ? 'OK' : failed + ' fallo(s)'} — umbral AA: 4.5:1 normal · 3.0:1 grande.\n`,
)
process.exit(failed === 0 ? 0 : 1)
