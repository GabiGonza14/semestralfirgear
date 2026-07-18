import { Outlet } from '@tanstack/react-router'
import { SectionDecor } from './SectionDecor'
import { ErrorBoundary } from './ErrorBoundary'
import { RouteTransition } from './RouteTransition'

interface SiteMainContentProps {
  isAdminPage: boolean
  isShopPage: boolean
  isCheckoutPage: boolean
  pathname: string
}

// The "every other page" branch of SiteChrome's layout (app/routes/_site.tsx)
// — pulled out so its admin-vs-storefront class ternaries and the shop-only
// SectionDecor check don't count against SiteChrome's own cognitive
// complexity, and so it lives alongside the codebase's other single-purpose
// layout components instead of growing the route file itself.
export function SiteMainContent({
  isAdminPage,
  isShopPage,
  isCheckoutPage,
  pathname,
}: Readonly<SiteMainContentProps>) {
  return (
    <main
      className={
        isAdminPage
          ? 'relative isolate flex-1 sm:h-dvh sm:overflow-hidden'
          : 'relative isolate flex-1'
      }
    >
      {isShopPage ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <SectionDecor pattern="dots" dotOpacity={0.16} mask={false} glowA="bg-lime-400/5" glowB="bg-cyan-500/5" />
          <div className="absolute inset-0 opacity-100">
            <SectionDecor pattern="dots" dotOpacity={0.36} glowA="bg-lime-400/6" glowB="bg-cyan-500/6" />
          </div>
        </div>
      ) : null}
      {isCheckoutPage ? (
        // Same dot-texture language as Shop, but dimmer and drifting diagonally
        // down-left — the payment form still needs to read as the trustworthy
        // focal point, not a busy background.
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <SectionDecor
            pattern="dots"
            dotOpacity={0.22}
            mask={false}
            animated
            glowA="bg-lime-400/6"
            glowB="bg-lime-400/4"
          />
        </div>
      ) : null}
      <div
        className={
          isAdminPage
            ? 'relative z-10 w-full sm:h-full'
            : 'relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10'
        }
      >
        <RouteTransition routeKey={pathname} className={isAdminPage ? 'h-full' : undefined}>
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </RouteTransition>
      </div>
    </main>
  )
}
