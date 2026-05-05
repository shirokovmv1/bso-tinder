import { useAppStore } from '@/store/useAppStore'

const BASE = '/api'

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
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Ошибка сервера')
  return data as T
}

export const api = {
  // Auth
  sendOtp:   (email: string) =>
    request<{ success: boolean; message: string }>('/auth/send-otp', {
      method: 'POST', body: JSON.stringify({ email }),
    }),

  verifyOtp: (email: string, code: string) =>
    request<{ token: string; user: ApiUser }>('/auth/verify-otp', {
      method: 'POST', body: JSON.stringify({ email, code }),
    }),

  magicLogin: (token: string) =>
    request<{ token: string; user: ApiUser }>('/auth/magic-login', {
      method: 'POST', body: JSON.stringify({ token }),
    }),

  // Users
  getUsers:  () => request<ApiUser[]>('/users'),
  getMe:     () => request<ApiUser>('/users/me'),
  getUser:   (id: string) => request<ApiUser>(`/users/${id}`),
  updateMe:  (id: string, body: Partial<ApiUser> & { hobbyIds?: string[] }) =>
    request<ApiUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  getHobbies: () => request<ApiHobby[]>('/users/hobbies/all'),

  // Departments (public)
  getDepartments: () => request<ApiDepartment[]>('/departments'),

  // Match
  computeMatch: (userAId: string, userBId: string) =>
    request<ApiMatchResult>('/match', { method: 'POST', body: JSON.stringify({ userAId, userBId }) }),

  // ── Admin: Users ──────────────────────────────────────────────────────────
  adminUsers:       () => request<ApiUser[]>('/admin/users'),
  adminBanUser:     (id: string) => request<{ id: string; is_banned: number }>(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  adminDelUser:     (id: string) => request<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminLogs:        () => request<{ lines: string[] }>('/admin/logs'),
  adminGetSmtp:     () => request<Record<string, string>>('/admin/settings'),
  adminSetSmtp:     (data: Record<string, string>) => request<{ success: boolean }>('/admin/settings/smtp', { method: 'PUT', body: JSON.stringify(data) }),
  adminSeed:        () => request<{ success: boolean; inserted: number }>('/admin/seed', { method: 'POST' }),
  adminGetMagicLink: (id: string) => request<{ token: string; magic_url: string }>(`/admin/magic-link/${id}`),
  adminGetCsvExport: () => request<Blob>('/admin/users/csv', { headers: { Accept: 'text/csv' } } as RequestInit),

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

export interface ApiUser {
  id: string
  email: string
  name: string | null
  department: string | null
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
  pitch?: string
  badge_title?: string
  badge_emoji?: string
  badge_reason?: string
}

export interface ApiMatchResult {
  id: string
  score: number
  icebreaker: string
  sharedHobbies: ApiHobby[]
  uniqueA: ApiHobby[]
  uniqueB: ApiHobby[]
}
