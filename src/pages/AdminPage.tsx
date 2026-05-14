import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type ApiUser, type ApiDepartment, type ApiHobby, type ApiReactionType, type ApiLlmSettings, type ApiReactionStats, type ApiReactionStatEmoji } from '@/api/client'

type Tab = 'users' | 'logs' | 'smtp' | 'refs' | 'ai' | 'analytics'
type RefsSection = 'departments' | 'hobbies' | 'reactions'

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
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
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

// ── общие компоненты ────────────────────────────────────────────────────────
function InlineInput({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors ${className}`}
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--fg-1)' }}
    />
  )
}

function ActionBtn({ onClick, disabled, title, children, danger }: {
  onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
      style={{
        background: danger ? 'rgba(255,60,60,0.08)' : 'rgba(255,255,255,0.06)',
        color: danger ? '#ff6b6b' : 'var(--fg-2)',
      }}
    >
      {children}
    </button>
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

// ── вкладка "Пользователи" ──────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<{ id: string; name: string } | null>(null)
  const [copyingId, setCopyingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<Array<{ line: number; error: string }>>([])

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
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleDeleteRequest = (user: ApiUser) => {
    setDeleteConfirmUser({ id: user.id, name: user.name ?? user.email })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmUser) return
    const targetUser = deleteConfirmUser
    try {
      await api.adminDelUser(targetUser.id)
      setUsers(prev => prev.filter(u => u.id !== targetUser.id))
      showToast('Пользователь удалён')
    } catch (e: unknown) { showToast((e as Error).message) }
    finally { setDeleteConfirmUser(null) }
  }

  const handleCopyMagicLink = async (user: ApiUser) => {
    setCopyingId(user.id)
    try {
      const res = await api.adminGetMagicLink(user.id)
      await copyToClipboard(res.magic_url)
      showToast('Magic Link скопирован!')
    } catch { showToast('Не удалось скопировать ссылку') }
    finally { setCopyingId(null) }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const blob = await api.adminGetCsvExport()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `bso-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
      URL.revokeObjectURL(url)
      showToast('CSV скачан')
    } catch { showToast('Ошибка экспорта') }
    finally { setExporting(false) }
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setImportErrors([])
    try {
      const csvBase64 = arrayBufferToBase64(await file.arrayBuffer())
      const result = await api.adminImportCsv(csvBase64)
      setImportErrors(result.errors)
      showToast(`Импорт: создано ${result.created}, обновлено ${result.updated}, ошибок ${result.errors.length}`)
      await loadUsers()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка импорта')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm" style={{ color: 'var(--fg-3)' }}>Всего: {users.length}</span>
        <div className="flex items-center gap-2">
          <label
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity ${importing || loading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-1)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <IconPlus />
            {importing ? 'Импорт...' : 'Импорт CSV'}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} disabled={importing || loading} />
          </label>
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
      </div>

      <div className="text-[11px] leading-relaxed" style={{ color: 'var(--fg-3)' }}>
        Формат CSV: UTF-8 или Windows-1251, разделитель "," или ";". Колонки: email, last_name, first_name, middle_name, position, department, birthday_day, birthday_month.
      </div>

      {importErrors.length > 0 && (
        <div className="rounded-xl p-3 text-xs space-y-1"
          style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.18)', color: '#ffb4b4' }}>
          <div className="font-bold">Ошибки импорта:</div>
          {importErrors.slice(0, 5).map(err => (
            <div key={`${err.line}-${err.error}`}>Строка {err.line}: {err.error}</div>
          ))}
          {importErrors.length > 5 && <div>Ещё ошибок: {importErrors.length - 5}</div>}
        </div>
      )}

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
              <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold overflow-hidden"
                style={{ background: 'rgba(255,107,0,0.2)', color: 'var(--brand-orange)' }}>
                {user.avatar_url && !user.avatar_url.includes('dicebear.com')
                  ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (user.name?.[0] ?? user.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--fg-1)' }}>{user.name ?? '(без имени)'}</span>
                  {!!user.is_admin && <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,107,0,0.2)', color: 'var(--brand-orange)' }}>admin</span>}
                  {!!user.is_banned && <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,60,60,0.2)', color: '#ff6b6b' }}>бан</span>}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--fg-3)' }}>
                  {user.email} · {user.department ?? 'отдел не указан'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <ActionBtn onClick={() => handleCopyMagicLink(user)} disabled={copyingId === user.id} title="Copy Magic Link">
                  {copyingId === user.id ? <IconCheck /> : <IconLink />}
                </ActionBtn>
                <ActionBtn onClick={() => handleBan(user)} disabled={!!user.is_admin} title={user.is_banned ? 'Разбанить' : 'Забанить'}>
                  <IconBan />
                </ActionBtn>
                <ActionBtn onClick={() => handleDeleteRequest(user)} disabled={!!user.is_admin} danger>
                  <IconTrash />
                </ActionBtn>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {deleteConfirmUser && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: '#171717', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-1)' }}>
              Удалить {deleteConfirmUser.name} навсегда? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-2)' }}
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-2 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(255,70,70,0.95)', color: '#fff' }}
              >
                Удалить
              </button>
            </div>
          </div>
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
    try { const res = await api.adminLogs(); setLines(res.lines) }
    finally { setLoading(false) }
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
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-1)', border: '1px solid rgba(255,255,255,0.12)' }}
        >
          <IconRefresh />
          {loading ? 'Загрузка...' : 'Обновить'}
        </button>
      </div>
      <div className="rounded-xl p-4 overflow-auto max-h-[60vh]"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        {lines.length === 0 ? (
          <span className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {loading ? 'Загрузка логов...' : 'Логи пусты'}
          </span>
        ) : (
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-all m-0">
            {lines.map((line, i) => (
              <span key={i} style={{ color: colorLine(line), display: 'block' }}>{line}</span>
            ))}
          </pre>
        )}
      </div>
    </div>
  )
}

