import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { api, type ApiUser, type ApiReactionType } from '@/api/client'
import { useAppStore, selectFilteredEmployees } from '@/store/useAppStore'
import CompactProfileCard from '@/components/feed/CompactProfileCard'
import ProfilePanel from '@/components/feed/ProfilePanel'
import BottomNav from '@/components/ui/BottomNav'

export default function FeedPage() {
  const appEnv = import.meta.env.VITE_APP_ENV ?? 'prod'
  const { setEmployees, setSearchQuery, searchQuery, currentUser } = useAppStore()
  const filtered = useAppStore(selectFilteredEmployees)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'offline'>('checking')
  const [selected, setSelected] = useState<ApiUser | null>(null)
  const [reactionTypes, setReactionTypes] = useState<ApiReactionType[]>([])
  const [sentReactions, setSentReactions] = useState<Record<string, Set<string>>>({})
  const [pendingReactions, setPendingReactions] = useState<Record<string, boolean>>({})
  const navigate = useNavigate()

  const loadFeedData = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const users = await api.getUsers()
      setEmployees(users)
      api.getReactionTypes().then(setReactionTypes).catch(() => {})
      api.getMyReactionsSent().then(rows => {
        const map: Record<string, Set<string>> = {}
        for (const r of rows) {
          if (!map[r.to_user_id]) map[r.to_user_id] = new Set()
          map[r.to_user_id].add(r.emoji_type)
        }
        setSentReactions(map)
      }).catch(() => {})
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить ленту')
    } finally {
      setLoading(false)
    }
  }, [setEmployees])

  useEffect(() => {
    loadFeedData()
  }, [loadFeedData])

  useEffect(() => {
    let active = true
    const checkHealth = async () => {
      try {
        await api.getHealth()
        if (active) setHealthStatus('ok')
      } catch {
        if (active) setHealthStatus('offline')
      }
    }
    checkHealth()
    const timer = window.setInterval(checkHealth, 30000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const handleReaction = useCallback(async (toUserId: string, typeId: string) => {
    if (toUserId === currentUser?.id) return
    const key = `${toUserId}:${typeId}`
    if (pendingReactions[key]) return
    setPendingReactions(prev => ({ ...prev, [key]: true }))
    try {
      const res = await api.sendReaction(toUserId, typeId)
      setSentReactions(prev => {
        const next = { ...prev }
        if (!next[toUserId]) next[toUserId] = new Set()
        else next[toUserId] = new Set(next[toUserId])
        if (res.action === 'added') next[toUserId].add(typeId)
        else next[toUserId].delete(typeId)
        return next
      })
    } catch { /* ignore */ }
    finally {
      setPendingReactions(prev => ({ ...prev, [key]: false }))
    }
  }, [currentUser?.id, pendingReactions])

  const handleOpenProfile = useCallback((user: ApiUser) => {
    setSelected(user)
    api.getUser(user.id)
      .then(fullUser => {
        setSelected(current => current?.id === user.id ? fullUser : current)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-full flex flex-col bg-page-deep">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-glass border-b border-white/5" style={{ background: 'rgba(35,35,35,0.90)' }}>
        <div className="mx-auto max-w-md px-5 pt-12 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 grid place-items-center shadow-cta">
              <span className="text-white font-black text-[12px] tracking-tight">БСО</span>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-black tracking-tight">Своя команда</div>
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-white/55">строим команду</div>
            </div>
            <div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.08em] border ${
              appEnv === 'test'
                ? 'text-yellow-300 border-yellow-300/50 bg-yellow-500/10'
                : 'text-emerald-300 border-emerald-300/50 bg-emerald-500/10'
            }`}>
              {appEnv}
            </div>
            <div className={`text-[10px] font-bold ${healthStatus === 'ok' ? 'text-emerald-300' : healthStatus === 'offline' ? 'text-red-300' : 'text-white/50'}`}>
              {healthStatus === 'ok' ? 'Сервер OK' : healthStatus === 'offline' ? 'Нет связи' : 'Проверка...'}
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 rounded-full glass-1 grid place-items-center press-shrink ease-spring transition"
          >
            <span className="text-white/70 text-[16px]">⚙</span>
          </button>
        </div>

        {/* Search */}
        <div className="mx-auto max-w-md px-5 pb-2">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5"/>
              <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Найти коллегу..."
              className="w-full h-10 glass-1 rounded-full pl-10 pr-4 text-[14px] font-semibold text-white placeholder:text-white/30 outline-none"
            />
          </div>
        </div>

        <div className="mx-auto max-w-md px-5 pb-3">
          <p className="text-[11px] font-bold text-white/35">Ищите по имени, фамилии или должности</p>
        </div>
      </header>

      {/* Cards */}
      <div className="mx-auto w-full max-w-md px-5 py-4 pb-28 flex-1 space-y-3 overflow-y-auto scrollbar-none">
        {!!loadError && (
          <div className="glass-1 rounded-2xl p-4 border border-red-400/30">
            <p className="text-[13px] font-bold text-red-300 mb-3">{loadError}</p>
            <button
              onClick={loadFeedData}
              className="px-3 py-2 rounded-full text-[12px] font-bold bg-orange-500/20 border border-orange-500/40 text-orange-300"
            >
              Попробовать снова
            </button>
          </div>
        )}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-1 rounded-2xl p-3.5 h-24 animate-pulse" />
        ))}
        {!loading && filtered.map((p, i) => (
          <CompactProfileCard
            key={p.id}
            user={p}
            delay={i * 40}
            reactionTypes={reactionTypes}
            sentReactionIds={sentReactions[p.id]}
            pendingReactions={pendingReactions}
            isSelf={p.id === currentUser?.id}
            onOpen={() => handleOpenProfile(p)}
            onReact={handleReaction}
          />
        ))}
        {!loading && !filtered.length && (
          <div className="py-12 text-center">
            <p className="text-[13px] font-bold text-white/45">
              {searchQuery.trim()
                ? 'Ничего не нашли. Проверьте имя, фамилию или должность.'
                : 'Лента пока пуста'}
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="mt-3 rounded-full border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-[12px] font-bold text-orange-300"
              >
                Сбросить поиск
              </button>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Employee panel */}
      <AnimatePresence>
        {selected && (
          <ProfilePanel
            user={selected}
            reactionTypes={reactionTypes}
            sentReactionIds={sentReactions[selected.id]}
            pendingReactions={pendingReactions}
            isSelf={selected.id === currentUser?.id}
            onClose={() => setSelected(null)}
            onReact={handleReaction}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
