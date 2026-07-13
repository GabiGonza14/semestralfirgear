import { AuthenticateWithRedirectCallback } from '@clerk/tanstack-react-start'

export function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback signInForceRedirectUrl="/shop" />
}
