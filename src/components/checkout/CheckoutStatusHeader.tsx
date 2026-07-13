// Shared header block for the checkout result pages (success/cancel): the
// badge + title + description + optional "Pedido: {id}" pill were
// byte-identical markup duplicated across CheckoutSuccessPage and
// CheckoutCancelPage (pre-existing, not introduced by the Part 2 copy pass —
// SonarCloud's new-code duplication check just started counting it once
// unrelated text edits touched lines inside the block). Each page still owns
// its own icon, loading indicator and status/error messages below this.
interface CheckoutStatusHeaderProps {
  badge: string
  badgeClassName?: string
  title: string
  description: string
  pillLabel?: string
}

export function CheckoutStatusHeader({
  badge,
  badgeClassName = 'text-lime-400',
  title,
  description,
  pillLabel,
}: CheckoutStatusHeaderProps) {
  return (
    <>
      <p className={`mt-6 text-xs font-bold uppercase tracking-[0.24em] ${badgeClassName}`}>{badge}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">{title}</h1>
      <p className="mt-3 text-slate-400">{description}</p>
      {pillLabel ? (
        <p className="mt-3 inline-block rounded-full bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-400">
          {pillLabel}
        </p>
      ) : null}
    </>
  )
}
