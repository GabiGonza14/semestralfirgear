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
export function Select<T extends string>({ value, onChange, options, label }: SelectProps<T>) {
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

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={`${label}: ${selected.label}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className={`inline-flex min-h-[var(--size-touch-min)] items-center gap-2 rounded-full border bg-slate-950/60 py-2.5 pl-4 pr-3 text-sm font-medium text-slate-200 outline-none transition focus-visible:border-lime-400/60 focus-visible:ring-2 focus-visible:ring-lime-400/30 ${
          open
            ? 'border-lime-400/60 ring-2 ring-lime-400/30'
            : 'border-white/10 hover:border-white/25'
        }`}
      >
        <span className="whitespace-nowrap">{selected.label}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
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
            className="absolute right-0 z-30 mt-2 min-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900 p-1.5 shadow-2xl shadow-black/50 outline-none"
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
                    isActive ? 'bg-lime-400/10' : ''
                  } ${isSelected ? 'font-semibold text-lime-400' : 'font-medium text-slate-200'}`}
                >
                  <span className="flex-1 whitespace-nowrap">{option.label}</span>
                  {isSelected ? (
                    <svg className="h-4 w-4 shrink-0 text-lime-400" viewBox="0 0 24 24" fill="none" aria-hidden>
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
