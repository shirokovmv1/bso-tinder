interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBar({ value, onChange, placeholder = 'Найти сотрудника...' }: Props) {
  return (
    <div className="relative">
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-graphite-400 pointer-events-none"
        width="18" height="18" viewBox="0 0 24 24" fill="none"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 bg-graphite-700 rounded-[16px] pl-11 pr-4 text-sm text-white placeholder:text-graphite-400
          border border-transparent focus:border-orange-500 focus:outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center
            text-graphite-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  )
}
