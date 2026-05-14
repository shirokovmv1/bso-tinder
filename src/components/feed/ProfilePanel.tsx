import { useEffect, type MouseEvent } from 'react'
import { motion } from 'framer-motion'
import type { ApiReactionType, ApiUser } from '@/api/client'
import {
  BASE_COLORS,
  BOOK_GENRES,
  FILM_GENRES,
  MUSIC_GENRES,
  ZODIAC_SIGNS,
  findProfileOption,
  getSelectedOptions,
  type ProfileOption,
} from '@/data/profileOptions'
import { getDisplayName, getDisplayPosition, getInitials, toneFor } from './profileHelpers'

interface ProfilePanelProps {
  user: ApiUser
  reactionTypes: ApiReactionType[]
  sentReactionIds?: Set<string>
  pendingReactions: Record<string, boolean>
  isSelf: boolean
  onClose: () => void
  onReact: (toUserId: string, reactionTypeId: string) => void
}

function TextSection({ title, value }: { title: string; value?: string | null }) {
  if (!value?.trim()) return null
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">{title}</div>
      <p className="text-[14px] font-semibold leading-relaxed text-white/75">{value}</p>
    </section>
  )
}

function OptionSection({ title, raw, options }: { title: string; raw?: string | null; options: ProfileOption[] }) {
  const selected = getSelectedOptions(raw, options)
  if (!selected.length) return null
  return (
    <section>
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">{title}</div>
      <div className="flex flex-wrap gap-2">
        {selected.map(option => (
          <span key={option.key} className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[13px] font-bold text-white/85">
            <span className="mr-1">{option.emoji}</span>{option.label}
          </span>
        ))}
      </div>
    </section>
  )
}

function ZodiacSection({ value }: { value?: string | null }) {
  const option = findProfileOption(value, ZODIAC_SIGNS)
  if (!option) return null
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Знак зодиака</div>
      <p className="text-[14px] font-semibold leading-relaxed text-white/75">
        <span className="mr-1">{option.emoji}</span>{option.label}
      </p>
    </section>
  )
}

function ColorSection({ value }: { value?: string | null }) {
  if (!value) return null
  const option = findProfileOption(value, BASE_COLORS)
  const hex = option?.hex ?? (/^#[0-9a-f]{6}$/i.test(value) ? value : '')
  const label = option ? option.label : hex ? 'Свой цвет' : value
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Любимый цвет</div>
      <div className="flex items-center gap-2 text-[14px] font-semibold leading-relaxed text-white/75">
        {hex && <span className="h-5 w-5 rounded-full border border-white/25" style={{ backgroundColor: hex }} />}
        <span>{option?.emoji ? `${option.emoji} ` : ''}{label}</span>
      </div>
    </section>
  )
}

export default function ProfilePanel({
  user,
  reactionTypes,
  sentReactionIds,
  pendingReactions,
  isSelf,
  onClose,
  onReact,
}: ProfilePanelProps) {
  const displayName = getDisplayName(user)
  const position = getDisplayPosition(user)
  const hobbies = (user.hobbies ?? []).filter(hobby => hobby.parent_id !== null)
  const counts = user.reaction_counts ?? []

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end bg-black/65"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="safe-bottom max-h-[calc(100dvh-24px)] w-full overflow-y-auto rounded-t-[32px] border border-white/15 bg-graphite-800/95 p-5 pb-8 shadow-card-lg backdrop-blur-glass"
        onClick={handlePanelClick}
      >
        <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-white/20" />

        <div className="mb-5 flex items-start gap-4">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/20">
            {user.avatar_url && !user.avatar_url.includes('dicebear.com') ? (
              <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div
                className="grid h-full w-full place-items-center text-[25px] font-black text-white"
                style={{ background: toneFor(user.id) }}
              >
                {getInitials(user)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <h2 className="text-[22px] font-black leading-tight tracking-tight">{displayName}</h2>
            <p className="mt-1 text-[13px] font-bold text-white/60">{position}</p>
            {!!user.badge_title && (
              <div className="mt-3 inline-flex max-w-full items-center rounded-full border border-orange-500/30 bg-orange-500/15 px-3 py-1 text-[12px] font-bold text-orange-200">
                <span className="mr-1">{user.badge_emoji}</span>
                <span className="truncate">{user.badge_title}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.08] text-[22px] font-bold leading-none text-white/75 transition hover:bg-white/15"
            aria-label="Закрыть анкету"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <TextSection title="Моя суперсила" value={user.about_short} />
          <TextSection title="Моя страсть" value={user.work_details} />
          <TextSection title="Мои проекты" value={user.current_interests} />
          <TextSection title="Питч" value={user.pitch} />

          {hobbies.length > 0 && (
            <section>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Интересы</div>
              <div className="flex flex-wrap gap-2">
                {hobbies.map(hobby => (
                  <span key={hobby.id} className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[13px] font-bold text-white/85">
                    <span className="mr-1">{hobby.emoji}</span>{hobby.label}
                  </span>
                ))}
              </div>
            </section>
          )}

          <OptionSection title="Нравятся жанры фильмов" raw={user.last_movies} options={FILM_GENRES} />
          <OptionSection title="Нравятся жанры книг" raw={user.last_books} options={BOOK_GENRES} />
          <OptionSection title="Нравится музыка" raw={user.last_songs} options={MUSIC_GENRES} />
          <ZodiacSection value={user.zodiac_sign} />
          <ColorSection value={user.fav_color} />

          {counts.length > 0 && (
            <section>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Уже отметили</div>
              <div className="flex flex-wrap gap-2">
                {counts.map(count => (
                  <span key={count.reaction_type_id} className="rounded-full border border-orange-500/25 bg-orange-500/15 px-3 py-1.5 text-[13px] font-bold text-orange-200">
                    {count.emoji} {count.count}
                  </span>
                ))}
              </div>
            </section>
          )}

          {reactionTypes.length > 0 && (
            <section>
              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Реакция</div>
              {isSelf ? (
                <p className="text-[13px] font-semibold text-white/45">На свою анкету реакции не ставятся.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {reactionTypes.map(reactionType => {
                    const active = sentReactionIds?.has(reactionType.id)
                    const reactionKey = `${user.id}:${reactionType.id}`
                    const isPending = !!pendingReactions[reactionKey]

                    return (
                      <button
                        key={reactionType.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => onReact(user.id, reactionType.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? 'border-transparent bg-orange-500 text-white'
                            : 'glass-1 border-white/10 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span>{reactionType.emoji}</span>
                        <span className="text-[12px]">{isPending ? '...' : reactionType.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
