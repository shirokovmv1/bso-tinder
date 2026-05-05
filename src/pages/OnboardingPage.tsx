import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiHobby } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { assignBadge } from '@/data/badges'

type Step = 1 | 2 | 3

const DEPTS = ['Логистика', 'Стройка', 'IT', 'Финансы', 'HR']

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1)
  const [allHobbies, setAllHobbies] = useState<ApiHobby[]>([])
  const [saving, setSaving] = useState(false)

  const { nameInput, departmentInput, photoUrl, selectedHobbies,
    setNameInput, setDepartmentInput, setPhotoUrl, toggleHobby, currentUser, setCurrentUser } = useAppStore()
  const MIN = 5

  useEffect(() => {
    api.getHobbies().then(setAllHobbies).catch(() => {})
  }, [])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setPhotoUrl(r.result as string)
    r.readAsDataURL(f)
  }

  async function handleFinish() {
    if (!currentUser || !nameInput.trim() || !departmentInput || selectedHobbies.length < MIN) return
    setSaving(true)
    try {
      const hobbyIds = selectedHobbies.map(h => h.id)
      const badge = assignBadge(selectedHobbies as Parameters<typeof assignBadge>[0])
      const updated = await api.updateMe(currentUser.id, {
        name: nameInput.trim(),
        department: departmentInput,
        avatar_url: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nameInput)}`,
        badge_id: badge.id,
        hobbyIds,
      })
      setCurrentUser(updated)
      setStep(3)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-radial-orange min-h-full flex flex-col overflow-y-auto scrollbar-none">
      <div className="mx-auto w-full max-w-md px-5 pt-12 pb-36 flex-1">

        {/* Лого */}
        <div className="flex items-center gap-3 mb-6 fade-up">
          <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center shadow-cta">
            <span className="text-white font-black text-[15px] tracking-tight">БСО</span>
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-black tracking-tight">Своя команда</div>
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">строим команду</div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h1 className="text-[32px] font-black leading-[1.05] tracking-tight">
                Здравствуйте.<br />Давайте знакомиться.
              </h1>
              <p className="text-white/60 mt-3 text-[15px] font-medium">
                Найдём коллег, с которыми будет интересно общаться.
              </p>

              <div className="mt-7 flex items-center gap-4">
                <label className="relative w-20 h-20 rounded-full glass-1 grid place-items-center cursor-pointer overflow-hidden press-shrink ease-spring transition-transform">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="text-orange-500 text-2xl font-black">＋</div>
                      <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-black uppercase tracking-[0.1em] text-white/55 pb-1.5">фото</div>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
                <div className="flex-1 space-y-2 min-w-0">
                  <FloatField label="Имя" value={nameInput} onChange={setNameInput} placeholder="Анна" />
                  <div className="rounded-2xl px-4 py-2.5 glass-1 border border-white/10">
                    <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50 mb-1">Отдел</div>
                    <select
                      value={departmentInput}
                      onChange={e => setDepartmentInput(e.target.value)}
                      className="w-full bg-transparent outline-none text-white text-[15px] font-bold appearance-none"
                    >
                      <option value="" disabled className="bg-graphite-900">Выберите отдел</option>
                      {DEPTS.map(d => <option key={d} value={d} className="bg-graphite-900">{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h2 className="text-[26px] font-extrabold leading-snug tracking-tight">Ваши интересы</h2>
              <div className="flex items-baseline justify-between mt-1 mb-4">
                <p className="text-white/60 text-[15px] font-medium">Выберите минимум {MIN}</p>
                <div className="text-[11px] font-black uppercase tracking-[0.08em]">
                  <span className={selectedHobbies.length >= MIN ? 'text-orange-500' : 'text-white/55'}>
                    {selectedHobbies.length}
                  </span>
                  <span className="text-white/40"> / мин. {MIN}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {allHobbies.map(h => {
                  const sel = selectedHobbies.some(s => s.id === h.id)
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHobby(h)}
                      className={`px-3.5 py-2 rounded-full text-sm font-bold ease-spring press-shrink transition-all duration-200 border ${
                        sel
                          ? 'bg-orange-500 border-transparent text-white shadow-[0_4px_12px_rgba(255,107,0,0.30)]'
                          : 'glass-1 text-white/85 hover:bg-white/10'
                      }`}
                    >
                      <span className="mr-1">{h.emoji}</span>{h.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-8">
              <BadgeReveal userId={currentUser?.id} name={currentUser?.name} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      {step < 3 && (
        <div className="fixed bottom-0 inset-x-0 px-5 pb-6 pt-4" style={{ background: 'linear-gradient(to top, #2D2D2D 60%, transparent)' }}>
          <div className="mx-auto max-w-md space-y-2">
            {step === 2 && (
              <button onClick={() => setStep(1)} className="w-full text-[13px] font-bold text-white/40">
                ‹ Назад
              </button>
            )}
            <button
              disabled={
                step === 1 ? !nameInput.trim() || !departmentInput
                : selectedHobbies.length < MIN || saving
              }
              onClick={() => step === 1 ? setStep(2) : handleFinish()}
              className="cta-orange w-full py-4 text-[16px] font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 1 ? 'Продолжить →'
                : saving ? 'Сохраняем...'
                : selectedHobbies.length >= MIN ? 'Получить бейдж →'
                : `Выберите ещё ${MIN - selectedHobbies.length}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BadgeReveal({ userId: _userId, name: _name }: { userId?: string; name?: string | null }) {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.currentUser)
  const badgeId = currentUser?.badge_id ?? 'allrounder'

  const BADGES: Record<string, { emoji: string; title: string; desc: string; color: string }> = {
    team_player:    { emoji: '🏆', title: 'Командный игрок',      desc: 'Всегда в центре событий!',        color: '#FF6B00' },
    digital_artist: { emoji: '🎨', title: 'Цифровой художник',    desc: 'Код и краски — твоя стихия.',      color: '#9B59B6' },
    wild_tracker:   { emoji: '🌲', title: 'Дикий следопыт',       desc: 'Лес, горы, свобода.',              color: '#27AE60' },
    life_of_party:  { emoji: '🎭', title: 'Душа компании',        desc: 'Без тебя не праздник!',            color: '#E74C3C' },
    eco_hacker:     { emoji: '🌿', title: 'Эко-хакер',            desc: 'Технологии на службе природы.',    color: '#16A085' },
    cybersportsman: { emoji: '⚡', title: 'Киберспортсмен',       desc: 'Быстрее. Выше. Сильнее.',          color: '#2980B9' },
    explorer:       { emoji: '🗺️', title: 'Путешественник',      desc: 'Мир — твоя площадка.',            color: '#F39C12' },
    romantic:       { emoji: '🌸', title: 'Романтик',             desc: 'Красота в каждом моменте.',        color: '#E91E63' },
    networker:      { emoji: '🔗', title: 'Сетевик',              desc: 'Связи решают всё.',                color: '#3498DB' },
    allrounder:     { emoji: '✨', title: 'Разносторонняя личность', desc: 'Везде свой, всё умеешь!',       color: '#8E44AD' },
  }
  const badge = BADGES[badgeId] ?? BADGES.allrounder

  return (
    <div className="flex flex-col items-center text-center gap-6 w-full">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.2 }}
        className="text-8xl"
      >
        {badge.emoji}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-500 mb-2">Ваш бейдж</div>
        <h2 className="text-[28px] font-black tracking-tight">{badge.title}</h2>
        <p className="text-white/60 mt-2 text-[15px]">{badge.desc}</p>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="w-full">
        <button
          onClick={() => navigate('/feed', { replace: true })}
          className="cta-orange w-full py-4 text-[16px] font-extrabold"
        >
          Погнали в ленту! 🚀
        </button>
      </motion.div>
    </div>
  )
}

function FloatField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div className={`rounded-2xl px-4 py-2.5 transition-all duration-200 ease-spring border ${focus ? 'bg-orange-500/[0.06] border-orange-500' : 'glass-1'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50">{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        className="w-full bg-transparent outline-none text-white text-[16px] font-bold placeholder:text-white/30"
      />
    </div>
  )
}
