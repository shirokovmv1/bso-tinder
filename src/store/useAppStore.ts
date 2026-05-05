import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  currentUser: null | { id: string; name: string }
}

export const useAppStore = create<AppState>()(
  persist(
    () => ({
      currentUser: null,
    }),
    { name: 'bso-app-store' }
  )
)
