import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'

type Step = 'email' | 'code'

export default function LoginPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  const { token, setToken } = useAppStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Уже авторизован — сразу на /feed
  useEffect(() => {
    if (token) navigate('/feed', { replace: true })
  }, [token, navigate])

  // Невалидный magic link
  useEffect(() => {
    if (searchParams.get('magic_error')) {
      setError('Ссылка для входа недействительна или устарела')
    }
  }, [searchParams])

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true); setError('')
    try {
      const res = await api.sendOtp(email.trim())
      setHint(res.message)
      setStep('code')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally { setLoading(false) }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 4) return
    setLoading(true); setError('')
    try {
      const res = await api.verifyOtp(email.trim(), code.trim())
      setToken(res.token, res.user)
      navigate(res.user.onboarding_done ? '/feed' : '/onboarding', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-radial-orange min-h-full flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">

        {/* Лого */}
        <div className="flex items-center gap-3 mb-10 fade-up">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-cta">
            <span className="text-white font-black text-[17px] tracking-tight">БСО</span>
          </div>
          <div className="leading-tight">
            <div className="text-[16px] font-black tracking-tight">Своя команда</div>
            <div className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">строим команду</div>
          </div>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4 fade-up" style={{ animationDelay: '60ms' }}>
            <div>
              <h1 className="text-[32px] font-black leading-[1.05] tracking-tight">Вход</h1>
              <p className="text-white/60 mt-2 text-[15px] font-medium">
                Введите корпоративный email — пришлём код подтверждения.
              </p>
            </div>

            <FloatField
              label="Корпоративный email"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="имя@bso-cc.ru"
              autoComplete="email"
            />

            {error && <p className="text-[13px] font-bold text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email.includes('@')}
              className="cta-orange w-full py-4 text-[16px] font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Отправляем...' : 'Получить код →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4 fade-up">
            <div>
              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError('') }}
                className="text-[13px] font-bold text-white/50 mb-4 flex items-center gap-1 press-shrink ease-spring transition"
              >
                ‹ Назад
              </button>
              <h1 className="text-[32px] font-black leading-[1.05] tracking-tight">Код из письма</h1>
              <p className="text-white/60 mt-2 text-[15px] font-medium">
                Отправили код на <span className="text-white font-bold">{email}</span>
              </p>
              {hint && <p className="text-[12px] text-orange-400 font-bold mt-1">{hint}</p>}
            </div>

            <div className="rounded-2xl px-4 py-3 glass-1 border border-transparent focus-within:border-orange-500 transition-colors">
              <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50 mb-1">4-значный код</div>
              <input
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                inputMode="numeric"
                maxLength={4}
                autoFocus
                placeholder="0000"
                className="w-full bg-transparent outline-none text-white text-[28px] font-black tracking-[0.3em] placeholder:text-white/20"
              />
            </div>

            {error && <p className="text-[13px] font-bold text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="cta-orange w-full py-4 text-[16px] font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Проверяем...' : 'Войти →'}
            </button>

            <button
              type="button"
              onClick={() => { setCode(''); setError(''); handleSendOtp(new Event('') as unknown as React.FormEvent) }}
              className="w-full text-[13px] font-bold text-white/40 pt-1"
            >
              Отправить новый код
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function FloatField({ label, value, onChange, type = 'text', placeholder, autoComplete }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; autoComplete?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div className={`rounded-2xl px-4 py-3 transition-all duration-200 ease-spring border ${focus ? 'bg-orange-500/[0.06] border-orange-500' : 'glass-1'}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.08em] text-white/50 mb-1">{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full bg-transparent outline-none text-white text-[16px] font-bold placeholder:text-white/30"
      />
    </div>
  )
}
