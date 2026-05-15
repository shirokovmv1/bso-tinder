import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiHobby, type ApiDepartment } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'
import { assignBadge, BADGES } from '@/data/badges'
import { BASE_COLORS, BOOK_GENRES, FILM_GENRES, MUSIC_GENRES, ZODIAC_SIGNS } from '@/data/profileOptions'

type Step = 1 | 2 | 3 | 4
const MAX_AVATAR_SIDE = 512
const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const MIN_HOBBIES = 6

const MONTHS_RU = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь',
]

const EXPERIENCE_OPTIONS = [
  { label: 'Менее года', months: 6 },
  { label: '1-3 года', months: 24 },
  { label: '3-5 лет', months: 48 },
  { label: '5-10 лет', months: 84 },
  { label: 'Более 10 лет', months: 120 },
]

function dataUrlByteSize(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] ?? ''
  return Math.ceil((base64.length * 3) / 4)
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
      img.src = String(reader.result ?? '')
    }
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.readAsDataURL(file)
  })
}

async function buildCompactAvatarDataUrl(file: File) {
  const image = await loadImageFromFile(file)
  const ratio = Math.min(MAX_AVATAR_SIDE / image.width, MAX_AVATAR_SIDE / image.height, 1)
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен')
  ctx.drawImage(image, 0, 0, width, height)

  let quality = 0.82
  let dataUrl = canvas.toDataURL('image/jpeg', quality)
  while (dataUrlByteSize(dataUrl) > MAX_AVATAR_BYTES && quality > 0.4) {
    quality -= 0.08
    dataUrl = canvas.toDataURL('image/jpeg', quality)
  }
  if (dataUrlByteSize(dataUrl) > MAX_AVATAR_BYTES) {
    throw new Error('Аватар слишком большой после сжатия. Выберите другое изображение.')
  }
  return dataUrl
}