// ── вкладка "SMTP" ──────────────────────────────────────────────────────────
const SMTP_FIELDS: { key: string; label: string; type?: string; placeholder?: string }[] = [
  { key: 'smtp_host', label: 'SMTP Host', placeholder: 'smtp.gmail.com' },
  { key: 'smtp_port', label: 'SMTP Port', placeholder: '587' },
  { key: 'smtp_user', label: 'Логин',     placeholder: 'you@company.ru' },
  { key: 'smtp_pass', label: 'Пароль',    type: 'password', placeholder: '••••••••' },
  { key: 'smtp_from', label: 'From',      placeholder: '"БСО" <no-reply@company.ru>' },
]

function SmtpTab() {
  const [form, setForm] = useState<Record<string, string>>({})
  const [secure, setSecure] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    api.adminGetSmtp()
      .then(data => { setForm(data); setSecure(data.smtp_secure === 'true') })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.adminSetSmtp({ ...form, smtp_secure: String(secure) }); setToast('Настройки SMTP сохранены') }
    catch (err: unknown) { setToast((err as Error).message) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      {SMTP_FIELDS.map(f => (
        <div key={f.key} className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>{f.label}</label>
          <input type={f.type ?? 'text'} value={form[f.key] ?? ''} placeholder={f.placeholder}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--fg-1)' }}
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setSecure(v => !v)}
          className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
          style={{ background: secure ? 'var(--brand-orange)' : 'rgba(255,255,255,0.12)' }}>
          <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ transform: secure ? 'translateX(20px)' : 'translateX(2px)' }} />
        </button>
        <span className="text-sm" style={{ color: 'var(--fg-2)' }}>SSL/TLS</span>
      </div>
      <button type="submit" disabled={saving}
        className="cta-orange mt-2 py-3 rounded-xl font-semibold text-sm disabled:opacity-60">
        {saving ? 'Сохранение...' : 'Сохранить настройки'}
      </button>
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </form>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// вкладка "Справочники"
// ════════════════════════════════════════════════════════════════════════════

