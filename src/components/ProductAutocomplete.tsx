import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getProductSuggestions } from '../api/fitgearApi'
import type { ProductSuggestion } from '../types'

interface ProductAutocompleteProps {
  value: string
  onChange: (value: string) => void
}

// AC (HU-51): dropdown appears from 2 characters, up to 5 suggestions.
const MIN_CHARS = 2
const DEBOUNCE_MS = 200

export function ProductAutocomplete({ value, onChange }: ProductAutocompleteProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [open, setOpen] = useState(false)
  // Keyboard-highlighted row; -1 means "none" (typing hasn't picked one yet).
  const [activeIndex, setActiveIndex] = useState(-1)

  // Debounce the query so we hit the endpoint once typing pauses, not per key.
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [value])

  useEffect(() => {
    const trimmed = debounced.trim()
    if (trimmed.length < MIN_CHARS) {
      setSuggestions([])
      setOpen(false)
      return
    }

    let active = true
    void getProductSuggestions(trimmed)
      .then((results) => {
        if (!active) return
        setSuggestions(results)
        setActiveIndex(-1)
        setOpen(true)
      })
      .catch(() => {
        // A failed suggestion fetch is non-critical — just don't show a dropdown.
        if (active) {
          setSuggestions([])
          setOpen(false)
        }
      })

    return () => {
      active = false
    }
  }, [debounced])

  // Close the dropdown when clicking outside the component.
  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const goToProduct = (suggestion: ProductSuggestion) => {
    setOpen(false)
    void navigate({ to: '/product/$id', params: { id: suggestion.id } })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1))
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault()
      const chosen = suggestions[activeIndex]
      if (chosen) {
        goToProduct(chosen)
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && suggestions.length > 0

  return (
    <div ref={containerRef} className="relative">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true)
        }}
        placeholder="Buscar producto..."
        aria-label="Buscar producto"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="product-suggestions"
        className="w-full rounded-full border border-white/10 bg-slate-950/60 py-3 pl-12 pr-10 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/30"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('')
            setOpen(false)
          }}
          aria-label="Limpiar búsqueda"
          className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}

      {showDropdown ? (
        <ul
          id="product-suggestions"
          role="listbox"
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 py-1.5 shadow-xl backdrop-blur-md"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => goToProduct(suggestion)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                  index === activeIndex ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-b from-white to-slate-100">
                  {suggestion.imageUrl ? (
                    <img
                      src={suggestion.imageUrl}
                      alt=""
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 16l4-4 3 3 5-5 4 4M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="line-clamp-1 text-sm font-medium text-slate-100">
                  {suggestion.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
