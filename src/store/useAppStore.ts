import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiUser, ApiHobby, ApiMatchResult } from '@/api/client'

interface AppState {
  // Auth
  token: string | null
  currentUser: ApiUser | null
  isAdmin: boolean

  // Онбординг
  onboardingStep: 0 | 1 | 2 | 3
  nameInput: string
  departmentInput: string
  photoUrl: string
  selectedHobbies: ApiHobby[]

  // Лента
  employees: ApiUser[]
  searchQuery: string

  // Мэтчинг
  matchCandidates: [ApiUser | null, ApiUser | null]
  matchResult: ApiMatchResult | null

  // Экшены — auth
  setToken: (token: string, user: ApiUser) => void
  logout: () => void

  // Экшены — онбординг
  setOnboardingStep: (step: 0 | 1 | 2 | 3) => void
  setNameInput: (v: string) => void
  setDepartmentInput: (v: string) => void
  setPhotoUrl: (v: string) => void
  toggleHobby: (hobby: ApiHobby) => void
  setCurrentUser: (user: ApiUser) => void

  // Экшены — лента
  setEmployees: (list: ApiUser[]) => void
  setSearchQuery: (q: string) => void

  // Экшены — мэтчинг
  setMatchCandidate: (slot: 0 | 1, user: ApiUser | null) => void
  setMatchResult: (r: ApiMatchResult | null) => void
  clearMatch: () => void
}

function toPersistedUserLite(user: ApiUser | null) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    is_admin: user.is_admin,
    onboarding_done: user.onboarding_done,
    name: user.name ?? null,
    department: user.department ?? null,
    avatar_url: null,
    badge_id: user.badge_id ?? null,
  } as ApiUser
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      token: null,
      currentUser: null,
      isAdmin: false,

      onboardingStep: 0,
      nameInput: '',
      departmentInput: '',
      photoUrl: '',
      selectedHobbies: [],

      employees: [],
      searchQuery: '',

      matchCandidates: [null, null],
      matchResult: null,

      setToken: (token, user) => set({
        token,
        currentUser: user,
        isAdmin: !!user.is_admin,
      }),

      logout: () => set({
        token: null,
        currentUser: null,
        isAdmin: false,
        onboardingStep: 0,
        nameInput: '',
        departmentInput: '',
        photoUrl: '',
        selectedHobbies: [],
      }),

      setOnboardingStep: (step) => set({ onboardingStep: step }),
      setNameInput: (v) => set({ nameInput: v }),
      setDepartmentInput: (v) => set({ departmentInput: v }),
      setPhotoUrl: (v) => set({ photoUrl: v }),

      toggleHobby: (hobby) => {
        const { selectedHobbies } = get()
        const exists = selectedHobbies.find(h => h.id === hobby.id)
        set({
          selectedHobbies: exists
            ? selectedHobbies.filter(h => h.id !== hobby.id)
            : [...selectedHobbies, hobby],
        })
      },

      setCurrentUser: (user) => set({ currentUser: user, isAdmin: !!user.is_admin }),
      setEmployees: (list) => set({ employees: list }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      setMatchCandidate: (slot, user) => {
        const next = [...get().matchCandidates] as [ApiUser | null, ApiUser | null]
        next[slot] = user
        set({ matchCandidates: next, matchResult: null })
      },
      setMatchResult: (r) => set({ matchResult: r }),
      clearMatch: () => set({ matchCandidates: [null, null], matchResult: null }),
    }),
    {
      name: 'bso-app-store',
      partialize: (s) => ({
        token: s.token,
        currentUser: toPersistedUserLite(s.currentUser),
        isAdmin: s.isAdmin,
        onboardingStep: s.onboardingStep,
        nameInput: s.nameInput,
        departmentInput: s.departmentInput,
        selectedHobbies: s.selectedHobbies,
      }),
    }
  )
)

export const selectFilteredEmployees = (s: AppState) =>
  s.employees.filter(e => {
    const q = s.searchQuery.trim().toLowerCase()
    if (!q) return true

    return [
      e.name,
      e.last_name,
      e.first_name,
      e.middle_name,
      e.position,
    ].some(value => String(value ?? '').toLowerCase().includes(q))
  })
