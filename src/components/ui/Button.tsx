import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
}

const VARIANT_CLASSNAME: Record<ButtonVariant, string> = {
  primary:
    'bg-lime-400 text-slate-900 hover:bg-lime-300 focus-visible:ring-lime-300/70',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-300/70',
}

interface ButtonClassOptions {
  variant?: ButtonVariant
  fullWidth?: boolean
  className?: string
}

export function getButtonClassName({
  variant = 'primary',
  fullWidth = false,
  className = '',
}: ButtonClassOptions = {}) {
  return `inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSNAME[variant]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()
}

export function Button({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={getButtonClassName({ variant, fullWidth, className })}
      {...rest}
    >
      {children}
    </button>
  )
}
