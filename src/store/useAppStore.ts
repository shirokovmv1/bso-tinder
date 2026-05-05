import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ApiUser, ApiHobby, ApiMatchResult } from '@/api/client'

export type Department = 'Логистика' | 'Стройка' | 'IT' | 'Финансы' | 'HR'

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
  departmentFilter: Department | 'Все'

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
  setDepartmentFilter: (dept: Department | 'Все') => void

  // Экшены — мэтчинг
  setMatchCandidate: (slot: 0 | 1, user: ApiUser | null) => void
  setMatchResult: (r: ApiMatchResult | null) => void
  clearMatch: () => void
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
      departmentFilter: 'Все',

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

      setCurrentUser: (user) => set({ currentUser: user }),
      setEmployees: (list) => set({ employees: list }),
      setSearchQuery: (q) => set({ searchQuery: q }),
      setDepartmentFilter: (dept) => set({ departmentFilter: dept }),

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
        currentUser: s.currentUser,
        isAdmin: s.isAdmin,
        onboardingStep: s.onboardingStep,
        nameInput: s.nameInput,
        departmentInput: s.departmentInput,
        photoUrl: s.photoUrl,
        selectedHobbies: s.selectedHobbies,
      }),
    }
  )
)

export const selectFilteredEmployees = (s: AppState) =>
  s.employees.filter(e => {
    const q = s.searchQuery.toLowerCase()
    const matchSearch = !q || (e.name ?? '').toLowerCase().includes(q)
    const matchDept = s.departmentFilter === 'Все' || e.department === s.departmentFilter
    return matchSearch && matchDept
  })
