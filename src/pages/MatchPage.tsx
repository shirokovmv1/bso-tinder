import { useEffect, useRef, useState } from 'react'
import { motion, animate } from 'framer-motion'
import { api, type ApiUser } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import BottomNav from '@/components/ui/BottomNav'

const TONES = [
  'linear-gradient(135deg,#FF8A33,#FF6B00)',
  'linear-gradient(135deg,#5b6cff,#3a4be0)',
  'linear-gradient(135deg,#34D399,#0EA371)',
  'linear-gradient(135deg,#B388FF,#7C4DFF)',
  'linear-gradient(135deg,#FF8FAB,#E94B7C)',
]
const toneFor = (id: string) => TONES[id.charCodeAt(0) % TONES.length]

export default function MatchPage() {
  const { matchCandidates, matchResult, setMatchCandidate, setMatchResult, clearMatch } = useAppStore()
  const [employees, setEmployees] = useState<ApiUser[]>([])
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null)
  const [loading, setLoading] = useState(false)

  const [a, b] = matchCandidates

  useEffect(() => { api.getUsers().then(setEmployees) }, [])

  useEffect(() => {
    if (a && b && !matchResult) {
      setLoading(true)
      api.computeMatch(a.id, b.id)
        .then(setMatchResult)
        .finally(() => setLoading(false))
    }
  }, [a, b, matchResult, setMatchResult])

  return (
    <div className="min-h-full flex flex-col bg-radial-orange overflow-y-auto scrollbar-none pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-14 flex-1">
        <h1 className="text-[34px] font-black leading-[1.05] tracking-tight mb-2 fade-up">
          {matchResult ? <>Вы — <span className="text-orange-500">команда</span></> : 'Найти совпадение'}
        </h1>
        <p className="text-white/55 text-[15px] font-medium mb-8 fade-up" style={{ animationDelay: '60ms' }}>
          {matchResult ? 'Посмотрите, что вас объединяет' : 'Выберите двух коллег для сравнения'}
        </p>

        {/* Слоты */}
        <div className="relative flex items-center justify-between gap-3 mb-8 fade-up" style={{ animationDelay: '120ms' }}>
          <SlotCard user={a} onPick={() => setPickerSlot(0)} onClear={() => { setMatchCandidate(0, null); setMatchResult(null) }} />

          {matchResult ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.3 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <CompatRing score={matchResult.score} />
            </motion.div>
          ) : (
            <div className="w-10 h-10 rounded-full glass-1 grid place-items-center shrink-0">
              <span className="text-white/40 font-black text-[18px]">+</span>
            </div>
          )}

          <SlotCard user={b} onPick={() => setPickerSlot(1)} onClear={() => { setMatchCandidate(1, null); setMatchResult(null) }} />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}

        {matchResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="space-y-5">
            {/* Имена */}
            <div className="flex justify-between px-2">
              <div className="text-center w-[120px]">
                <div className="font-extrabold text-[15px] leading-tight truncate">{a?.name}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50 mt-0.5">{a?.department}</div>
              </div>
              <div className="text-center w-[120px]">
                <div className="font-extrabold text-[15px] leading-tight truncate">{b?.name}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/50 mt-0.5">{b?.department}</div>
              </div>
            </div>

            {/* Общие теги */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55 mb-2">
                {matchResult.sharedHobbies.length > 0
                  ? `${matchResult.sharedHobbies.length} общих интересов`
                  : 'нет общих интересов — но это шанс'}
              </div>
              <div className="flex flex-wrap gap-2">
                {matchResult.sharedHobbies.map(h => (
                  <span key={h.id} className="text-[13px] font-bold bg-orange-500/15 border border-orange-500/40 text-orange-300 px-3 py-1.5 rounded-full">
                    <span className="mr-1">{h.emoji}</span>{h.label}
                  </span>
                ))}
                {!matchResult.sharedHobbies.length && (
                  <span className="text-[13px] font-bold glass-1 text-white/70 px-3 py-1.5 rounded-full">противоположности притягиваются</span>
                )}
              </div>
            </div>

            {/* Icebreaker */}
            <div className="glass-3 rounded-2xl p-5 shadow-card relative overflow-hidden">
              <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,107,0,.4), transparent 70%)' }} />
              <div className="relative">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500 mb-2 flex items-center gap-1.5">
                  <span>🔥</span><span>Айсбрейкер</span>
                </div>
                <div className="font-extrabold text-[18px] leading-snug">{matchResult.icebreaker}</div>
                <div className="text-[11px] font-semibold text-white/40 mt-3">на основе ваших общих интересов</div>
              </div>
            </div>

            {/* Reset */}
            <button onClick={clearMatch}
              className="w-full py-4 glass-1 rounded-2xl text-[15px] font-extrabold text-white/70 press-shrink ease-spring transition">
              Попробовать другую пару
            </button>
          </motion.div>
        )}
      </div>

      <BottomNav />

      {/* Picker modal */}
      {pickerSlot !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end" onClick={() => setPickerSlot(null)}>
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-full glass-3 rounded-t-[32px] p-6 pb-10 max-h-[75vh] overflow-y-auto scrollbar-none"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5" />
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50 mb-4">Выберите сотрудника</p>
            <div className="space-y-2">
              {employees.filter(e => e.id !== matchCandidates[pickerSlot === 0 ? 1 : 0]?.id).map(e => (
                <button key={e.id} onClick={() => { setMatchCandidate(pickerSlot, e); setPickerSlot(null) }}
                  className="w-full flex items-center gap-3 glass-1 rounded-2xl p-3 press-shrink ease-spring transition hover:bg-white/10">
                  <div className="w-10 h-10 rounded-full grid place-items-center text-white font-black text-[16px] shrink-0"
                    style={{ background: toneFor(e.id) }}>
                    {(e.name ?? '?')[0]}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="font-bold text-[15px] truncate">{e.name}</div>
                    <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider">{e.department}</div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function SlotCard({ user, onPick, onClear }: { user: ApiUser | null; onPick: () => void; onClear: () => void }) {
  return (
    <div className="flex-1">
      {user ? (
        <div className="glass-2 rounded-2xl p-3 flex flex-col items-center gap-2 relative">
          <button onClick={onClear} className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/10 text-white/50 text-[11px] font-black grid place-items-center">✕</button>
          <div className="w-16 h-16 rounded-full grid place-items-center text-white font-black text-[26px] border border-white/20"
            style={{ background: toneFor(user.id) }}>
            {(user.name ?? '?')[0]}
          </div>
          <div className="text-center">
            <div className="font-bold text-[13px] leading-tight">{user.name}</div>
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-0.5">{user.department}</div>
          </div>
        </div>
      ) : (
        <button onClick={onPick}
          className="w-full glass-1 rounded-2xl p-3 flex flex-col items-center gap-2 press-shrink ease-spring transition hover:bg-white/10 border-2 border-dashed border-white/20">
          <div className="w-16 h-16 rounded-full glass-1 grid place-items-center">
            <span className="text-orange-500 text-3xl font-black">+</span>
          </div>
          <span className="text-[13px] font-bold text-white/50">Выбрать</span>
        </button>
      )}
    </div>
  )
}

function CompatRing({ score }: { score: number }) {
  const R = 54; const C = 2 * Math.PI * R
  const ref = useRef<SVGCircleElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const target = C * (1 - score / 100)
    animate(C, target, { duration: 1.4, ease: 'easeOut', onUpdate: v => { if (ref.current) ref.current.style.strokeDashoffset = String(v) } })
  }, [score, C])
  const color = score >= 70 ? '#FF6B00' : score >= 40 ? '#F39C12' : '#6A6A6A'
  return (
    <div className="relative w-[140px] h-[140px]">
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={R} fill="rgba(26,26,26,0.88)" stroke="rgba(255,255,255,0.10)" strokeWidth="1"/>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9"/>
        <circle ref={ref} cx="70" cy="70" r={R} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-black tracking-tight leading-none">{score}%</span>
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-white/55 mt-0.5">совпадение</span>
      </div>
    </div>
  )
}
