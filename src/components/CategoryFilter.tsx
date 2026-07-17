interface CategoryFilterProps {
  categories: ReadonlyArray<{ value: string; label: string }>
  selected: string
  onSelect: (category: string) => void
}

// min-h-[--size-touch-min] enforces the 44px touch-target floor (WCAG 2.5.5);
// inline-flex keeps the label centered now that the chip is taller than its text.
const baseChip =
  'inline-flex min-h-[var(--size-touch-min)] items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400/40'
const activeChip = 'bg-lime-400 text-slate-900 shadow-[0_0_20px_-6px_rgba(163,230,53,0.7)]'
const inactiveChip =
  'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'

// Display order only — doesn't touch how categories are fetched/filtered.
// Anything not listed here keeps its original relative order at the end.
const DISPLAY_ORDER = ['Guantes', 'Mochila', 'Cuerdas', 'Botellas', 'Pesas', 'Bandas']

function sortForDisplay<T extends { label: string }>(categories: ReadonlyArray<T>): T[] {
  return [...categories].sort((a, b) => {
    const rankA = DISPLAY_ORDER.indexOf(a.label)
    const rankB = DISPLAY_ORDER.indexOf(b.label)
    if (rankA === -1 && rankB === -1) return 0
    if (rankA === -1) return 1
    if (rankB === -1) return -1
    return rankA - rankB
  })
}

// Small line-icon per category — same 1.8px stroke weight as the rest of the
// app's icon set. Falls back to no icon for categories outside this map.
// Exported so the header accent (ShopPage.tsx) can reuse the same icons.
export function CategoryIcon({ label, className = 'h-4 w-4 shrink-0' }: { label: string; className?: string }) {
  const common = { stroke: 'currentColor', strokeWidth: 1.8, fill: 'none' as const }
  const cls = className

  switch (label) {
    case 'Guantes':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V5a1.5 1.5 0 0 1 3 0v6M16 11V8a1.5 1.5 0 0 1 3 0v6c0 3-2 6-5 6H9c-2.5 0-4-1.5-4-4v-4l1.5-1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'Mochila':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M8 8V6a4 4 0 0 1 8 0v2M6 8h12l1 12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12h6M10 8v3M14 8v3" strokeLinecap="round" />
        </svg>
      )
    case 'Cuerdas':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M4 6c4 0 4 4 8 4s4-4 8-4M4 12c4 0 4 4 8 4s4-4 8-4M4 18c4 0 4 4 8 4s4-4 8-4" strokeLinecap="round" />
        </svg>
      )
    case 'Botellas':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M10 2h4v3.2l2 2.3V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V7.5l2-2.3z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.5 12h5" strokeLinecap="round" />
        </svg>
      )
    case 'Pesas':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M3 10v4M6 8v8M18 8v8M21 10v4M6 12h12" strokeLinecap="round" />
        </svg>
      )
    case 'Bandas':
      return (
        <svg className={cls} viewBox="0 0 24 24" aria-hidden {...common}>
          <ellipse cx="12" cy="12" rx="9" ry="5" />
          <ellipse cx="12" cy="12" rx="5" ry="2.6" />
        </svg>
      )
    default:
      return null
  }
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const sorted = sortForDisplay(categories)

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`${baseChip} ${selected === 'all' ? activeChip : inactiveChip}`}
      >
        Todas
      </button>
      {sorted.map((category) => (
        <button
          key={category.value}
          type="button"
          onClick={() => onSelect(category.value)}
          className={`${baseChip} ${selected === category.value ? activeChip : inactiveChip}`}
        >
          <CategoryIcon label={category.label} />
          {category.label}
        </button>
      ))}
    </div>
  )
}
