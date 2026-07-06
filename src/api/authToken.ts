// Bridges Clerk's React-only `useAuth().getToken` into apiClient.ts, which is
// a plain module outside the component tree. AuthProvider registers the
// getter as soon as Clerk resolves a session; reading `window.Clerk` directly
// instead races the post-login redirect and can momentarily return no token.
type TokenGetter = () => Promise<string | null>

let getTokenFn: TokenGetter | null = null

export function setAuthTokenGetter(fn: TokenGetter | null) {
  getTokenFn = fn
}

export async function getAuthToken(): Promise<string | null> {
  if (!getTokenFn) return null
  try {
    return await getTokenFn()
  } catch {
    return null
  }
}
