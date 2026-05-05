import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiUser } from '@/api/client'

type Tab = 'users' | 'logs' | 'smtp'

// ── иконки ──────────────────────────────────────────────────────────────────
const IconLink = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
)
const IconBan = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
)
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

// ── тост-уведомление ────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
      style={{ background: 'rgba(255,107,0,0.18)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,107,0,0.35)', color: '#fff' }}
    >
      <IconCheck />
      {message}
    </motion.div>
  )
}

// ── вкладка "Пользователи" ──────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const showToast = (msg: string) => setToast(msg)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.adminUsers()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleBan = async (user: ApiUser) => {
    try {
      const res = await api.adminBanUser(user.id)
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: res.is_banned } : u))
      showToast(res.is_banned ? `${user.name ?? user.email} заблокирован` : `${user.name ?? user.email} разблокирован`)
    } catch (e: unknown) {
      showToast((e as Error).message)
    }
  }

  const handleDelete = async (user: ApiUser) => {
    if (!confirm(`Удалить ${user.name ?? user.email}? Это действие нельзя отменить.`)) return
    try {
      await api.adminDelUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
      showToast('Пользователь удалён')
    } catch (e: unknown) {
      showToast((e as Error).message)
    }
  }

  const handleCopyMagicLink = async (user: ApiUser) => {
    setCopyingId(user.id)
    try {
      const res = await api.adminGetMagicLink(user.id)
      await navigator.clipboard.writeText(res.magic_url)
      showToast('Magic Link скопирован!')
    } catch {
      showToast('Не удалось скопировать ссылку')
    } finally {
      setCopyingId(null)
    }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const blob = await api.adminGetCsvExport()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bso-users-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      showToast('CSV скачан')
    } catch {
      showToast('Ошибка экспорта')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--fg-3)' }}>
          Всего: {users.length}
        </span>
        <button
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-1)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <IconDownload />
          {exporting ? 'Экспорт...' : 'Экспорт CSV'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--fg-3)' }}>Пользователей нет</div>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map(user => (
            <motion.div
              key={user.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: user.is_banned ? 'rgba(255,60,60,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${user.is_banned ? 'rgba(255,60,60,0.18)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {/* Аватар */}
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden"
                style={{ background: 'rgba(255,107,0,0.2)', color: 'var(--brand-orange)' }}
              >
                {user.avatar_url
                  ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (user.name?.[0] ?? user.email[0]).toUpperCase()
                }
              </div>

              {/* Инфо */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>
                    {user.name ?? '(без имени)'}
                  </span>
                  {!!user.is_admin && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,107,0,0.2)', color: 'var(--brand-orange)' }}>
                      admin
                    </span>
                  )}
                  {!!user.is_banned && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,60,60,0.2)', color: '#ff6b6b' }}>
                      бан
                    </span>
                  )}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>
                  {user.email} · {user.department ?? 'отдел не указан'}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleCopyMagicLink(user)}
                  disabled={copyingId === user.id}
                  title="Copy Magic Link"
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-2)' }}
                >
                  {copyingId === user.id ? <IconCheck /> : <IconLink />}
                </button>
                <button
                  onClick={() => handleBan(user)}
                  disabled={!!user.is_admin}
                  title={user.is_banned ? 'Разбанить' : 'Забанить'}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: user.is_banned ? 'rgba(255,107,0,0.12)' : 'rgba(255,255,255,0.06)', color: user.is_banned ? 'var(--brand-orange)' : 'var(--fg-2)' }}
                >
                  <IconBan />
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={!!user.is_admin}
                  title="Удалить"
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                  style={{ background: 'rgba(255,60,60,0.08)', color: '#ff6b6b' }}
                >
                  <IconTrash />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── вкладка "Логи" ──────────────────────────────────────────────────────────
function LogsTab() {
  const [lines, setLines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.adminLogs()
      setLines(res.lines)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const colorLine = (line: string) => {
    if (line.includes('"level":"error"') || line.includes('error')) return '#ff6b6b'
    if (line.includes('"level":"warn"') || line.includes('warn')) return '#ffd166'
    return 'rgba(255,255,255,0.55)'
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-1)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <IconRefresh />
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>

      <div
        className="rounded-xl p-4 overflow-auto max-h-[60vh]"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {lines.length === 0 ? (
          <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {loading ? 'Загрузка логов...' : 'Логи пусты'}
          </span>
        ) : (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all m-0">
            {lines.map((line, i) => (
              <span key={i} style={{ color: colorLine(line), display: 'block' }}>
                {line}
              </span>
            ))}
          </pre>
        )}
      </div>
    </div>
  )
}

// ── вкладка "SMTP" ──────────────────────────────────────────────────────────
const SMTP_FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: 'smtp_host',   label: 'SMTP Host',   placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port',   label: 'SMTP Port',   placeholder: '587' },
  { key: 'smtp_user',   label: 'Логин',       placeholder: 'you@company.ru' },
  { key: 'smtp_pass',   label: 'Пароль',      type: 'password', placeholder: '••••••••' },
  { key: 'smtp_from',   label: 'From (имя)',  placeholder: '"БСО Корпоратив" <no-reply@company.ru>' },
]

function SmtpTab() {
  const [form, setForm] = useState<Record<string, string>>({})
  const [secure, setSecure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    api.adminGetSmtp()
      .then(data => {
        setForm(data)
        setSecure(data.smtp_secure === 'true')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.adminSetSmtp({ ...form, smtp_secure: String(secure) })
      setToast('Настройки SMTP сохранены')
    } catch (err: unknown) {
      setToast((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {SMTP_FIELDS.map(f => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>{f.label}</label>
          <input
            type={f.type ?? 'text'}
            value={form[f.key] ?? ''}
            placeholder={f.placeholder}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'var(--fg-1)',
            }}
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSecure(v => !v)}
          className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
          style={{ background: secure ? 'var(--brand-orange)' : 'rgba(255,255,255,0.12)' }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ transform: secure ? 'translateX(20px)' : 'translateX(2px)' }}
          />
        </button>
        <span className="text-sm" style={{ color: 'var(--fg-2)' }}>SSL/TLS (smtp_secure)</span>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="cta-orange mt-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-60"
      >
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </button>

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </form>
  )
}

// ── главный компонент ───────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'users', label: 'Пользователи' },
  { id: 'logs',  label: 'Логи' },
  { id: 'smtp',  label: 'SMTP' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        {/* Шапка */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1"
        >
          <h1 className="text-xl font-bold" style={{ color: 'var(--fg-1)' }}>
            Панель администратора
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-3)' }}>
            БСО Tinder · управление
          </p>
        </motion.div>

        {/* Табы */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-1 p-1 rounded-2xl flex gap-1"
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(255,107,0,0.22)' : 'transparent',
                color: activeTab === tab.id ? 'var(--brand-orange)' : 'var(--fg-3)',
                border: activeTab === tab.id ? '1px solid rgba(255,107,0,0.30)' : '1px solid transparent',
              }}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Контент */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="glass-1 rounded-2xl p-5"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'logs'  && <LogsTab />}
            {activeTab === 'smtp'  && <SmtpTab />}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  )
}
