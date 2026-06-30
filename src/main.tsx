import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './lib/gsap'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPublishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment variables.')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ClerkProvider
        publishableKey={clerkPublishableKey}
        signInUrl="/login"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/"
        signUpFallbackRedirectUrl="/"
        afterSignOutUrl="/"
      >
        <App />
      </ClerkProvider>
    </QueryClientProvider>
  </StrictMode>,
)