// ── секция Отделы ────────────────────────────────────────────────────────────
function DepartmentsSection({ showToast }: { showToast: (m: string) => void }) {
  const [items, setItems] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.adminGetDepartments()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      const dept = await api.adminCreateDepartment({ name: newName.trim() })
      setItems(prev => [...prev, dept])
      setNewName(''); setAdding(false)
      showToast(`Отдел «${dept.name}» создан`)
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return
    try {
      const dept = await api.adminUpdateDepartment(id, { name: editName.trim() })
      setItems(prev => prev.map(d => d.id === id ? dept : d))
      setEditId(null)
      showToast('Отдел обновлён')
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleDelete = async (dept: ApiDepartment) => {
    try {
      const res = await api.adminDeleteDepartment(dept.id)
      if (res.soft_disabled) {
        setItems(prev => prev.map(d => d.id === dept.id ? { ...d, is_active: 0 } : d))
        showToast(res.error ?? 'Отдел деактивирован')
      } else {
        setItems(prev => prev.filter(d => d.id !== dept.id))
        showToast(`Отдел «${dept.name}» удалён`)
      }
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  if (loading) return <div className="text-center py-6 text-sm" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>{items.length} отделов</span>
        <button onClick={() => { setAdding(v => !v); setNewName('') }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--brand-orange)', border: '1px solid rgba(255,107,0,0.3)' }}>
          <IconPlus /> Добавить
        </button>
      </div>

      {adding && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.2)' }}>
          <InlineInput value={newName} onChange={setNewName} placeholder="Название отдела" className="flex-1" />
          <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'var(--brand-orange)', color: '#fff' }}>ОК</button>
          <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-3)' }}>✕</button>
        </motion.div>
      )}

      {items.map(dept => (
        <motion.div key={dept.id} layout
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: dept.is_active ? 'rgba(255,255,255,0.04)' : 'rgba(255,60,60,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {editId === dept.id ? (
            <>
              <InlineInput value={editName} onChange={setEditName} className="flex-1" />
              <button onClick={() => handleEdit(dept.id)} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ background: 'var(--brand-orange)', color: '#fff' }}>ОК</button>
              <button onClick={() => setEditId(null)} className="px-2.5 py-1 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-3)' }}>✕</button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium" style={{ color: dept.is_active ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                {dept.name}
                {!dept.is_active && <span className="ml-2 text-xs" style={{ color: '#ff6b6b' }}>деактивирован</span>}
              </span>
              <ActionBtn onClick={() => { setEditId(dept.id); setEditName(dept.name) }} title="Изменить">
                <IconEdit />
              </ActionBtn>
              <ActionBtn onClick={() => handleDelete(dept)} danger title="Удалить">
                <IconTrash />
              </ActionBtn>
            </>
          )}
        </motion.div>
      ))}
    </div>
  )
}

