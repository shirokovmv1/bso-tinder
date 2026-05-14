import type { KeyboardEvent, MouseEvent } from 'react'
import type { ApiReactionType, ApiUser } from '@/api/client'
import { getDisplayName, getDisplayPosition, getInitials, toneFor } from './profileHelpers'

interface CompactProfileCardProps {
  user: ApiUser
  delay: number
  reactionTypes: ApiReactionType[]
  sentReactionIds?: Set<string>
  pendingReactions: Record<string, boolean>
  isSelf: boolean
  onOpen: () => void
  onReact: (toUserId: string, reactionTypeId: string) => void
}

export default function CompactProfileCard({
  user,
  delay,
  reactionTypes,
  sentReactionIds,
  pendingReactions,
  isSelf,
  onOpen,
  onReact,
}: CompactProfileCardProps) {
  const displayName = getDisplayName(user)
  const position = getDisplayPosition(user)
  const counts = (user.reaction_counts ?? []).slice(0, 3)
  const visibleReactionTypes = reactionTypes.slice(0, 4)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpen()
  }

  const handleReaction = (event: MouseEvent<HTMLButtonElement>, reactionTypeId: string) => {
    event.stopPropagation()
    if (isSelf) return
    onReact(user.id, reactionTypeId)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Открыть анкету: ${displayName}`}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      style={{ animationDelay: `${delay}ms` }}
      className="fade-up w-full text-left glass-1 rounded-2xl p-3.5 shadow-card press-shrink ease-spring transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/60"
    >
      <div className="flex items-center gap-3.5">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/20">
          {user.avatar_url && !user.avatar_url.includes('dicebear.com') ? (
            <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div
              className="grid h-full w-full place-items-center text-[19px] font-black text-white"
              style={{ background: toneFor(user.id) }}
            >
              {getInitials(user)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-extrabold leading-tight">{displayName}</div>
          <div className="mt-0.5 truncate text-[12px] font-bold text-white/55">{position}</div>
        </div>

        <span className="shrink-0 text-2xl font-black text-white/30">›</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {visibleReactionTypes.map(reactionType => {
          const active = sentReactionIds?.has(reactionType.id)
          const reactionKey = `${user.id}:${reactionType.id}`
          const isPending = !!pendingReactions[reactionKey]

          return (
            <button
              key={reactionType.id}
              type="button"
              disabled={isSelf || isPending}
              onClick={(event) => handleReaction(event, reactionType.id)}
              className={`min-h-8 rounded-full border px-2.5 text-[13px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                  ? 'border-transparent bg-orange-500 text-white'
                  : 'border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/10'
              }`}
              aria-label={`${reactionType.label}: ${displayName}`}
            >
              {isPending ? '...' : reactionType.emoji}
            </button>
          )
        })}

        {isSelf && (
          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/45">
            Это вы
          </span>
        )}

        {counts.map(count => (
          <span
            key={count.reaction_type_id}
            className="rounded-full px-2 py-1 text-[11px] font-bold"
            style={{
              background: 'rgba(255,107,0,0.12)',
              border: '1px solid rgba(255,107,0,0.22)',
              color: 'rgba(255,200,120,0.9)',
            }}
          >
            {count.emoji} {count.count}
          </span>
        ))}
      </div>
    </div>
  )
}
