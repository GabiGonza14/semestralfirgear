import { createFileRoute } from '@tanstack/react-router'
import { PostLoginRedirect } from '../lib/PostLoginRedirect'

// `/post-login` — forceRedirectUrl target for Clerk's <SignIn>/<SignUp> (see
// LoginPage/SignUpPage). Not part of the original AppRouter.tsx; added to
// avoid flashing the full LandingPage at every sign-in while the backend role
// sync resolves (see PostLoginRedirect for the reasoning).
export const Route = createFileRoute('/_site/post-login')({
  component: PostLoginRedirect,
})
