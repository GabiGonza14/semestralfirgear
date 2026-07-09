import { createFileRoute } from '@tanstack/react-router'
import { SignUpPage } from '../../src/pages/SignUpPage'

// `/sign-up/$` — splat route catching Clerk's internal <SignUp routing="path">
// sub-views, same reasoning as login.$.tsx.
export const Route = createFileRoute('/sign-up/$')({
  component: SignUpPage,
})
