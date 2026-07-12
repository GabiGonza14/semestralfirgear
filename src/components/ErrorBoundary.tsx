import { Component, type ErrorInfo, type ReactNode } from 'react'
import { posthog } from '../lib/posthog'

interface Props {
  children: ReactNode
  // HU-36: when this value changes, the boundary clears its error state. The inner
  // boundaries in SiteChrome pass the current pathname, so navigating away from a
  // crashed page (via the Navbar/Footer, which stay mounted) recovers the view
  // without a full reload. The outer last-resort boundary in __root.tsx omits it.
  resetKey?: unknown
}

interface State {
  hasError: boolean
}

// HU-34: React Error Boundary. React 18+ does NOT forward render/commit errors to
// window.onerror, so PostHog's window-level exception autocapture can't see them —
// this boundary catches them and reports to PostHog explicitly, then shows a
// minimal fallback instead of an unmounted white screen. HU-36 relocates instances
// of this inside SiteChrome (around <Outlet />) so a page crash keeps the site
// header/footer.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidUpdate(prevProps: Props): void {
    // Recover on navigation: once the route (resetKey) changes, drop the error so
    // the newly-routed page renders instead of a stuck fallback.
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false })
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Never let error reporting throw while we're already handling an error
    // (e.g. PostHog not yet initialized). captureException is a no-op then.
    try {
      posthog.captureException(error, {
        componentStack: info.componentStack,
        source: 'react-error-boundary',
      })
    } catch {
      // swallow — reporting is best-effort
    }
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-400">
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Algo salió mal</h1>
          <p className="mt-2 max-w-md text-slate-400">
            Ocurrió un error inesperado y ya lo registramos. Puedes recargar la página para
            continuar.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleReload}
          className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-lime-300"
        >
          Recargar página
        </button>
      </div>
    )
  }
}
