import type { ProductSize, SizeLabel } from '../../types'

interface ProductSizeSelectorProps {
  sizes: ProductSize[]
  selectedSize: SizeLabel | null
  onSelect: (label: SizeLabel, stock: number) => void
}

function chipClass(isSelected: boolean, isOutOfStock: boolean) {
  if (isSelected) {
    return 'border-lime-400 bg-lime-400 text-slate-900'
  }
  if (isOutOfStock) {
    return 'cursor-not-allowed border-white/10 text-slate-600 line-through'
  }
  return 'border-white/15 text-slate-200 hover:border-lime-400/50 hover:text-white'
}

export function ProductSizeSelector({ sizes, selectedSize, onSelect }: Readonly<ProductSizeSelectorProps>) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-300">
        Talla{selectedSize ? `: ${selectedSize}` : ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => {
          const isOutOfStock = size.stock <= 0
          const isSelected = size.label === selectedSize
          return (
            <button
              key={size.label}
              type="button"
              onClick={() => onSelect(size.label, size.stock)}
              disabled={isOutOfStock}
              aria-pressed={isSelected}
              className={`inline-flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-bold transition ${chipClass(isSelected, isOutOfStock)}`}
            >
              {size.label}
            </button>
          )
        })}
      </div>
      {selectedSize ? null : <p className="text-xs text-slate-500">Selecciona una talla para continuar.</p>}
    </div>
  )
}
