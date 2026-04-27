interface SearchBarProps {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="Buscar producto..."
      className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 shadow-sm outline-none transition focus:border-lime-400 focus:ring-4 focus:ring-lime-100"
    />
  )
}
