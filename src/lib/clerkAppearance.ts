import type { ComponentProps } from 'react'
import { SignIn } from '@clerk/tanstack-react-start'

type ClerkAppearance = ComponentProps<typeof SignIn>['appearance']

// Shared dark appearance for Clerk widgets (SignIn / SignUp) so the auth
// screens match the FITGEAR dark + lime system instead of Clerk's light default.
export const clerkDarkAppearance: ClerkAppearance = {
  variables: {
    colorPrimary: '#a3e635',
    colorBackground: '#0f172a',
    colorForeground: '#e2e8f0',
    colorMutedForeground: '#94a3b8',
    colorInput: '#0b1220',
    colorInputForeground: '#e2e8f0',
    colorDanger: '#fb7185',
    borderRadius: '0.9rem',
    fontFamily: 'Inter, "Segoe UI", sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    card: 'bg-slate-900 border border-white/[0.08] shadow-2xl shadow-black/40',
    headerTitle: 'text-white',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton:
      'border border-white/10 bg-white/[0.03] !text-slate-200 hover:bg-white/[0.06]',
    socialButtonsBlockButtonText: '!text-slate-200 font-medium',
    dividerLine: 'bg-white/10',
    dividerText: 'text-slate-400',
    formFieldLabel: 'text-slate-300',
    formButtonPrimary:
      'bg-lime-400 text-slate-900 hover:bg-lime-300 normal-case font-bold',
    footerActionText: 'text-slate-400',
    footerActionLink: 'text-lime-400 hover:text-lime-300',
    identityPreviewText: 'text-slate-200',
    formFieldInputShowPasswordButton: 'text-slate-400',
  },
}
