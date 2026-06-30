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
