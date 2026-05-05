interface Props {
  value: string
  onChange: (dept: string) => void
  departments: string[]
}

export default function FilterChips({ value, onChange, departments }: Props) {
  const tabs = ['Все', ...departments]
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
      {tabs.map(dept => (
        <button
          key={dept}
          type="button"
          onClick={() => onChange(dept)}
          className={`shrink-0 px-4 py-1.5 rounded-[999px] text-xs font-body font-medium transition-all duration-200 active:scale-95
            ${value === dept
              ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(255,107,0,0.35)]'
              : 'bg-graphite-700 text-graphite-300 hover:bg-graphite-600 hover:text-white'
            }`}
        >
          {dept}
        </button>
      ))}
    </div>
  )
}
