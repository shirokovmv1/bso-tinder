import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { api, type ApiUser, type ApiDepartment } from '@/api/client'
import { useAppStore, selectFilteredEmployees } from '@/store/useAppStore'
import BottomNav from '@/components/ui/BottomNav'

const TONES = [
  'linear-gradient(135deg,#FF8A33,#FF6B00)',
  'linear-gradient(135deg,#5b6cff,#3a4be0)',
  'linear-gradient(135deg,#34D399,#0EA371)',
  'linear-gradient(135deg,#B388FF,#7C4DFF)',
  'linear-gradient(135deg,#FF8FAB,#E94B7C)',
]
const toneFor = (id: string) => TONES[id.charCodeAt(0) % TONES.length]

export default function FeedPage() {
  const { setEmployees, setSearchQuery, setDepartmentFilter, searchQuery, departmentFilter } = useAppStore()
  const filtered = useAppStore(selectFilteredEmployees)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ApiUser | null>(null)
  const [depts, setDepts] = useState<ApiDepartment[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    api.getUsers()
      .then(setEmployees)
      .finally(() => setLoading(false))
    api.getDepartments().then(setDepts).catch(() => {})
  }, [setEmployees])

  const deptTabs = ['Все', ...depts.map(d => d.name)]

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

        {/* Dept tabs — динамические из БД */}
        <div className="mx-auto max-w-md px-5 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
          {deptTabs.map(d => (
            <button
              key={d}
              onClick={() => setDepartmentFilter(d)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-bold ease-spring press-shrink transition-all border ${
                departmentFilter === d
                  ? 'bg-white text-graphite-900 border-transparent'
                  : 'glass-1 text-white/70'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </header>

      {/* Cards */}
      <div className="mx-auto w-full max-w-md px-5 py-4 pb-28 flex-1 space-y-3 overflow-y-auto scrollbar-none">
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-1 rounded-2xl p-3.5 h-24 animate-pulse" />
        ))}
        {!loading && filtered.map((p, i) => (
          <PersonCard key={p.id} user={p} delay={i * 40} onClick={() => setSelected(p)} />
        ))}
        {!loading && !filtered.length && (
          <p className="text-center py-12 text-white/40 text-[13px] font-bold">Никого не нашли</p>
        )}
      </div>

      <BottomNav />

      {/* Employee modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-end"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full glass-3 rounded-t-[32px] p-6 pb-10"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-full grid place-items-center text-white font-black text-[30px] border border-white/20"
                  style={{ background: toneFor(selected.id) }}>
                  {(selected.name ?? '?')[0]}
                </div>
                <div>
                  <h2 className="font-black text-[20px] tracking-tight">{selected.name}</h2>
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/50 mt-1">{selected.department}</p>
                  {selected.pitch && (
                    <p className="text-[12px] text-white/60 mt-1 italic">{selected.pitch}</p>
                  )}
                </div>
                <button
                  onClick={() => { navigate('/match'); setSelected(null) }}
                  className="ml-auto px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 text-[13px] font-bold"
                >
                  Мэтч ↗
                </button>
              </div>
              {selected.hobbies?.filter(h => h.parent_id !== null).length ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40 mb-3">Интересы</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.hobbies.filter(h => h.parent_id !== null).map(h => (
                      <span key={h.id} className="px-3 py-1.5 rounded-full text-[13px] font-bold glass-1 text-white/85">
                        <span className="mr-1">{h.emoji}</span>{h.label}
                      </span>
                    ))}
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PersonCard({ user, delay, onClick }: { user: ApiUser; delay: number; onClick: () => void }) {
  const hobbies = (user.hobbies ?? []).filter(h => h.parent_id !== null).slice(0, 4)
  return (
    <button
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className="fade-up w-full text-left glass-1 rounded-2xl p-3.5 shadow-card flex items-center gap-3.5 press-shrink ease-spring transition-all hover:bg-white/10"
    >
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full grid place-items-center text-white font-black text-[22px] border border-white/20"
          style={{ background: toneFor(user.id) }}>
          {(user.name ?? '?')[0]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-[16px] leading-tight truncate">{user.name}</div>
        <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-white/55 mt-0.5">{user.department}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {hobbies.map(h => (
            <span key={h.id} className="text-[11px] font-bold bg-white/10 border border-white/10 px-2 py-0.5 rounded-full text-white/85">
              <span className="mr-0.5">{h.emoji}</span>{h.label}
            </span>
          ))}
        </div>
      </div>
      <span className="text-white/30 text-2xl font-black shrink-0">›</span>
    </button>
  )
}
