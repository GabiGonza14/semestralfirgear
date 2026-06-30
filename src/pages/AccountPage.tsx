import { UserProfile } from '@clerk/clerk-react'

export function AccountPage() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-lime-400">Cuenta personal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Perfil y seguridad</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Gestiona tu informacion personal, seguridad y preferencias de sesion en FITGEAR.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar con información rápida */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-3xl border border-lime-400/30 bg-gradient-to-br from-lime-400/10 to-emerald-400/5 p-6">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-lime-400/20">
              <svg className="h-6 w-6 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-lime-400">
              Informacion de tu cuenta
            </h3>
            <p className="mt-3 text-xs text-slate-400">
              Todos tus datos están seguros y encriptados. Usa los campos abajo para actualizar tu información personal.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6">
            <h4 className="text-sm font-semibold text-white">Consejos de seguridad</h4>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li className="flex gap-2">
                <span className="mt-1 flex-shrink-0 text-lime-500">✓</span>
                <span>Usa una contraseña única y segura</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 flex-shrink-0 text-lime-500">✓</span>
                <span>Activa autenticación de dos factores</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 flex-shrink-0 text-lime-500">✓</span>
                <span>Revisa sesiones activas regularmente</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Área principal con Clerk */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold text-white">Editar perfil</h3>
          <div className="[&_*]:!text-slate-100">
            <UserProfile
              routing="path"
              path="/account"
              appearance={{
                variables: {
                  colorPrimary: '#a3e635',
                  colorBackground: '#0f172a',
                  colorText: '#e2e8f0',
                  colorInputBackground: '#0b1220',
                  borderRadius: '0.9rem',
                },
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-slate-800/50 border border-white/10',
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Sección de recursos y soporte */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/30 p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
          ¿Necesitas ayuda?
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* TODO: enlazar a la ruta/recurso real de soporte cuando exista. */}
          <button type="button" className="group flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition hover:border-lime-400/30 hover:bg-lime-400/10">
            <div className="mt-1 flex-shrink-0 text-lime-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-100 group-hover:text-lime-400">Centro de soporte</p>
              <p className="text-xs text-slate-400">Consulta preguntas frecuentes y documentación</p>
            </div>
          </button>
          {/* TODO: enlazar a la ruta/recurso real de soporte cuando exista. */}
          <button type="button" className="group flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-left transition hover:border-lime-400/30 hover:bg-lime-400/10">
            <div className="mt-1 flex-shrink-0 text-lime-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-slate-100 group-hover:text-lime-400">Contactar soporte</p>
              <p className="text-xs text-slate-400">Escribe a nuestro equipo de atención</p>
            </div>
          </button>
        </div>
      </div>
    </section>
  )
}

