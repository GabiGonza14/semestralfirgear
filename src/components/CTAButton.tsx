import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface CTAButtonProps {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function CTAButton({ to, children, variant = 'primary' }: CTAButtonProps) {
  const baseClass =
    'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition'

  const variantClass =
    variant === 'primary'
      ? 'bg-lime-400 text-slate-950 hover:bg-lime-300'
      : 'border border-white/40 bg-white/5 text-white hover:bg-white/15'

  return (
    <Link to={to} className={`${baseClass} ${variantClass}`}>
      {children}
    </Link>
  )
}
