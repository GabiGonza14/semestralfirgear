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
    </section>
  )
}

