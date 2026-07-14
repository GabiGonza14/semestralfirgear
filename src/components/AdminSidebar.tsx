type AdminSection =
  | 'overview'
  | 'inventory'
  | 'categories'
  | 'orders'
  | 'users'
  | 'reviews'
  | 'audit'

interface AdminSidebarProps {
  active: AdminSection
  onChange: (section: AdminSection) => void
}

const sections: AdminSection[] = [
  'overview',
  'inventory',
  'categories',
  'orders',
  'users',
  'reviews',
  'audit',
]

const sectionLabels: Record<AdminSection, string> = {
  overview: 'Resumen',
  inventory: 'Inventario',
  categories: 'Categorias',
  orders: 'Ordenes',
  users: 'Usuarios',
  reviews: 'Reseñas',
  audit: 'Auditoria',
}

export function AdminSidebar({ active, onChange }: AdminSidebarProps) {
  return (
    <aside className="self-start rounded-2xl border border-white/10 bg-slate-900/70 p-4 lg:sticky lg:top-20">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-lime-400">Admin</p>
      <div className="space-y-2">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => onChange(section)}
            className={`w-full rounded-xl px-3 py-2 text-left capitalize ${
              active === section
                ? 'bg-lime-400 text-slate-950'
                : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            {sectionLabels[section]}
          </button>
        ))}
      </div>
    </aside>
  )
}
