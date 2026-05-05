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

  // Match
  computeMatch: (userAId: string, userBId: string) =>
    request<ApiMatchResult>('/match', { method: 'POST', body: JSON.stringify({ userAId, userBId }) }),

  // Admin
  adminUsers:    () => request<ApiUser[]>('/admin/users'),
  adminBanUser:  (id: string) => request<{ id: string; is_banned: number }>(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  adminDelUser:  (id: string) => request<{ success: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
  adminLogs:     () => request<{ lines: string[] }>('/admin/logs'),
  adminGetSmtp:  () => request<Record<string, string>>('/admin/settings'),
  adminSetSmtp:  (data: Record<string, string>) => request<{ success: boolean }>('/admin/settings/smtp', { method: 'PUT', body: JSON.stringify(data) }),
  adminSeed:        () => request<{ success: boolean; inserted: number }>('/admin/seed', { method: 'POST' }),
  adminGetMagicLink: (id: string) => request<{ token: string; magic_url: string }>(`/admin/magic-link/${id}`),
  adminGetCsvExport: () => request<Blob>('/admin/users/csv', { headers: { Accept: 'text/csv' } } as RequestInit),
}

// Типы API-ответов
export interface ApiHobby {
  id: string; label: string; emoji: string; category: string
}
export interface ApiUser {
  id: string; email: string; name: string | null; department: string | null
  avatar_url: string | null; badge_id: string | null
  onboarding_done: number | boolean; is_admin: number | boolean; is_banned?: number | boolean
  created_at?: string; hobbies?: ApiHobby[]
}
export interface ApiMatchResult {
  id: string; score: number; icebreaker: string
  sharedHobbies: ApiHobby[]; uniqueA: ApiHobby[]; uniqueB: ApiHobby[]
}
