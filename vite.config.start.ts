import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

// Dedicated Vite config for the NEW TanStack Start (SSR) entrypoint — kept
// entirely separate from the existing SPA's `vite.config.ts` so both stay
// buildable side by side during the phased migration (#107).
//
// The whole Start app lives under `app/` (srcDirectory) so it never collides
// with the existing SPA in `src/` — in particular `src/routes/AppRouter.tsx`
// (react-router) would otherwise be picked up by Start's file-based route
// scanner. Start scans `app/routes/**` instead and generates
// `app/routeTree.gen.ts`.
export default defineConfig({
  server: {
    port: 3000,
  },
  // Preview (production SSR) server port.
  preview: {
    port: 3000,
  },
  // Isolate the Start build output from the existing SPA's `dist/` so the two
  // `vite build`s never clobber each other (the SPA build empties `dist/`).
  build: {
    outDir: 'dist-start',
  },
  // Phase 2 coexistence shims: the shared SPA components (src/**) import from
  // 'react-router-dom' and '@clerk/clerk-react'. For the Start (SSR) build ONLY,
  // resolve those package names to TanStack-backed adapters so the same source
  // renders under TanStack Router + the TanStack Start Clerk SDK. The SPA build
  // (vite.config.ts) is untouched and keeps the real packages. Exact-match
  // regexes so deep imports (e.g. 'react-router-dom/server') are never caught.
  resolve: {
    alias: [
      {
        find: /^react-router-dom$/,
        replacement: fileURLToPath(new URL('./app/compat/react-router-shim.tsx', import.meta.url)),
      },
      {
        find: /^@clerk\/clerk-react$/,
        replacement: fileURLToPath(new URL('./app/compat/clerk-react-shim.tsx', import.meta.url)),
      },
    ],
  },
  plugins: [
    tanstackStart({
      srcDirectory: 'app',
    }),
    // React's Vite plugin MUST come after TanStack Start's plugin.
    viteReact(),
  ],
})
