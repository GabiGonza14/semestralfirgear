import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EASE_OUT_ATHLETIC, MOTION_DURATION } from '../../lib/motion'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: ReadonlyArray<SelectOption<T>>
  /** Accessible name for the control — also used to label the open listbox. */
  label: string
  /** Trigger style — 'outline' (default, dark), 'solid' (filled lime), or
   *  'light' (white/slate + emerald, for the admin panel's light palette). */
  tone?: 'outline' | 'solid' | 'light'
  /** Stretches the trigger to fill its container — e.g. a filter bar's grid
   *  cell — instead of shrinking to the label's own width. */
  fullWidth?: boolean
  disabled?: boolean
  /** Native tooltip on the trigger — e.g. explaining why it's disabled. */
  title?: string
}

/**
 * Accessible listbox dropdown replacing the native <select>, whose expanded menu
 * the browser paints itself (system blue / white) with no cross-browser way to
 * style it. Same external contract as a controlled select (value / onChange) —
 * this is a visual swap, it owns no filtering/sort logic.
 *
 * ARIA "select-only listbox" pattern: a button trigger opens a role="listbox";
 * focus moves into the list, which tracks the highlighted option via
 * aria-activedescendant. Keyboard: ↑/↓ move, Home/End jump, Enter/Space choose,
 * Escape closes and returns focus to the trigger, Tab closes. Closes on outside
 * pointer press. Fully operable by tap (no hover dependency). The open/close
 * fade+rise uses the shared motion tokens and is dropped under reduced motion
 * by the app-wide MotionConfig reducedMotion="user".
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  tone = 'outline',
  fullWidth = false,
  disabled = false,
  title,
}: Readonly<SelectProps<T>>) {
  const [open, setOpen] = useState(false)
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const selected = options[selectedIndex] ?? options[0]

  const openMenu = () => {
    setActiveIndex(selectedIndex)
    setOpen(true)
  }

  const closeMenu = (refocusTrigger = true) => {
    setOpen(false)
    if (refocusTrigger) {
      triggerRef.current?.focus()
    }
  }

  const commit = (index: number) => {
    const option = options[index]
    if (option) {
      onChange(option.value)
    }
    closeMenu()
  }

  // Move focus into the listbox when it opens so arrow keys drive it.
  useEffect(() => {
    if (open) {
      listRef.current?.focus()
    }
  }, [open])

  // Close on an outside pointer press.
  useEffect(() => {
    if (!open) {
      return
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openMenu()
    }
  }

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((index) => Math.min(options.length - 1, index + 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((index) => Math.max(0, index - 1))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        commit(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        closeMenu()
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  // Per-tone visual language, kept as plain if/else (not nested ternaries) so
  // adding 'light' didn't turn this into an unreadable conditional chain.
  let triggerClassName = ''
  let chevronClassName = 'text-slate-300'
  let panelClassName = 'border border-white/10 bg-slate-900 shadow-2xl shadow-black/50'
  let optionActiveClassName = 'bg-lime-400/10'
  let optionSelectedClassName = 'font-semibold text-lime-400'
  let optionUnselectedClassName = 'font-medium text-slate-200'
  let checkmarkClassName = 'text-lime-400'

  if (tone === 'solid') {
    const openShadow = open ? 'shadow-[0_0_20px_-6px_rgba(100,116,139,0.45)]' : ''
    triggerClassName = `bg-slate-700 text-slate-100 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-slate-400/40 ${openShadow}`
    chevronClassName = 'text-slate-100'
  } else if (tone === 'light') {
    const openBorder = open
      ? 'border-emerald-500/60 ring-2 ring-emerald-500/20'
      : 'border-slate-200 hover:border-slate-300'
    triggerClassName = `border bg-white text-slate-700 focus-visible:border-emerald-500/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 ${openBorder}`
    chevronClassName = 'text-slate-500'
    panelClassName = 'border border-slate-200 bg-white shadow-xl shadow-slate-900/10'
    optionActiveClassName = 'bg-emerald-50'
    optionSelectedClassName = 'font-semibold text-emerald-700'
    optionUnselectedClassName = 'font-medium text-slate-700'
    checkmarkClassName = 'text-emerald-600'
  } else {
    const openBorder = open ? 'border-lime-400/60 ring-2 ring-lime-400/30' : 'border-white/10 hover:border-white/25'
    triggerClassName = `border bg-slate-950/60 text-slate-200 focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/30 ${openBorder}`
  }

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? 'w-full' : 'shrink-0'}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${label}: ${selected.label}`}
        title={title}
        disabled={disabled}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={`flex min-h-[var(--size-touch-min)] items-center gap-2 rounded-full py-2.5 pl-4 pr-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
          fullWidth ? 'w-full' : 'inline-flex'
        } ${tone === 'solid' ? 'font-bold' : 'font-medium'} ${triggerClassName}`}
      >
        <span className="flex-1 truncate text-left whitespace-nowrap">{selected.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 transition-transform ${chevronClassName} ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            aria-activedescendant={optionId(activeIndex)}
            onKeyDown={handleListKeyDown}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: MOTION_DURATION.fast, ease: EASE_OUT_ATHLETIC }}
            className={`absolute right-0 z-30 mt-2 min-w-full overflow-hidden rounded-2xl p-1.5 outline-none ${panelClassName}`}
          >
            {options.map((option, index) => {
              const isSelected = option.value === value
              const isActive = index === activeIndex
              return (
                // Keyboard selection is handled by the listbox's onKeyDown
                // (aria-activedescendant pattern); options themselves only need
                // pointer handlers, so the missing key handler is expected here.
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={option.value}
                  id={optionId(index)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => commit(index)}
                  className={`flex min-h-[var(--size-touch-min)] cursor-pointer items-center gap-2 rounded-xl px-3 text-sm transition ${
                    isActive ? optionActiveClassName : ''
                  } ${isSelected ? optionSelectedClassName : optionUnselectedClassName}`}
                >
                  <span className="flex-1 whitespace-nowrap">{option.label}</span>
                  {isSelected ? (
                    <svg className={`h-4 w-4 shrink-0 ${checkmarkClassName}`} viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </li>
              )
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
