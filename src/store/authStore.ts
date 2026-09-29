import { create } from 'zustand'
import type { User as FirebaseUser } from 'firebase/auth'

interface AuthStore {
  user: FirebaseUser | null
  guestMode: boolean
  authLoading: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  /** Partes que NAO foram sincronizadas (ex.: grande demais para o limite do Firestore). */
  syncWarnings: string[]
  setUser: (user: FirebaseUser | null) => void
  setGuestMode: (guest: boolean) => void
  setAuthLoading: (loading: boolean) => void
  setSyncStatus: (status: AuthStore['syncStatus']) => void
  setSyncWarnings: (warnings: string[]) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  guestMode: false,
  authLoading: true,
  syncStatus: 'idle',
  syncWarnings: [],
  setUser: (user) => set({ user }),
  setGuestMode: (guestMode) => set({ guestMode }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSyncWarnings: (syncWarnings) => set({ syncWarnings }),
}))