// ── секция Хобби ─────────────────────────────────────────────────────────────
function HobbiesSection({ showToast }: { showToast: (m: string) => void }) {
  const [items, setItems] = useState<ApiHobby[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [addingParent, setAddingParent] = useState(false)
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null)
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editEmoji, setEditEmoji] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.adminGetHobbies()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const parents = items.filter(h => h.parent_id === null)
  const childrenOf = (pid: string) => items.filter(h => h.parent_id === pid)

  const handleAddParent = async () => {
    if (!newLabel.trim()) return
    try {
      const h = await api.adminCreateHobby({ label: newLabel.trim(), emoji: newEmoji.trim() })
      setItems(prev => [...prev, h]); setNewLabel(''); setNewEmoji(''); setAddingParent(false)
      showToast(`Категория «${h.label}» создана`)
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleAddChild = async (parentId: string) => {
    if (!newLabel.trim()) return
    try {
      const h = await api.adminCreateHobby({ label: newLabel.trim(), emoji: newEmoji.trim(), parent_id: parentId })
      setItems(prev => [...prev, h]); setNewLabel(''); setNewEmoji(''); setAddingChildFor(null)
      showToast(`Хобби «${h.label}» создано`)
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleEdit = async (id: string) => {
    try {
      const h = await api.adminUpdateHobby(id, { label: editLabel.trim(), emoji: editEmoji.trim() })
      setItems(prev => prev.map(x => x.id === id ? h : x)); setEditId(null)
      showToast('Обновлено')
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleDelete = async (hobby: ApiHobby) => {
    try {
      const res = await api.adminDeleteHobby(hobby.id)
      if (res.soft_disabled) {
        setItems(prev => prev.map(h =>
          h.id === hobby.id || h.parent_id === hobby.id ? { ...h, is_active: 0 } : h
        ))
        showToast(res.error ?? 'Деактивировано')
      } else {
        setItems(prev => prev.filter(h => h.id !== hobby.id && h.parent_id !== hobby.id))
        showToast(`«${hobby.label}» удалено`)
      }
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const toggleExpand = (id: string) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  const AddForm = ({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) => (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className="flex gap-2 p-2 rounded-xl mt-1" style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.2)' }}>
      <InlineInput value={newEmoji} onChange={setNewEmoji} placeholder="🎯" className="w-14 text-center" />
      <InlineInput value={newLabel} onChange={setNewLabel} placeholder="Название" className="flex-1" />
      <button onClick={onSave} className="px-3 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'var(--brand-orange)', color: '#fff' }}>ОК</button>
      <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs"
        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-3)' }}>✕</button>
    </motion.div>
  )

  if (loading) return <div className="text-center py-6 text-sm" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>{parents.length} категорий</span>
        <button onClick={() => { setAddingParent(v => !v); setNewLabel(''); setNewEmoji('') }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--brand-orange)', border: '1px solid rgba(255,107,0,0.3)' }}>
          <IconPlus /> Категория
        </button>
      </div>

      {addingParent && <AddForm onSave={handleAddParent} onCancel={() => setAddingParent(false)} />}

      {parents.map(parent => {
        const children = childrenOf(parent.id)
        const open = expanded.has(parent.id)
        return (
          <div key={parent.id}>
            {/* Родительская строка */}
            <motion.div layout className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer"
              style={{ background: parent.is_active ? 'rgba(255,255,255,0.06)' : 'rgba(255,60,60,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
              onClick={() => toggleExpand(parent.id)}>
              {editId === parent.id ? (
                <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                  <InlineInput value={editEmoji} onChange={setEditEmoji} className="w-14 text-center" />
                  <InlineInput value={editLabel} onChange={setEditLabel} className="flex-1" />
                  <button onClick={() => handleEdit(parent.id)} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--brand-orange)', color: '#fff' }}>ОК</button>
                  <button onClick={() => setEditId(null)} className="px-2 py-1 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-3)' }}>✕</button>
                </div>
              ) : (
                <>
                  <span className="text-base">{parent.emoji}</span>
                  <span className="flex-1 text-sm font-semibold" style={{ color: parent.is_active ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                    {parent.label}
                    <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--fg-3)' }}>{children.length}</span>
                    {!parent.is_active && <span className="ml-2 text-xs" style={{ color: '#ff6b6b' }}>деактивирована</span>}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--fg-3)' }}>{open ? '▲' : '▼'}</span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <ActionBtn onClick={() => { setAddingChildFor(addingChildFor === parent.id ? null : parent.id); setNewLabel(''); setNewEmoji('') }} title="Добавить хобби">
                      <IconPlus />
                    </ActionBtn>
                    <ActionBtn onClick={() => { setEditId(parent.id); setEditLabel(parent.label); setEditEmoji(parent.emoji ?? '') }} title="Изменить">
                      <IconEdit />
                    </ActionBtn>
                    <ActionBtn onClick={() => handleDelete(parent)} danger title="Удалить">
                      <IconTrash />
                    </ActionBtn>
                  </div>
                </>
              )}
            </motion.div>

            {/* Форма добавления хобби в эту категорию */}
            {addingChildFor === parent.id && (
              <div className="ml-4">
                <AddForm onSave={() => handleAddChild(parent.id)} onCancel={() => setAddingChildFor(null)} />
              </div>
            )}

            {/* Дочерние хобби */}
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="ml-4 flex flex-col gap-1 mt-1 overflow-hidden">
                  {children.map(child => (
                    <div key={child.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ background: child.is_active ? 'rgba(255,255,255,0.03)' : 'rgba(255,60,60,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {editId === child.id ? (
                        <>
                          <InlineInput value={editEmoji} onChange={setEditEmoji} className="w-14 text-center" />
                          <InlineInput value={editLabel} onChange={setEditLabel} className="flex-1" />
                          <button onClick={() => handleEdit(child.id)} className="px-2.5 py-1 rounded-lg text-xs font-bold"
                            style={{ background: 'var(--brand-orange)', color: '#fff' }}>ОК</button>
                          <button onClick={() => setEditId(null)} className="px-2 py-1 rounded-lg text-xs"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-3)' }}>✕</button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm">{child.emoji}</span>
                          <span className="flex-1 text-xs font-medium" style={{ color: child.is_active ? 'var(--fg-2)' : 'var(--fg-3)' }}>
                            {child.label}
                            {!child.is_active && <span className="ml-1" style={{ color: '#ff6b6b' }}>×</span>}
                          </span>
                          <ActionBtn onClick={() => { setEditId(child.id); setEditLabel(child.label); setEditEmoji(child.emoji ?? '') }} title="Изменить">
                            <IconEdit />
                          </ActionBtn>
                          <ActionBtn onClick={() => handleDelete(child)} danger title="Удалить">
                            <IconTrash />
                          </ActionBtn>
                        </>
                      )}
                    </div>
                  ))}
                  {children.length === 0 && (
                    <p className="text-xs px-3 py-1" style={{ color: 'var(--fg-3)' }}>Нет хобби в категории</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

// ── секция Реакции ────────────────────────────────────────────────────────────
function ReactionsSection({ showToast }: { showToast: (m: string) => void }) {
  const [items, setItems] = useState<ApiReactionType[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newEmoji, setNewEmoji] = useState('')
  const [newLabel, setNewLabel] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.adminGetReactionTypes()) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!newEmoji.trim() || !newLabel.trim()) return
    try {
      const rt = await api.adminCreateReactionType({ emoji: newEmoji.trim(), label: newLabel.trim() })
      setItems(prev => [...prev, rt]); setNewEmoji(''); setNewLabel(''); setAdding(false)
      showToast(`Реакция «${rt.label}» добавлена`)
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  const handleDelete = async (rt: ApiReactionType) => {
    try {
      await api.adminDeleteReactionType(rt.id)
      setItems(prev => prev.filter(r => r.id !== rt.id))
      showToast(`«${rt.label}» удалена`)
    } catch (e: unknown) { showToast((e as Error).message) }
  }

  if (loading) return <div className="text-center py-6 text-sm" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--fg-3)' }}>{items.length} реакций</span>
        <button onClick={() => { setAdding(v => !v); setNewEmoji(''); setNewLabel('') }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--brand-orange)', border: '1px solid rgba(255,107,0,0.3)' }}>
          <IconPlus /> Добавить
        </button>
      </div>

      {adding && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-2 p-2 rounded-xl" style={{ background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.2)' }}>
          <InlineInput value={newEmoji} onChange={setNewEmoji} placeholder="🎉" className="w-14 text-center" />
          <InlineInput value={newLabel} onChange={setNewLabel} placeholder="Название реакции" className="flex-1" />
          <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{ background: 'var(--brand-orange)', color: '#fff' }}>ОК</button>
          <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--fg-3)' }}>✕</button>
        </motion.div>
      )}

      {items.map(rt => (
        <motion.div key={rt.id} layout
          className="flex items-center gap-3 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-xl">{rt.emoji}</span>
          <span className="flex-1 text-sm font-medium" style={{ color: 'var(--fg-1)' }}>{rt.label}</span>
          <ActionBtn onClick={() => handleDelete(rt)} danger title="Удалить">
            <IconTrash />
          </ActionBtn>
        </motion.div>
      ))}
    </div>
  )
}

// ── вкладка "Справочники" (обёртка) ─────────────────────────────────────────
function RefsTab() {
  const [section, setSection] = useState<RefsSection>('departments')
  const [toast, setToast] = useState<string | null>(null)

  const SECTIONS: { id: RefsSection; label: string }[] = [
    { id: 'departments', label: 'Отделы' },
    { id: 'hobbies',     label: 'Хобби' },
    { id: 'reactions',   label: 'Реакции' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Под-табы */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: section === s.id ? 'rgba(255,107,0,0.20)' : 'transparent',
              color: section === s.id ? 'var(--brand-orange)' : 'var(--fg-3)',
              border: section === s.id ? '1px solid rgba(255,107,0,0.28)' : '1px solid transparent',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Контент секции */}
      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
          {section === 'departments' && <DepartmentsSection showToast={m => setToast(m)} />}
          {section === 'hobbies'     && <HobbiesSection     showToast={m => setToast(m)} />}
          {section === 'reactions'   && <ReactionsSection   showToast={m => setToast(m)} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── вкладка "AI" ─────────────────────────────────────────────────────────────
const PROVIDER_DEFAULTS: Record<string, { label: string; baseUrlHint: string }> = {
  anthropic: { label: 'Anthropic (Claude)',   baseUrlHint: 'http://172.29.172.1:9000' },
  openai:    { label: 'OpenAI (GPT)',         baseUrlHint: 'http://172.29.172.1:9004' },
  google:    { label: 'Google (Gemini)',      baseUrlHint: 'http://172.29.172.1:9002' },
  cursor:    { label: 'Cursor API',           baseUrlHint: 'http://172.29.172.1:9003' },
}

function AiTab() {
  const [provider, setProvider]   = useState('anthropic')
  const [apiKey,   setApiKey]     = useState('')
  const [baseUrl,  setBaseUrl]    = useState('')
  const [model,    setModel]      = useState('')
  const [models,   setModels]     = useState<string[]>([])
  const [showKey,  setShowKey]    = useState(false)
  const [loading,  setLoading]    = useState(true)
  const [fetching, setFetching]   = useState(false)
  const [saving,   setSaving]     = useState(false)
  const [toast,    setToast]      = useState<string | null>(null)

  useEffect(() => {
    api.adminGetLlmSettings().then(s => {
      if (s.llm_provider) setProvider(s.llm_provider)
      if (s.llm_base_url) setBaseUrl(s.llm_base_url)
      if (s.llm_model)    setModel(s.llm_model)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleProviderChange = (p: string) => {
    setProvider(p)
    setModels([])
    setBaseUrl(PROVIDER_DEFAULTS[p]?.baseUrlHint ?? '')
  }

  const handleLoadModels = async () => {
    setFetching(true)
    try {
      const res = await api.adminGetLlmModels()
      setModels(res.models)
      if (res.models.length === 0) setToast('Провайдер вернул пустой список')
      else setToast(`Загружено ${res.models.length} моделей`)
    } catch (e: unknown) {
      setToast((e as Error).message)
    } finally { setFetching(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Partial<ApiLlmSettings> = {
        llm_provider: provider,
        llm_model:    model,
        llm_base_url: baseUrl || undefined,
      }
      if (apiKey) payload.llm_api_key = apiKey
      await api.adminSetLlmSettings(payload)
      setApiKey('')
      setToast('Настройки сохранены')
    } catch (e: unknown) {
      setToast((e as Error).message)
    } finally { setSaving(false) }
  }

  const fieldStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: 'var(--fg-1)',
  }
  const labelStyle = { color: 'var(--fg-3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }

  if (loading) return <div className="py-8 text-center text-sm" style={{ color: 'var(--fg-3)' }}>Загрузка...</div>

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div style={labelStyle} className="mb-1">Провайдер</div>
        <select
          value={provider}
          onChange={e => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={fieldStyle}
        >
          {Object.entries(PROVIDER_DEFAULTS).map(([k, v]) => (
            <option key={k} value={k} style={{ background: '#2d2d2d' }}>{v.label}</option>
          ))}
        </select>
      </div>

      <div>
        <div style={labelStyle} className="mb-1">API ключ</div>
        <div className="flex gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Оставьте пустым, чтобы не менять"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={fieldStyle}
          />
          <button
            onClick={() => setShowKey(s => !s)}
            className="px-3 py-2 rounded-lg text-xs"
            style={{ ...fieldStyle, flexShrink: 0 }}
          >
            {showKey ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div>
        <div style={labelStyle} className="mb-1">
          Base URL <span style={{ color: 'var(--fg-3)', fontWeight: 400, textTransform: 'none' }}>(прокси, если нужен)</span>
        </div>
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder={PROVIDER_DEFAULTS[provider]?.baseUrlHint || 'https://...'}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={fieldStyle}
        />
      </div>

      <div>
        <div style={labelStyle} className="mb-1">Модель</div>
        <div className="flex gap-2">
          <input
            list="llm-models-list"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="Введите или загрузите список"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={fieldStyle}
          />
          <datalist id="llm-models-list">
            {models.map(m => <option key={m} value={m} />)}
          </datalist>
          <button
            onClick={handleLoadModels}
            disabled={fetching}
            className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50 flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-1)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            {fetching ? '...' : '🔄'}
          </button>
        </div>
        {models.length > 0 && (
          <div className="text-xs mt-1" style={{ color: 'var(--fg-3)' }}>Загружено {models.length} моделей</div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
        style={{ background: 'var(--brand-orange)', color: '#fff' }}
      >
        {saving ? 'Сохраняем...' : 'Сохранить настройки'}
      </button>

      <p className="text-center text-[11px]" style={{ color: 'var(--fg-3)' }}>
        Сначала сохраните ключ, затем нажмите 🔄 для загрузки моделей
      </p>

      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── вкладка "Аналитика" ──────────────────────────────────────────────────────
const AVATAR_TONES = [
  'linear-gradient(135deg,#FF8A33,#FF6B00)',
  'linear-gradient(135deg,#5b6cff,#3a4be0)',
  'linear-gradient(135deg,#34D399,#0EA371)',
  'linear-gradient(135deg,#B388FF,#7C4DFF)',
  'linear-gradient(135deg,#FF8FAB,#E94B7C)',
]
const toneFor = (id: string) => AVATAR_TONES[id.charCodeAt(0) % AVATAR_TONES.length]

const MEDALS = ['🥇', '🥈', '🥉']

function AnalyticsTab() {
  const [stats, setStats] = useState<ApiReactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    api.adminGetReactionStats()
      .then(setStats)
      .catch(() => setToast('Не удалось загрузить статистику'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  )

  if (!stats || (!stats.topTotal.length && !stats.topByEmoji.length)) return (
    <div className="text-center py-12">
      <div className="text-4xl mb-3">📊</div>
      <p className="text-sm font-bold" style={{ color: 'var(--fg-3)' }}>Реакций ещё нет</p>
      <p className="text-xs mt-1" style={{ color: 'var(--fg-3)', opacity: 0.6 }}>Попросите участников поставить реакции на профили</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>

      {/* Топ-3 по всем реакциям */}
      {stats.topTotal.length > 0 && (
        <section>
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--fg-3)' }}>
            ⭐ Звёзды вечера — топ по всем реакциям
          </h3>
          <div className="space-y-2">
            {stats.topTotal.slice(0, 3).map((u, i) => (
              <motion.div
                key={u.user_id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: i === 0 ? 'rgba(255,107,0,0.12)' : 'rgba(255,255,255,0.04)', border: i === 0 ? '1px solid rgba(255,107,0,0.25)' : '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-xl w-7 text-center shrink-0">{MEDALS[i] ?? `#${i + 1}`}</span>
                <div className="w-10 h-10 rounded-full grid place-items-center text-white font-black text-[16px] shrink-0 border border-white/15"
                  style={{ background: toneFor(u.user_id) }}>
                  {(u.name ?? '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[14px] truncate" style={{ color: 'var(--fg-1)' }}>{u.name ?? 'Без имени'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[18px] font-black" style={{ color: i === 0 ? '#FF6B00' : 'var(--fg-1)' }}>{u.total}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--fg-3)' }}>реакций</div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Лидеры по каждому эмодзи */}
      {stats.topByEmoji.length > 0 && (
        <section>
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--fg-3)' }}>
            🏅 Номинации
          </h3>
          <div className="space-y-3">
            {stats.topByEmoji.map((cat: ApiReactionStatEmoji) => (
              <div key={cat.reaction_type_id}
                className="rounded-xl p-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[12px] font-black" style={{ color: 'var(--fg-2)' }}>Больше всего «{cat.label}»</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {cat.leaders.map((leader, j) => (
                    <div key={leader.user_id} className="flex items-center gap-2">
                      <span className="text-sm w-5 text-center">{MEDALS[j] ?? `${j + 1}.`}</span>
                      <div className="w-7 h-7 rounded-full grid place-items-center text-white font-black text-[12px] shrink-0"
                        style={{ background: toneFor(leader.user_id) }}>
                        {(leader.name ?? '?')[0]}
                      </div>
                      <span className="flex-1 text-[13px] font-semibold truncate" style={{ color: 'var(--fg-1)' }}>
                        {leader.name ?? 'Без имени'}
                      </span>
                      <span className="text-[13px] font-black" style={{ color: 'var(--brand-orange)' }}>
                        {leader.count} {cat.emoji}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── главный компонент ────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string }[] = [
  { id: 'users',     label: 'Пользователи' },
  { id: 'logs',      label: 'Логи' },
  { id: 'smtp',      label: 'SMTP' },
  { id: 'refs',      label: 'Справочники' },
  { id: 'ai',        label: 'AI' },
  { id: 'analytics', label: 'Аналитика' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium mb-2"
            style={{ color: 'var(--fg-3)' }}
          >
            ← Назад
          </button>
          <h1 className="text-xl font-bold" style={{ color: 'var(--fg-1)' }}>Панель администратора</h1>
          <p className="text-sm" style={{ color: 'var(--fg-3)' }}>БСО Tinder · управление</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-1 p-1 rounded-2xl flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="shrink-0 py-2 px-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(255,107,0,0.22)' : 'transparent',
                color: activeTab === tab.id ? 'var(--brand-orange)' : 'var(--fg-3)',
                border: activeTab === tab.id ? '1px solid rgba(255,107,0,0.30)' : '1px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
        </motion.div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
          className="glass-1 rounded-2xl p-5">
          <AnimatePresence mode="wait">
            {activeTab === 'users'     && <UsersTab />}
            {activeTab === 'logs'      && <LogsTab />}
            {activeTab === 'smtp'      && <SmtpTab />}
            {activeTab === 'refs'      && <RefsTab />}
            {activeTab === 'ai'        && <AiTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  )
}
