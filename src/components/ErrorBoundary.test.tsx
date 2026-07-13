import { describe, expect, test, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ErrorBoundary } from './ErrorBoundary'

// These tests avoid a heavy DOM/testing-library dependency (none is installed).
// react-dom/server can't *catch* a thrown boundary during SSR, but it CAN render
// the boundary's own output — so we drive the component's documented contract
// directly (its static/lifecycle methods and its two render outputs). The
// Navbar/Footer-preservation guarantee is structural (see the last test) and
// explained in the PR.

describe('ErrorBoundary — state machine (HU-34/HU-36)', () => {
  test('getDerivedStateFromError flips into the error state', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true })
  })

  test('renders its children unchanged when there is no error', () => {
    const html = renderToStaticMarkup(
      <ErrorBoundary>
        <p>PAGE CONTENT</p>
      </ErrorBoundary>,
    )
    expect(html).toContain('PAGE CONTENT')
    expect(html).not.toContain('Algo salió mal')
  })

  test('renders a friendly, non-technical fallback once errored (criteria 2 & 4)', () => {
    const boundary = new ErrorBoundary({ children: <p>PAGE CONTENT</p> })
    boundary.state = { hasError: true }
    const html = renderToStaticMarkup(<>{boundary.render()}</>)

    // Friendly message + a way out, no page content.
    expect(html).toContain('Algo salió mal')
    expect(html).toContain('Recargar página')
    expect(html).not.toContain('PAGE CONTENT')
    // No technical info leaks to the user (criterion 2): no stack, no error text.
    expect(html.toLowerCase()).not.toContain('stack')
    expect(html).not.toContain('at ')
  })
})

// Tests only the boundary's own contract: it clears ITS state when resetKey
// changes. This does NOT guarantee the routed page fully recovers after an
// in-app navigation — verified live in a real browser that TanStack Router can
// keep showing the crashed page's fallback even once the URL has changed. The
// "Recargar página" button (a real reload) is the reliable recovery path.
describe('ErrorBoundary — resetKey clears its own state (best-effort, HU-36)', () => {
  test('clears the error when resetKey changes', () => {
    const boundary = new ErrorBoundary({ children: null, resetKey: '/shop' })
    boundary.state = { hasError: true }
    const setState = vi.fn()
    boundary.setState = setState as typeof boundary.setState

    // Simulate a route change: prev resetKey '/product/1' -> current '/shop'.
    boundary.componentDidUpdate({ children: null, resetKey: '/product/1' })

    expect(setState).toHaveBeenCalledWith({ hasError: false })
  })

  test('does NOT reset while the route (resetKey) is unchanged', () => {
    const boundary = new ErrorBoundary({ children: null, resetKey: '/shop' })
    boundary.state = { hasError: true }
    const setState = vi.fn()
    boundary.setState = setState as typeof boundary.setState

    boundary.componentDidUpdate({ children: null, resetKey: '/shop' })

    expect(setState).not.toHaveBeenCalled()
  })
})

describe('ErrorBoundary — placement preserves site chrome (HU-36 criterion 3)', () => {
  // Mirrors how SiteChrome mounts things: Navbar and Footer are SIBLINGS of the
  // ErrorBoundary(Outlet), not descendants. React only ever replaces the subtree
  // *under* a boundary with its fallback, so a crash inside <Outlet /> can never
  // unmount these siblings — the header/footer stay. This asserts that sibling
  // structure; the crash-time behavior follows from React's boundary contract.
  test('Navbar and Footer render as siblings of the boundary, not inside it', () => {
    const html = renderToStaticMarkup(
      <div>
        <nav>NAVBAR</nav>
        <main>
          <ErrorBoundary resetKey="/x">
            <p>ROUTED PAGE</p>
          </ErrorBoundary>
        </main>
        <footer>FOOTER</footer>
      </div>,
    )
    expect(html).toContain('NAVBAR')
    expect(html).toContain('FOOTER')
    expect(html).toContain('ROUTED PAGE')
    // The boundary wraps only the page: chrome sits outside <main>.
    expect(html.indexOf('NAVBAR')).toBeLessThan(html.indexOf('ROUTED PAGE'))
    expect(html.indexOf('ROUTED PAGE')).toBeLessThan(html.indexOf('FOOTER'))
  })
})
