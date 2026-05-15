import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, type ApiDepartment, type ApiDepartmentMatchGroup, type ApiMatchedUser, type ApiReactionType } from '@/api/client'
import BottomNav from '@/components/ui/BottomNav'
import DepartmentDonut, { type DonutSegment } from '@/components/match/DepartmentDonut'

const COLORS = ['#F59E7A', '#8EA4FF', '#6ED7B7', '#C4A7FF', '#F4A7C3', '#F2C879', '#7DD3C7', '#FCA5A5']

function colorFor(index: number) {
  return COLORS[index % COLORS.length]
}

function initials(name?: string | null) {
  return (name || '?').trim()[0]?.toUpperCase() || '?'
}

export default function MatchPage() {
  const appEnv = import.meta.env.VITE_APP_ENV ?? 'prod'
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [groups, setGroups] = useState<ApiDepartmentMatchGroup[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<ApiMatchedUser | null>(null)
  const [reactionTypes, setReactionTypes] = useState<ApiReactionType[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [emptyMessage, setEmptyMessage] = useState('')
  const [pendingReaction, setPendingReaction] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {})
    api.getReactionTypes().then(setReactionTypes).catch(() => {})
  }, [])

  useEffect(() => {
    return () => stopTimer()
  }, [])

  const runMatch = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    setEmptyMessage('')
    setSelectedMatch(null)
    setElapsed(0)
    stopTimer()
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const result = await api.computeMyMatches()
      setGroups(result.groups)
      setEmptyMessage(result.emptyMessage)
      const firstGroup = result.groups[0]
      setSelectedDepartment(firstGroup?.department ?? null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Не удалось выполнить подбор')
    } finally {
      setLoading(false)
      stopTimer()
    }
  }, [])

  const segments = useMemo<DonutSegment[]>(() => {
    const counts = new Map(groups.map(group => [group.department, group.count]))
    const source = departments.length
      ? departments
      : groups.map((group, i) => ({ id: group.department, name: group.department, sort_order: i, is_active: 1 }))

    return source.map((dept, index) => ({
      id: dept.id || dept.name,
      label: dept.name,
      count: counts.get(dept.name) ?? 0,
      color: colorFor(index),
    }))
  }, [departments, groups])

  const activeGroup = useMemo(
    () => groups.find(group => group.department === selectedDepartment) ?? null,
    [groups, selectedDepartment]
  )

  async function handleReaction(match: ApiMatchedUser, reactionTypeId: string) {
    const key = `${match.user.id}:${reactionTypeId}`
    if (pendingReaction) return
    setPendingReaction(key)
    try {
      await api.sendReaction(match.user.id, reactionTypeId)
    } finally {
      setPendingReaction(null)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-radial-orange overflow-y-auto scrollbar-none pb-28">
      <div className="mx-auto w-full max-w-[460px] px-3 pt-8 flex-1">
        <header className="text-center mb-4 fade-up">
          <div className="mx-auto mb-2 h-[52px] w-[52px] rounded-2xl bg-orange-500 flex items-center justify-center shadow-cta">
            <span className="text-white font-black text-[18px] tracking-tight">БСО</span>
          </div>
          <h1 className="text-[28px] font-black leading-[1.05] tracking-tight">Своя команда</h1>
          <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">строим команду</p>
          <div className={`inline-flex mt-2 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.08em] border ${
            appEnv === 'test'
              ? 'text-yellow-300 border-yellow-300/50 bg-yellow-500/10'
              : 'text-emerald-300 border-emerald-300/50 bg-emerald-500/10'
          }`}>{appEnv}</div>
        </header>

        {!!loadError && (
          <div className="glass-1 rounded-2xl p-4 border border-red-400/30 mb-5">
            <p className="text-[13px] font-bold text-red-300 mb-3">{loadError}</p>
            <button onClick={runMatch} className="px-3 py-2 rounded-full text-[12px] font-bold bg-orange-500/20 border border-orange-500/40 text-orange-300">
              Попробовать снова
            </button>
          </div>
        )}

        <div className="fade-up flex justify-center" style={{ animationDelay: '80ms' }}>
          <button
            type="button"
            onClick={runMatch}
            disabled={loading}
            className="match-cta-btn"
            aria-label="Запустить подбор"
          >
            {loading ? 'Ищем...' : 'МЭТЧ'}
          </button>
        </div>

        <div className="fade-up mt-4" style={{ animationDelay: '120ms' }}>
          <DepartmentDonut
            segments={segments}
            loading={loading}
            elapsedSeconds={elapsed}
            activeSegmentId={selectedDepartment}
            onSegmentClick={(segment) => {
              if (segment.count <= 0) return
              setSelectedDepartment(segment.label)
              setSelectedMatch(null)
            }}
          />
        </div>

        {!groups.length && !loading && !emptyMessage && (
          <p className="mt-5 text-center text-[13px] font-semibold text-white/45">
            Нажмите MATCH, чтобы найти коллег с общими интересами.
          </p>
        )}

        {loading && (
          <p className="mt-5 text-center text-[13px] font-bold text-orange-200">
            Подбор начинается заново с учётом вашей анкеты...
          </p>
        )}

        {!!emptyMessage && (
          <div className="mt-5 glass-1 rounded-2xl p-4 text-center">
            <p className="text-[14px] font-bold text-white/70">{emptyMessage}</p>
            <p className="mt-2 text-[13px] font-semibold text-white/50">
              Попробуйте расширить интересы, чтобы подбор стал точнее.
            </p>
            <Link
              to="/onboarding?step=interests"
              className="mt-3 inline-flex items-center justify-center rounded-full bg-orange-500 px-4 py-2 text-[13px] font-black text-white shadow-cta"
            >
              Расширить интересы
            </Link>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeGroup && (
            <motion.section
              key={activeGroup.department}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 space-y-3"
            >
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Отдел</div>
                <h2 className="text-[22px] font-black leading-tight tracking-tight break-words">{activeGroup.department}</h2>
              </div>

              {activeGroup.matches.map(match => (
                <MatchCard
                  key={match.user.id}
                  match={match}
                  selected={selectedMatch?.user.id === match.user.id}
                  reactionTypes={reactionTypes}
                  pendingReaction={pendingReaction}
                  onSelect={() => setSelectedMatch(prev => prev?.user.id === match.user.id ? null : match)}
                  onReact={(reactionTypeId) => handleReaction(match, reactionTypeId)}
                />
              ))}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  )
}

function MatchCard({ match, selected, reactionTypes, pendingReaction, onSelect, onReact }: {
  match: ApiMatchedUser
  selected: boolean
  reactionTypes: ApiReactionType[]
  pendingReaction: string | null
  onSelect: () => void
  onReact: (reactionTypeId: string) => void
}) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPitch, setAiPitch] = useState<string | null>(null)
  const [aiIcebreaker, setAiIcebreaker] = useState<string | null>(null)
  const [aiError, setAiError] = useState('')
  const [copied, setCopied] = useState(false)

  const icebreaker = aiIcebreaker ?? match.icebreaker
  const pitch = aiPitch ?? match.pitch

  async function handleAiMatch() {
    setAiLoading(true)
    setAiError('')
    try {
      const result = await api.getAiMatch(match.user.id)
      setAiPitch(result.description)
      setAiIcebreaker(result.icebreaker)
    } catch {
      setAiError('AI недоступен, попробуйте позже')
    } finally {
      setAiLoading(false)
    }
  }

  function handleCopyPitch() {
    navigator.clipboard.writeText(pitch).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="glass-1 rounded-2xl p-4 shadow-card">
      <button onClick={onSelect} className="w-full flex items-center gap-3 text-left">
        <div className="w-12 h-12 rounded-full grid place-items-center text-white font-black text-[18px] shrink-0 border border-white/15"
          style={{ background: 'linear-gradient(135deg,#FF8A33,#FF6B00)' }}>
          {match.user.avatar_url && !match.user.avatar_url.includes('dicebear.com')
            ? <img src={match.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            : initials(match.user.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-[16px] truncate">{match.user.name}</div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/50 truncate">
            {[match.user.department, match.user.position].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[12px] font-black text-orange-300">{match.score}%</span>
            <span className="text-[12px] font-bold text-white/55">{match.level.label}</span>
            {(match.aiEnhanced || aiPitch) && <span className="text-[12px]" title="AI-улучшено">✨</span>}
          </div>
        </div>
        <span className="text-white/30 text-2xl font-black shrink-0">{selected ? '⌃' : '›'}</span>
      </button>

      <div className="mt-3 text-[13px] font-semibold text-white/65 leading-relaxed">
        {pitch}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {match.sharedHobbies.slice(0, 6).map(hobby => (
          <span key={hobby.id} className="px-2.5 py-1 rounded-full text-[12px] font-bold bg-orange-500/15 border border-orange-500/30 text-orange-200">
            <span className="mr-1">{hobby.emoji}</span>{hobby.label}
          </span>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-4 mt-4 border-t border-white/10 space-y-3">

              {/* Icebreaker */}
              {!!icebreaker && (
                <div className="rounded-xl px-3 py-2 bg-orange-500/10 border border-orange-500/20">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-orange-300/70">Повод для разговора</div>
                  <div className="text-[13px] font-semibold text-white/80 mt-0.5">{icebreaker}</div>
                </div>
              )}

              {/* Кнопка AI-мэтч */}
              {!aiPitch && (
                <div>
                  <button
                    onClick={handleAiMatch}
                    disabled={aiLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold bg-orange-500/20 border border-orange-500/40 text-orange-200 hover:bg-orange-500/30 transition-all disabled:opacity-60"
                  >
                    <span>{aiLoading ? '⏳' : '✨'}</span>
                    <span>{aiLoading ? 'Анализируем...' : 'Полный мэтч'}</span>
                  </button>
                  {!!aiError && <p className="mt-1 text-[12px] text-red-400">{aiError}</p>}
                </div>
              )}

              {/* Бейдж */}
              {!!match.user.badge_title && (
                <div className="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Бейдж</div>
                  <div className="text-[14px] font-bold text-white/80">
                    <span className="mr-1">{match.user.badge_emoji}</span>{match.user.badge_title}
                  </div>
                </div>
              )}

              {/* Профиль — полное раскрытие */}
              {!!match.user.about_short && (
                <div className="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 mb-1">Моя суперсила</div>
                  <p className="text-[13px] font-semibold text-white/75 leading-relaxed">{match.user.about_short}</p>
                </div>
              )}

              {!!match.user.work_details && (
                <div className="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 mb-1">Моя страсть</div>
                  <p className="text-[13px] font-semibold text-white/75 leading-relaxed">{match.user.work_details}</p>
                </div>
              )}

              {!!match.user.current_interests && (
                <div className="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 mb-1">Сейчас увлечён(а)</div>
                  <p className="text-[13px] font-semibold text-white/75 leading-relaxed">{match.user.current_interests}</p>
                </div>
              )}

              {/* Питч с кнопкой копировать */}
              {!!match.user.pitch && (
                <div className="rounded-xl px-3 py-2 bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Питч</div>
                    <button
                      onClick={handleCopyPitch}
                      className="text-[11px] font-bold text-white/40 hover:text-white/70 transition-colors"
                    >
                      {copied ? '✓ Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <p className="text-[13px] font-semibold text-white/75 leading-relaxed">{match.user.pitch}</p>
                </div>
              )}

              {/* Реакции */}
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 mb-2">Отметить анкету</div>
                <div className="flex gap-2 flex-wrap">
                  {reactionTypes.map(rt => {
                    const key = `${match.user.id}:${rt.id}`
                    const isPending = pendingReaction === key
                    return (
                      <button
                        key={rt.id}
                        disabled={isPending}
                        onClick={() => onReact(rt.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold transition-all border glass-1 border-white/10 text-white/75 hover:bg-white/10 disabled:opacity-60"
                      >
                        <span>{rt.emoji}</span>
                        <span className="text-[12px]">{isPending ? '...' : rt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
