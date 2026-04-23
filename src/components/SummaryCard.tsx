interface SummaryCardProps {
  label: string
  value: string
  trend?: string
}

export function SummaryCard({ label, value, trend }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-100">{value}</p>
      {trend ? <p className="mt-2 text-xs text-lime-300">{trend}</p> : null}
    </article>
  )
}
