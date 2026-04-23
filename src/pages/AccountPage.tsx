import { UserProfile } from '@clerk/clerk-react'
import { SectionTitle } from '../components/SectionTitle'

export function AccountPage() {
  return (
    <section className="space-y-6">
      <SectionTitle
        eyebrow="Cuenta"
        title="Perfil del usuario"
        description="Gestiona tu sesion, seguridad y datos personales con Clerk dentro de FITGEAR."
      />
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 sm:p-6">
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
          }}
        />
      </div>
    </section>
  )
}
