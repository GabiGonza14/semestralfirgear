import { UserProfile } from '@clerk/tanstack-react-start'
import { clerkDarkAppearance } from '../lib/clerkAppearance'

interface AccountPageProps {
  /**
   * Must match the router path this component is actually mounted at — Clerk's
   * `routing="path"` uses it to build URLs for its own internal sub-views
   * (security, sessions, etc.). Defaults to the customer route; the admin
   * profile route (see _site.admin.account.tsx) passes '/admin/account'.
   */
  path?: string
}

export function AccountPage({ path = '/account' }: AccountPageProps = {}) {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Cuenta personal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Perfil y seguridad</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Gestiona tu información personal, seguridad y preferencias de sesión.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Área principal con Clerk */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-white">Editar perfil</h3>
          <div className="[&_*]:!text-slate-100">
            <UserProfile routing="path" path={path} appearance={clerkDarkAppearance} />
          </div>
        </div>
      </div>
    </section>
  )
}

