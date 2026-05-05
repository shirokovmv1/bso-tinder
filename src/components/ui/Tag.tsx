import type { HobbyTag } from '@/data/types'

interface Props {
  hobby: HobbyTag
  selected?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
  disabled?: boolean
}

export default function Tag({ hobby, selected = false, onClick, size = 'md', disabled = false }: Props) {
  const base = 'inline-flex items-center gap-1.5 rounded-[999px] font-body font-medium transition-all duration-200 select-none cursor-pointer active:scale-95'
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
  const stateClass = selected
    ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(255,107,0,0.35)]'
    : 'bg-graphite-700 text-graphite-300 hover:bg-graphite-600 hover:text-white'
  const disabledClass = disabled ? 'opacity-40 pointer-events-none' : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${sizeClass} ${stateClass} ${disabledClass}`}
    >
      <span>{hobby.emoji}</span>
      <span>{hobby.label}</span>
    </button>
  )
}
