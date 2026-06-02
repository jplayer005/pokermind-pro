import { create } from 'zustand'
import type { User as FirebaseUser } from 'firebase/auth'

interface AuthStore {
  user: FirebaseUser | null
  guestMode: boolean
  authLoading: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  setUser: (user: FirebaseUser | null) => void
  setGuestMode: (guest: boolean) => void
  setAuthLoading: (loading: boolean) => void
  setSyncStatus: (status: AuthStore['syncStatus']) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  guestMode: false,
  authLoading: true,
  syncStatus: 'idle',
  setUser: (user) => set({ user }),
  setGuestMode: (guestMode) => set({ guestMode }),
  setAuthLoading: (authLoading) => set({ authLoading }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
}))
