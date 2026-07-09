import { useEffect, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import {
  Outlet,
  useLocation as useTanStackLocation,
  useNavigate as useTanStackNavigate,
  useParams as useTanStackParams,
} from '@tanstack/react-router'

// Compatibility shim: the shared SPA components (src/**) import router
// primitives from 'react-router-dom'. For the TanStack Start build ONLY,
// vite.config.start.ts aliases 'react-router-dom' to this file, re-implementing
// the small API surface those components use on top of TanStack Router. The SPA
// build is untouched and keeps using the real react-router-dom.

export { Outlet }

type LooseNav = (opts: {
  to: string
  search?: Record<string, string>
  replace?: boolean
}) => void

// TanStack's navigate/Link are type-safe against the known route tree; the
// shared components pass arbitrary string hrefs (e.g. `/shop?category=X`), so we
// go through a deliberately loosened signature here.
function useLooseNavigate(): LooseNav {
  const navigate = useTanStackNavigate()
  return (opts) => {
    void (navigate as unknown as LooseNav)(opts)
  }
}

function splitTo(to: string): { pathname: string; search?: Record<string, string> } {
  const [pathname, queryStr] = to.split('?')
  if (!queryStr) {
    return { pathname }
  }
  const search: Record<string, string> = {}
  new URLSearchParams(queryStr).forEach((value, key) => {
    search[key] = value
  })
  return { pathname, search }
}

type LinkProps = {
  to: string
  replace?: boolean
  children?: ReactNode
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

// Renders a real <a href> (so links are present in the SSR HTML and work
// without JS) and upgrades clicks to client-side TanStack navigation.
export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const navigate = useLooseNavigate()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }
    event.preventDefault()
    const { pathname, search } = splitTo(to)
    navigate({ to: pathname, search, replace })
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}

type NavLinkRenderState = { isActive: boolean }

type NavLinkProps = {
  to: string
  replace?: boolean
  className?: string | ((state: NavLinkRenderState) => string)
  children?: ReactNode | ((state: NavLinkRenderState) => ReactNode)
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>

export function NavLink({ to, className, children, ...rest }: NavLinkProps) {
  const location = useTanStackLocation()
  const { pathname } = splitTo(to)
  const isActive = location.pathname === pathname
  const resolvedClassName = typeof className === 'function' ? className({ isActive }) : className
  const resolvedChildren = typeof children === 'function' ? children({ isActive }) : children

  return (
    <Link to={to} className={resolvedClassName} {...rest}>
      {resolvedChildren}
    </Link>
  )
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useLooseNavigate()
  useEffect(() => {
    const { pathname, search } = splitTo(to)
    navigate({ to: pathname, search, replace })
  }, [to, replace, navigate])
  return null
}

export function useNavigate() {
  const navigate = useLooseNavigate()
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      if (typeof window !== 'undefined') {
        window.history.go(to)
      }
      return
    }
    const { pathname, search } = splitTo(to)
    navigate({ to: pathname, search, replace: options?.replace })
  }
}

export function useLocation() {
  const location = useTanStackLocation()
  return {
    pathname: location.pathname,
    search: location.searchStr ?? '',
    hash: location.hash ?? '',
    state: location.state,
  }
}

export function useParams<T extends Record<string, string | undefined>>(): T {
  return (useTanStackParams as unknown as (opts: { strict: false }) => T)({ strict: false })
}

type SetSearchParams = (
  next: URLSearchParams | Record<string, string>,
  options?: { replace?: boolean },
) => void

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const location = useTanStackLocation()
  const navigate = useLooseNavigate()

  const params = new URLSearchParams(location.searchStr ?? '')

  const setSearchParams: SetSearchParams = (next, options) => {
    const usp = next instanceof URLSearchParams ? next : new URLSearchParams(next)
    const search: Record<string, string> = {}
    usp.forEach((value, key) => {
      search[key] = value
    })
    navigate({ to: location.pathname, search, replace: options?.replace })
  }

  return [params, setSearchParams]
}