export default function OnboardingPage() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>(() => searchParams.get('step') === 'interests' ? 2 : 1)
  const [allHobbies, setAllHobbies] = useState<ApiHobby[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [avatarError, setAvatarError] = useState('')
  const [notice, setNotice] = useState('')

  const { photoUrl, selectedHobbies, setPhotoUrl, toggleHobby, currentUser, setCurrentUser, clearMatch } = useAppStore()
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [birthdayDay, setBirthdayDay] = useState('')
  const [birthdayMonth, setBirthdayMonth] = useState('')
  const [gender, setGender] = useState<'m' | 'f' | ''>('')
  const [experienceMonths, setExperienceMonths] = useState('')
  // Step 3 — text fields
  const [aboutShort, setAboutShort] = useState('')
  const [workDetails, setWorkDetails] = useState('')
  const [currentInterestsText, setCurrentInterestsText] = useState('')
  // Step 3 — chip selections
  const [filmGenres, setFilmGenres] = useState<string[]>([])
  const [bookGenres, setBookGenres] = useState<string[]>([])
  const [musicGenres, setMusicGenres] = useState<string[]>([])
  const [zodiacSign, setZodiacSign] = useState('')
  const [favColor, setFavColor] = useState('')
  const [customColor, setCustomColor] = useState('#FF6B00')

  useEffect(() => {
    api.getHobbies().then(setAllHobbies).catch(() => {})
    api.getDepartments().then(setDepartments).catch(() => {})
  }, [])

  useEffect(() => {
    if (searchParams.get('step') === 'interests') setStep(2)
  }, [searchParams])

  useEffect(() => {
    if (!currentUser) return
    setLastName(currentUser.last_name ?? '')
    setFirstName(currentUser.first_name ?? currentUser.name?.split(' ')[0] ?? '')
    setMiddleName(currentUser.middle_name ?? '')
    setDepartment(currentUser.department ?? '')
    setPosition(currentUser.position ?? '')
    setBirthdayDay(currentUser.birthday_day ? String(currentUser.birthday_day) : '')
    setBirthdayMonth(currentUser.birthday_month ? String(currentUser.birthday_month) : '')
    setGender(currentUser.gender === 'm' || currentUser.gender === 'f' ? currentUser.gender : '')
    setExperienceMonths(currentUser.experience_months ? String(currentUser.experience_months) : '')
    setAboutShort(currentUser.about_short ?? '')
    setWorkDetails(currentUser.work_details ?? '')
    setCurrentInterestsText(currentUser.current_interests ?? '')
    // Parse stored comma-separated genre keys (ignore legacy free-text values)
    const parseGenres = (raw: string | null | undefined, validKeys: string[]) =>
      (raw ?? '').split(',').map(s => s.trim()).filter(k => validKeys.includes(k))
    const validFilm  = FILM_GENRES.map(g => g.key)
    const validBook  = BOOK_GENRES.map(g => g.key)
    const validMusic = MUSIC_GENRES.map(g => g.key)
    setFilmGenres(parseGenres(currentUser.last_movies, validFilm))
    setBookGenres(parseGenres(currentUser.last_books, validBook))
    setMusicGenres(parseGenres(currentUser.last_songs, validMusic))
    setZodiacSign(currentUser.zodiac_sign ?? '')
    setFavColor(currentUser.fav_color ?? '')
  }, [currentUser])

  const parentHobbies = useMemo(() => allHobbies.filter(h => h.parent_id === null), [allHobbies])
  const childHobbies  = useMemo(() => allHobbies.filter(h => h.parent_id !== null),  [allHobbies])
  const groupedHobbies = useMemo(
    () => parentHobbies.map(parent => ({ parent, children: childHobbies.filter(h => h.parent_id === parent.id) })),
    [parentHobbies, childHobbies]
  )

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      setAvatarError('')
      setPhotoUrl(await buildCompactAvatarDataUrl(f))
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Не удалось обработать изображение')
    } finally {
      e.target.value = ''
    }
  }

  async function handleFinish() {
    if (!currentUser || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    try {
      const effectiveColor = favColor === 'custom' ? customColor : favColor
      const badge = assignBadge(selectedHobbies, {
        filmGenres,
        bookGenres,
        musicGenres,
        zodiacSign,
        favColor: effectiveColor,
      })
      const updated = await api.updateMe(currentUser.id, {
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        middle_name: middleName.trim(),
        name: [lastName, firstName, middleName].map(v => v.trim()).filter(Boolean).join(' '),
        department,
        position: position.trim(),
        birthday_day: birthdayDay ? Number(birthdayDay) : null,
        birthday_month: birthdayMonth ? Number(birthdayMonth) : null,
        avatar_url: photoUrl || (currentUser.avatar_url && !currentUser.avatar_url.includes('dicebear.com') ? currentUser.avatar_url : null),
        badge_id: badge.id,
        hobbyIds: selectedHobbies.map(h => h.id),
        ...(gender ? { gender } : {}),
        ...(experienceMonths ? { experience_months: Number(experienceMonths) } : {}),
        about_short: aboutShort.trim(),
        work_details: workDetails.trim(),
        current_interests: currentInterestsText.trim(),
        last_movies: filmGenres.join(','),
        last_books: bookGenres.join(','),
        last_songs: musicGenres.join(','),
        zodiac_sign: zodiacSign,
        fav_color: effectiveColor,
      })
      setCurrentUser(updated)
      clearMatch()
      setNotice('Профиль обновлён. Подбор начнётся заново с учётом новых данных.')
      setStep(4)
    } catch (err) {
      setNotice(err instanceof Error ? `Ошибка сохранения: ${err.message}` : 'Ошибка сохранения. Попробуйте снова.')
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const profileReady = !!(firstName.trim() && lastName.trim() && department)
  const hobbiesReady = selectedHobbies.length >= MIN_HOBBIES
  const hasRealPhoto = !!(photoUrl || (currentUser?.avatar_url && !currentUser.avatar_url.includes('dicebear.com')))
  const step3Ready   = (
    hasRealPhoto &&
    aboutShort.trim().length >= 3 &&
    workDetails.trim().length >= 3 &&
    currentInterestsText.trim().length >= 3 &&
    filmGenres.length > 0 &&
    bookGenres.length > 0 &&
    musicGenres.length > 0 &&
    !!zodiacSign &&
    !!favColor
  )

  function toggleMulti(arr: string[], setArr: (v: string[]) => void, key: string) {
    setArr(arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key])
  }

  return (
    <div className="onboarding-page bg-radial-orange flex flex-col overflow-y-auto scrollbar-none">
      <div className="mx-auto w-full max-w-md px-5 pt-12 pb-36 flex-1">
        <BrandHeader />

        {notice && (
          <div className="mb-4 glass-1 rounded-2xl px-4 py-3 text-[12px] font-bold text-orange-200">
            {notice}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepPanel key="profile">
              <h1 className="text-[30px] font-black leading-[1.05] tracking-tight">Профиль</h1>
              <p className="text-white/60 mt-3 text-[15px] font-medium">Проверьте данные и добавьте то, чего не хватает.</p>

              <div className="mt-7 flex items-center gap-4">
                <label className="relative w-20 h-20 rounded-full glass-1 grid place-items-center cursor-pointer overflow-hidden press-shrink ease-spring transition-transform">
                  {photoUrl || currentUser?.avatar_url ? (
                    <img src={photoUrl || currentUser?.avatar_url || ''} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="text-orange-500 text-2xl font-black">＋</div>
                      <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-black uppercase tracking-[0.1em] text-white/55 pb-1.5">фото</div>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
                <div className="flex-1 space-y-2 min-w-0">
                  <FloatField label="Фамилия" value={lastName} onChange={setLastName} placeholder="Иванова" />
                  <FloatField label="Имя" value={firstName} onChange={setFirstName} placeholder="Анна" />
                </div>
              </div>
              {!!avatarError && <p className="mt-2 text-[12px] text-red-300">{avatarError}</p>}

              <div className="mt-3 space-y-3">
                <FloatField label="Отчество" value={middleName} onChange={setMiddleName} placeholder="Сергеевна" />
                <SelectField label="Отдел" value={department} onChange={setDepartment}>
                  <option value="" disabled className="bg-graphite-900">Выберите отдел</option>
                  {departments.map(d => <option key={d.id} value={d.name} className="bg-graphite-900">{d.name}</option>)}
                </SelectField>
                <FloatField label="Должность" value={position} onChange={setPosition} placeholder="Специалист" />

                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="День рождения" value={birthdayDay} onChange={setBirthdayDay}>
                    <option value="" className="bg-graphite-900">День</option>
                    {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1} className="bg-graphite-900">{i + 1}</option>)}
                  </SelectField>
                  <SelectField label="Месяц" value={birthdayMonth} onChange={setBirthdayMonth}>
                    <option value="" className="bg-graphite-900">Месяц</option>
                    {MONTHS_RU.map((m, i) => <option key={i + 1} value={i + 1} className="bg-graphite-900">{m}</option>)}
                  </SelectField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50 mb-1.5">Пол</div>
                    <div className="flex gap-2">
                      {(['m', 'f'] as const).map(g => (
                        <button key={g} onClick={() => setGender(prev => prev === g ? '' : g)}
                          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${gender === g ? 'bg-orange-500 border-transparent text-white' : 'glass-1 border-white/10 text-white/60'}`}>
                          {g === 'm' ? 'Муж' : 'Жен'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <SelectField label="Стаж" value={experienceMonths} onChange={setExperienceMonths}>
                    <option value="" className="bg-graphite-900">Выберите</option>
                    {EXPERIENCE_OPTIONS.map(opt => <option key={opt.months} value={opt.months} className="bg-graphite-900">{opt.label}</option>)}
                  </SelectField>
                </div>
              </div>
            </StepPanel>
          )}

          {step === 2 && (
            <StepPanel key="interests">
              <h2 className="text-[26px] font-extrabold leading-snug tracking-tight">Ключевые интересы</h2>
              <div className="flex items-baseline justify-between mt-1 mb-4">
                <p className="text-white/60 text-[15px] font-medium">Выберите минимум {MIN_HOBBIES}</p>
                <div className="text-[11px] font-black uppercase tracking-[0.08em]">
                  <span className={hobbiesReady ? 'text-orange-500' : 'text-white/55'}>{selectedHobbies.length}</span>
                  <span className="text-white/40"> / мин. {MIN_HOBBIES}</span>
                </div>
              </div>
              <HobbyGroups groups={groupedHobbies} selected={selectedHobbies} onToggle={toggleHobby} />
            </StepPanel>
          )}

          {step === 3 && (
            <StepPanel key="story">
              <h2 className="text-[26px] font-extrabold leading-snug tracking-tight">О себе</h2>
              <p className="text-white/60 mt-2 mb-6 text-[15px] font-medium">Всё обязательно — именно отсюда рождается крутой мэтч.</p>

              <div className="space-y-5">
                {/* Текстовые поля */}
                <FloatField
                  label="Моя суперсила"
                  value={aboutShort}
                  onChange={setAboutShort}
                  placeholder="Например: обучаю собак шахматам"
                />
                <FloatField
                  label="Моя страсть"
                  value={workDetails}
                  onChange={setWorkDetails}
                  placeholder="Например: готовлю, залипаю в сериалах"
                />
                <FloatField
                  label="Мои проекты"
                  value={currentInterestsText}
                  onChange={setCurrentInterestsText}
                  placeholder="Например: учу язык, изучаю ИИ"
                />

                {/* Жанры фильмов */}
                <ChipGroup
                  label="Нравятся жанры фильмов"
                  hint="можно несколько"
                  options={FILM_GENRES}
                  selected={filmGenres}
                  onToggle={key => toggleMulti(filmGenres, setFilmGenres, key)}
                />

                {/* Жанры книг */}
                <ChipGroup
                  label="Нравятся жанры книг"
                  hint="можно несколько"
                  options={BOOK_GENRES}
                  selected={bookGenres}
                  onToggle={key => toggleMulti(bookGenres, setBookGenres, key)}
                />

                {/* Музыка */}
                <ChipGroup
                  label="Нравится музыка"
                  hint="можно несколько"
                  options={MUSIC_GENRES}
                  selected={musicGenres}
                  onToggle={key => toggleMulti(musicGenres, setMusicGenres, key)}
                />

                {/* Знак зодиака */}
                <ChipGroup
                  label="Знак зодиака"
                  hint="один"
                  options={ZODIAC_SIGNS}
                  selected={zodiacSign ? [zodiacSign] : []}
                  onToggle={key => setZodiacSign(prev => prev === key ? '' : key)}
                />

                {/* Любимый цвет */}
                <ColorChipGroup
                  selected={favColor}
                  customColor={customColor}
                  onSelect={setFavColor}
                  onCustomChange={setCustomColor}
                />
              </div>
            </StepPanel>
          )}

          {step === 4 && (
            <motion.div key="badge" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center pt-8">
              <BadgeReveal />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {step < 4 && (
        <div className="fixed bottom-0 inset-x-0 px-5 pb-6 pt-4" style={{ background: 'linear-gradient(to top, #2D2D2D 60%, transparent)' }}>
          <div className="mx-auto max-w-md space-y-2">
            {step > 1 && (
              <button onClick={() => setStep((step - 1) as Step)} className="w-full text-[13px] font-bold text-white/40">‹ Назад</button>
            )}
            {step === 3 && !hasRealPhoto && (
              <p className="text-center text-[13px] font-bold text-orange-300/80">
                📸 Загрузите фото — без него бейдж не выдаём
              </p>
            )}
            <button
              disabled={
                (step === 1 && !profileReady) ||
                (step === 2 && !hobbiesReady) ||
                (step === 3 && !step3Ready) ||
                saving
              }
              onClick={() => {
                if (step === 3) handleFinish()
                else setStep((step + 1) as Step)
              }}
              className="cta-orange w-full py-4 text-[16px] font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 3
                ? saving ? 'Сохраняем...' : 'Готово — смотрим бейдж!'
                : 'Продолжить →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-3 mb-6 fade-up">
      <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center shadow-cta">
        <span className="text-white font-black text-[15px] tracking-tight">БСО</span>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-black tracking-tight">Своя команда</div>
        <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">строим команду</div>
      </div>
    </div>
  )
}

function StepPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
      {children}
    </motion.div>
  )
}

function HobbyGroups({ groups, selected, onToggle }: {
  groups: Array<{ parent: ApiHobby; children: ApiHobby[] }>
  selected: ApiHobby[]
  onToggle: (hobby: ApiHobby) => void
}) {
  return (
    <div className="space-y-4">
      {groups.map(group => (
        <div key={group.parent.id}>
          <div className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45 mb-2">
            <span className="mr-1">{group.parent.emoji}</span>{group.parent.label}
          </div>
          <div className="flex flex-wrap gap-2">
            {group.children.map(h => {
              const isSelected = selected.some(s => s.id === h.id)
              return (
                <button key={h.id} onClick={() => onToggle(h)}
                  className={`px-3.5 py-2 rounded-full text-sm font-bold ease-spring press-shrink transition-all duration-200 border ${isSelected ? 'bg-orange-500 border-transparent text-white shadow-[0_4px_12px_rgba(255,107,0,0.30)]' : 'glass-1 text-white/85 hover:bg-white/10'}`}>
                  <span className="mr-1">{h.emoji}</span>{h.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChipGroup({ label, hint, options, selected, onToggle }: {
  label: string
  hint?: string
  options: { key: string; emoji: string; label: string }[]
  selected: string[]
  onToggle: (key: string) => void
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50">{label}</span>
        {hint && <span className="text-[10px] text-white/30">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = selected.includes(opt.key)
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onToggle(opt.key)}
              className={`px-3.5 py-2 rounded-full text-sm font-bold ease-spring press-shrink transition-all duration-200 border ${
                active
                  ? 'bg-orange-500 border-transparent text-white shadow-[0_4px_12px_rgba(255,107,0,0.30)]'
                  : 'glass-1 text-white/85 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{opt.emoji}</span>{opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorChipGroup({ selected, customColor, onSelect, onCustomChange }: {
  selected: string
  customColor: string
  onSelect: (key: string) => void
  onCustomChange: (hex: string) => void
}) {
  const colorInputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50">Мой любимый цвет</span>
        <span className="text-[10px] text-white/30">один</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {BASE_COLORS.map(c => {
          const active = selected === c.key
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c.key)}
              className={`px-3.5 py-2 rounded-full text-sm font-bold ease-spring press-shrink transition-all duration-200 border ${
                active
                  ? 'bg-orange-500 border-transparent text-white shadow-[0_4px_12px_rgba(255,107,0,0.30)]'
                  : 'glass-1 text-white/85 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="mr-1">{c.emoji}</span>{c.label}
            </button>
          )
        })}
        {/* Custom color chip */}
        <button
          type="button"
          onClick={() => { onSelect('custom'); colorInputRef.current?.click() }}
          className={`px-3.5 py-2 rounded-full text-sm font-bold ease-spring press-shrink transition-all duration-200 border ${
            selected === 'custom'
              ? 'border-transparent text-white shadow-[0_4px_12px_rgba(255,107,0,0.30)]'
              : 'glass-1 text-white/85 border-white/10 hover:bg-white/10'
          }`}
          style={selected === 'custom' ? { backgroundColor: customColor } : {}}
        >
          🎨 Свой цвет
        </button>
        <input
          ref={colorInputRef}
          type="color"
          value={customColor}
          onChange={e => { onCustomChange(e.target.value); onSelect('custom') }}
          className="sr-only"
          aria-hidden
        />
      </div>
    </div>
  )
}

function BadgeReveal() {
  const navigate = useNavigate()
  const currentUser = useAppStore(s => s.currentUser)
  const badgeId = currentUser?.badge_id ?? 'allrounder'
  const badge = BADGES.find(b => b.id === badgeId) ?? BADGES[BADGES.length - 1]

  const [pitchText, setPitchText] = useState('')
  const [pitchLoading, setPitchLoading] = useState(false)
  const [pitchError, setPitchError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleGeneratePitch() {
    setPitchLoading(true)
    setPitchError('')
    try {
      const result = await api.generateMyPitch()
      setPitchText(result.pitch)
    } catch {
      setPitchError('AI недоступен, попробуйте позже')
    } finally {
      setPitchLoading(false)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(pitchText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

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
        <p className="text-white/60 mt-2 text-[15px]">{badge.description}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="w-full space-y-3">
        {!pitchText && (
          <button
            onClick={handleGeneratePitch}
            disabled={pitchLoading}
            className="w-full py-3 rounded-2xl text-[15px] font-bold border border-orange-500/40 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25 transition-all disabled:opacity-60"
          >
            {pitchLoading ? '⏳ Генерируем...' : '✍️ Обо мне'}
          </button>
        )}
        {!!pitchError && <p className="text-[13px] text-red-400">{pitchError}</p>}

        {!!pitchText && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/40">Ваш питч</div>
              <button
                onClick={handleCopy}
                className="text-[12px] font-bold text-orange-300 hover:text-orange-200 transition-colors"
              >
                {copied ? '✓ Скопировано' : 'Скопировать'}
              </button>
            </div>
            <p className="text-[14px] font-semibold text-white/80 leading-relaxed">{pitchText}</p>
            <button
              onClick={handleGeneratePitch}
              disabled={pitchLoading}
              className="mt-3 text-[12px] font-bold text-white/40 hover:text-white/60 transition-colors disabled:opacity-60"
            >
              {pitchLoading ? 'Генерируем...' : '↺ Другой вариант'}
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/match', { replace: true })}
          className="cta-orange w-full py-4 text-[16px] font-extrabold"
        >
          Делаем Метч 💥
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
      <input value={value} onChange={e => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholder={placeholder} className="w-full bg-transparent outline-none text-white text-[16px] font-bold placeholder:text-white/30" />
    </div>
  )
}

function SelectField({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode
}) {
  return (
    <div className="rounded-2xl px-4 py-2.5 glass-1 border border-white/10">
      <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50 mb-1">{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-white text-[15px] font-bold appearance-none">
        {children}
      </select>
    </div>
  )
}
