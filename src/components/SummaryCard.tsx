interface SummaryCardProps {
  label: string
  value: string
  trend?: string
  /** Dark "hero" tile — for the one metric that should stand out among the rest. */
  accent?: boolean
  /** Warning tint — for a metric that needs attention (e.g. low stock > 0). */
  tone?: 'default' | 'warning'
}

export function SummaryCard({ label, value, trend, accent = false, tone = 'default' }: Readonly<SummaryCardProps>) {
  if (accent) {
    return (
      <article className="rounded-2xl bg-slate-900 p-4 shadow-sm">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-bold text-white">{value}</p>
        {trend ? <p className="mt-2 text-xs font-medium text-emerald-400">{trend}</p> : null}
      </article>
    )
  }

  if (tone === 'warning') {
    return (
      <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <p className="text-sm text-amber-700/80">{label}</p>
        <p className="mt-2 text-2xl font-bold text-amber-700">{value}</p>
        {trend ? <p className="mt-2 text-xs font-medium text-amber-600">{trend}</p> : null}
      </article>
    )
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {trend ? <p className="mt-2 text-xs font-medium text-emerald-700">{trend}</p> : null}
    </article>
  )
}
