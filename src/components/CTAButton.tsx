import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getButtonClassName } from './ui/Button'

interface CTAButtonProps {
  to: string
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function CTAButton({ to, children, variant = 'primary' }: CTAButtonProps) {
  return (
    <Link
      to={to}
      className={
        variant === 'primary'
          ? getButtonClassName()
          : getButtonClassName({ variant: 'secondary' })
      }
    >
      {children}
    </Link>
  )
}
