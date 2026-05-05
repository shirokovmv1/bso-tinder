import type { Badge } from '@/data/types'

interface Props {
  badge: Badge
  size?: 'sm' | 'lg'
  shimmer?: boolean
}

export default function BadgeCard({ badge, size = 'sm', shimmer = false }: Props) {
  const isLg = size === 'lg'

  return (
    <div
      className={`relative inline-flex flex-col items-center gap-1 rounded-[16px] border overflow-hidden
        ${isLg ? 'px-6 py-5' : 'px-3 py-2'}
        bg-graphite-700 border-graphite-600`}
      style={{ boxShadow: `0 4px 20px ${badge.color}33` }}
    >
      {shimmer && (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
      <span className={isLg ? 'text-5xl' : 'text-2xl'}>{badge.emoji}</span>
      <span
        className={`font-display font-bold text-center leading-tight ${isLg ? 'text-base' : 'text-xs'}`}
        style={{ color: badge.color }}
      >
        {badge.title}
      </span>
      {isLg && (
        <span className="text-xs text-graphite-300 text-center mt-1">{badge.description}</span>
      )}
    </div>
  )
}
