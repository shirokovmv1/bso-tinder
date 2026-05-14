import { useAppStore } from '@/store/useAppStore'

const BASE = '/api'

function normalizeUser(raw: any): ApiUser {
  return {
    ...raw,
    avatar_url: raw?.avatar_url ?? raw?.avatarUrl ?? null,
    badge_id: raw?.badge_id ?? raw?.badgeId ?? null,
    onboarding_done: raw?.onboarding_done ?? raw?.onboardingDone ?? 0,
    is_admin: raw?.is_admin ?? raw?.isAdmin ?? 0,
    experience_months: raw?.experience_months ?? raw?.experienceMonths,
    reaction_counts: raw?.reaction_counts ?? raw?.reactionCounts,
  } as ApiUser
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAppStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    useAppStore.getState().logout()
    window.dispatchEvent(new CustomEvent('app:unauthorized'))
    throw new Error('Unauthorized')
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('text/csv')) {
    if (!res.ok) throw new Error('Ошибка сервера')
    return await res.blob() as T
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Ошибка сервера')
  return data as T
}

export const api = {
  // Auth — TEST: упрощённый вход admin/admin
  devLogin: (login: string, password: string) =>
    request<{ token: string; user: any }>('/auth/dev-login', {
      method: 'POST', body: JSON.stringify({ login, password }),
    }).then((res) => ({ ...res, user: normalizeUser(res.user) })),

  // Auth
  sendOtp:   (email: string) =>
    request<{ success: boolean; message: string }>('/auth/send-otp', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, code: string) =>
    request<{ token: string; user: any }>('/auth/verify-otp', {
      method: 'POST', body: JSON.stringify({ email, code }),
    }).then((res) => ({ ...res, user: normalizeUser(res.user) })),

  magicLogin: (token: string) =>
    request<{ token: string; user: any }>('/auth/magic-login', {
      method: 'POST', body: JSON.stringify({ token }),
    }).then((res) => ({ ...res, user: normalizeUser(res.user) })),

  // Users
  getUsers:  () => request<any[]>('/users').then((rows) => rows.map(normalizeUser)),
  getMe:     () => request<any>('/users/me').then(normalizeUser),
  getUser:   (id: string) => request<any>(`/users/${id}`).then(normalizeUser),
  updateMe:  (id: string, body: Partial<ApiUser> & { hobbyIds?: string[] }) =>
    request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }).then(normalizeUser),
  getHobbies: () => request<ApiHobby[]>('/users/hobbies/all'),
  getHealth:  () => request<{ status: string; db?: string; env?: string; error?: string }>('/health'),

  // Departments (public)
  getDepartments: () => request<ApiDepartment[]>('/departments'),

  // Match
  computeMatch: (userAId: string, userBId: string) =>
    request<ApiMatchResult>('/match', { method: 'POST', body: JSON.stringify({ userAId, userBId }) }),
  computeMyMatches: () =>
    request<ApiDepartmentMatchResponse>('/match/me', { method: 'POST' }),

  // ── Admin: Users ──────────────────────────────────────────────────────────
  adminUsers:       () => request<any[]>('/admin/users').then((rows) => rows.map(normalizeUser)),
  adminBanUser:     (id: string) => request<{ id: string; is_banned: number }>(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  adminDelUser:     (id: string) => request<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminLogs:        () => request<{ lines: string[] }>('/admin/logs'),
  adminGetSmtp:     () => request<Record<string, string>>('/admin/settings'),
  adminSetSmtp:     (data: Record<string, string>) => request<{ success: boolean }>('/admin/settings/smtp', { method: 'PUT', body: JSON.stringify(data) }),
  adminSeed:        () => request<{ success: boolean; inserted: number }>('/admin/seed', { method: 'POST' }),
  adminGetMagicLink: (id: string) => request<{ token: string; magic_url: string }>(`/admin/magic-link/${id}`),
  adminGetCsvExport: () => request<Blob>('/admin/users/csv', { headers: { Accept: 'text/csv' } } as RequestInit),
  adminImportCsv: (csvBase64: string) =>
    request<ApiCsvImportResult>('/admin/users/import-csv', { method: 'POST', body: JSON.stringify({ csvBase64 }) }),

  // ── Admin: Departments ────────────────────────────────────────────────────
  adminGetDepartments: () =>
    request<ApiDepartment[]>('/admin/departments'),
  adminCreateDepartment: (data: { name: string; sort_order?: number }) =>
    request<ApiDepartment>('/admin/departments', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateDepartment: (id: string, data: Partial<Pick<ApiDepartment, 'name' | 'sort_order' | 'is_active'>>) =>
    request<ApiDepartment>(`/admin/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteDepartment: (id: string) =>
    request<{ success?: boolean; soft_disabled?: boolean; error?: string }>(`/admin/departments/${id}`, { method: 'DELETE' }),

  // ── Admin: Hobbies ────────────────────────────────────────────────────────
  adminGetHobbies: () =>
    request<ApiHobby[]>('/admin/hobbies'),
  adminCreateHobby: (data: { label: string; emoji?: string; parent_id?: string | null; sort_order?: number }) =>
    request<ApiHobby>('/admin/hobbies', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateHobby: (id: string, data: Partial<Pick<ApiHobby, 'label' | 'emoji' | 'sort_order' | 'is_active'>>) =>
    request<ApiHobby>(`/admin/hobbies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteHobby: (id: string) =>
    request<{ success?: boolean; soft_disabled?: boolean; error?: string }>(`/admin/hobbies/${id}`, { method: 'DELETE' }),

  // ── Admin: Reaction types ─────────────────────────────────────────────────
  adminGetReactionTypes: () =>
    request<ApiReactionType[]>('/admin/reaction-types'),
  adminCreateReactionType: (data: { emoji: string; label: string; sort_order?: number }) =>
    request<ApiReactionType>('/admin/reaction-types', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateReactionType: (id: string, data: Partial<Pick<ApiReactionType, 'emoji' | 'label' | 'sort_order' | 'is_active'>>) =>
    request<ApiReactionType>(`/admin/reaction-types/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteReactionType: (id: string) =>
    request<{ success: boolean }>(`/admin/reaction-types/${id}`, { method: 'DELETE' }),

  // ── Admin: LLM настройки ──────────────────────────────────────────────────
  adminGetLlmSettings: () =>
    request<ApiLlmSettings>('/admin/settings/llm'),
  adminSetLlmSettings: (data: Partial<ApiLlmSettings>) =>
    request<{ success: boolean }>('/admin/settings/llm', { method: 'PUT', body: JSON.stringify(data) }),
  adminGetLlmModels: () =>
    request<{ provider: string; models: string[] }>('/admin/settings/llm/models'),

  // ── Reactions ─────────────────────────────────────────────────────────────
  getReactionTypes: () => request<ApiReactionType[]>('/reactions/types'),
  getMyReactionsSent: () => request<{ from_user_id: string; to_user_id: string; emoji_type: string }[]>('/reactions/sent'),
  sendReaction: (to_user_id: string, reaction_type_id: string) =>
    request<{ action: 'added' | 'removed'; id?: string }>('/reactions', {
      method: 'POST', body: JSON.stringify({ to_user_id, reaction_type_id }),
    }),
  // Альтернативный маршрут POST /api/users/:id/react
  reactToUser: (userId: string, emojiType: string) =>
    request<{ action: 'added' | 'removed'; id?: string }>(`/users/${userId}/react`, {
      method: 'POST', body: JSON.stringify({ emoji_type: emojiType }),
    }),

  // ── Admin: аналитика ──────────────────────────────────────────────────────
  adminGetReactionStats: () => request<ApiReactionStats>('/admin/stats/reactions'),
}

// ── Типы API-ответов ─────────────────────────────────────────────────────────

export interface ApiDepartment {
  id: string
  name: string
  sort_order: number
  is_active: number
}

export interface ApiHobby {
  id: string
  parent_id: string | null
  label: string
  emoji: string
  sort_order: number
  is_active: number
}

export interface ApiReactionType {
  id: string
  emoji: string
  label: string
  sort_order: number
  is_active: number
}

export interface ApiReactionCount {
  reaction_type_id: string
  emoji: string
  label: string
  count: number
}

export interface ApiUser {
  id: string
  email: string
  name: string | null
  department: string | null
  last_name?: string | null
  first_name?: string | null
  middle_name?: string | null
  position?: string | null
  birthday_day?: number | null
  birthday_month?: number | null
  about_short?: string | null
  work_details?: string | null
  current_interests?: string | null
  last_movies?: string | null
  last_books?: string | null
  last_songs?: string | null
  avatar_url: string | null
  badge_id: string | null
  onboarding_done: number | boolean
  is_admin: number | boolean
  is_banned?: number | boolean
  created_at?: string
  hobbies?: ApiHobby[]
  // Новые поля
  gender?: string
  experience_months?: number
  zodiac_sign?: string | null
  fav_color?: string | null
  pitch?: string
  badge_title?: string
  badge_emoji?: string
  badge_reason?: string
  reaction_counts?: ApiReactionCount[]
}

export interface ApiCsvImportResult {
  success: boolean
  created: number
  updated: number
  errors: Array<{ line: number; error: string }>
}

export interface ApiLlmSettings {
  llm_provider: string   // 'openai' | 'anthropic' | 'custom'
  llm_api_key: string    // masked on GET
  llm_model: string
  llm_base_url?: string  // для custom-провайдеров
}

export interface ApiMatchResult {
  id: string
  score: number
  icebreaker: string
  sharedHobbies: ApiHobby[]
  uniqueA: ApiHobby[]
  uniqueB: ApiHobby[]
}

export interface ApiMatchedUser {
  user: Pick<ApiUser, 'id' | 'name' | 'department' | 'position' | 'avatar_url' | 'badge_id' | 'badge_title' | 'badge_emoji' | 'pitch'>
  score: number
  level: { id: string; label: string }
  pitch: string
  sharedHobbies: ApiHobby[]
}

export interface ApiDepartmentMatchGroup {
  department: string
  count: number
  matches: ApiMatchedUser[]
}

export interface ApiDepartmentMatchResponse {
  groups: ApiDepartmentMatchGroup[]
  total: number
  emptyMessage: string
}

export interface ApiReactionStatUser {
  user_id: string
  name: string | null
  avatar_url: string | null
  total: number
}

export interface ApiReactionStatEmoji {
  reaction_type_id: string
  emoji: string
  label: string
  leaders: Array<{ user_id: string; name: string | null; avatar_url: string | null; count: number }>
}

export interface ApiReactionStats {
  topTotal: ApiReactionStatUser[]
  topByEmoji: ApiReactionStatEmoji[]
}
