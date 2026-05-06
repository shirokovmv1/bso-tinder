import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import { useAppStore } from '@/store/useAppStore'

export default function LoginPage() {
  const [login, setLogin]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!login.trim() || !password.trim()) return
    setLoading(true); setError('')
    try {
      const res = await api.devLogin(login.trim(), password.trim())
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

        <form onSubmit={handleLogin} className="space-y-4 fade-up" style={{ animationDelay: '60ms' }}>
          <div>
            <h1 className="text-[32px] font-black leading-[1.05] tracking-tight">Вход</h1>
            <p className="text-white/60 mt-2 text-[15px] font-medium">
              Тестовый режим — используйте выданные учётные данные.
            </p>
          </div>

          <FloatField
            label="Логин"
            value={login}
            onChange={setLogin}
            placeholder="admin"
            autoComplete="username"
          />

          <FloatField
            label="Пароль"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••"
            autoComplete="current-password"
          />

          {error && <p className="text-[13px] font-bold text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !login.trim() || !password.trim()}
            className="cta-orange w-full py-4 text-[16px] font-extrabold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Входим...' : 'Войти →'}
          </button>
        </form>
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
        autoFocus={!value && type !== 'password'}
        className="w-full bg-transparent outline-none text-white text-[16px] font-bold placeholder:text-white/30"
      />
    </div>
  )
}
