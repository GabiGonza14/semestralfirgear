import type { ButtonHTMLAttributes, ReactNode } from 'react'

// The single, canonical button vocabulary for FITGEAR. Every clickable
// "button" (real <button> or a <Link> styled as one, via getButtonClassName)
// should go through here so radius, motion, focus and the 44px touch-target
// floor stay consistent. Design tokens live in src/index.css (--btn-*);
// see docs/design.md for when to use each variant.
type ButtonVariant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  fullWidth?: boolean
}

const VARIANT_CLASSNAME: Record<ButtonVariant, string> = {
  // Primary — lime fill on dark surfaces; the main action.
  primary:
    'bg-lime-400 text-slate-900 hover:bg-lime-300 focus-visible:ring-lime-300/70',
  // Secondary — bordered, for light surfaces / lower-emphasis actions.
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-slate-300/70',
  // Ghost — outline tuned for dark surfaces; tertiary / "quiet" action.
  ghost:
    'border border-white/15 bg-transparent text-white hover:border-white/30 hover:bg-white/5 focus-visible:ring-white/30',
}

interface ButtonClassOptions {
  variant?: ButtonVariant
  fullWidth?: boolean
  className?: string
}

// `min-h-[--btn-min-height]` (44px) guarantees the touch-target floor even for
// short labels; duration/ease/radius are wired to the component tokens so the
// whole system re-skins from src/index.css alone.
const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--btn-radius)] min-h-[var(--btn-min-height)] px-6 py-3 text-sm font-semibold transition-all duration-[var(--btn-duration)] ease-[var(--btn-ease)] focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

export function getButtonClassName({
  variant = 'primary',
  fullWidth = false,
  className = '',
}: ButtonClassOptions = {}) {
  return `${BUTTON_BASE} ${VARIANT_CLASSNAME[variant]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()
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
