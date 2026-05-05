import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Employee, HobbyTag, MatchResult, Department } from '@/data/types'
import { EMPLOYEES } from '@/data/employees'
import { assignBadge } from '@/data/badges'
import { calculateCompatibility } from '@/utils/matching'

const avatar = (name: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`

interface AppState {
  // Онбординг
  currentUser: Employee | null
  onboardingStep: 0 | 1 | 2 | 3
  nameInput: string
  departmentInput: Department | ''
  photoUrl: string
  selectedHobbies: HobbyTag[]

  // Лента
  employees: Employee[]
  searchQuery: string
  departmentFilter: Department | 'Все'

  // Мэтчинг
  matchCandidates: [Employee | null, Employee | null]
  matchResult: MatchResult | null

  // Экшены — онбординг
  setOnboardingStep: (step: 0 | 1 | 2 | 3) => void
  setNameInput: (name: string) => void
  setDepartmentInput: (dept: Department | '') => void
  setPhotoUrl: (url: string) => void
  toggleHobby: (hobby: HobbyTag) => void
  completeOnboarding: () => void
  resetOnboarding: () => void

  // Экшены — лента
  setSearchQuery: (q: string) => void
  setDepartmentFilter: (dept: Department | 'Все') => void

  // Экшены — мэтчинг
  setMatchCandidate: (slot: 0 | 1, employee: Employee | null) => void
  calculateMatch: () => void
  clearMatch: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Начальное состояние
      currentUser: null,
      onboardingStep: 0,
      nameInput: '',
      departmentInput: '',
      photoUrl: '',
      selectedHobbies: [],

      employees: EMPLOYEES,
      searchQuery: '',
      departmentFilter: 'Все',

      matchCandidates: [null, null],
      matchResult: null,

      // Онбординг
      setOnboardingStep: (step) => set({ onboardingStep: step }),

      setNameInput: (name) => set({ nameInput: name }),

      setDepartmentInput: (dept) => set({ departmentInput: dept }),

      setPhotoUrl: (url) => set({ photoUrl: url }),

      toggleHobby: (hobby) => {
        const { selectedHobbies } = get()
        const exists = selectedHobbies.find(h => h.id === hobby.id)
        set({
          selectedHobbies: exists
            ? selectedHobbies.filter(h => h.id !== hobby.id)
            : [...selectedHobbies, hobby],
        })
      },

      completeOnboarding: () => {
        const { nameInput, departmentInput, photoUrl, selectedHobbies } = get()
        if (!nameInput || !departmentInput || selectedHobbies.length < 5) return

        const badge = assignBadge(selectedHobbies)
        const newUser: Employee = {
          id: 'current-user',
          name: nameInput,
          department: departmentInput as Department,
          avatar: photoUrl || avatar(nameInput),
          hobbies: selectedHobbies,
          badge,
        }
        set({ currentUser: newUser, onboardingStep: 3 })
      },

      resetOnboarding: () =>
        set({
          currentUser: null,
          onboardingStep: 0,
          nameInput: '',
          departmentInput: '',
          photoUrl: '',
          selectedHobbies: [],
        }),

      // Лента
      setSearchQuery: (q) => set({ searchQuery: q }),

      setDepartmentFilter: (dept) => set({ departmentFilter: dept }),

      // Мэтчинг
      setMatchCandidate: (slot, employee) => {
        const { matchCandidates } = get()
        const next: [Employee | null, Employee | null] = [...matchCandidates] as [Employee | null, Employee | null]
        next[slot] = employee
        set({ matchCandidates: next, matchResult: null })
      },

      calculateMatch: () => {
        const { matchCandidates } = get()
        const [a, b] = matchCandidates
        if (!a || !b) return
        set({ matchResult: calculateCompatibility(a, b) })
      },

      clearMatch: () =>
        set({ matchCandidates: [null, null], matchResult: null }),
    }),
    {
      name: 'bso-app-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        onboardingStep: state.onboardingStep,
        nameInput: state.nameInput,
        departmentInput: state.departmentInput,
        photoUrl: state.photoUrl,
        selectedHobbies: state.selectedHobbies,
      }),
    }
  )
)

// Селекторы
export const selectFilteredEmployees = (state: AppState) => {
  const { employees, searchQuery, departmentFilter } = state
  return employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDept = departmentFilter === 'Все' || e.department === departmentFilter
    return matchesSearch && matchesDept
  })
}
