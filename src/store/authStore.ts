import { create } from 'zustand'
import type { User as FirebaseUser } from 'firebase/auth'

export interface SyncReport {
  /** Quando baixou da nuvem (ms). */
  downloadedAt: number | null
  /** Documentos que existiam na nuvem e foram lidos. */
  downloaded: string[]
  /** Documentos que nao existem na nuvem (conta nova ou nunca sincronizou). */
  empty: string[]
  /** Documento -> motivo, quando a leitura falhou. */
  downloadFailed: Record<string, string>
  uploadedAt: number | null
  uploadFailed: Record<string, string>
  /** XP do perfil na nuvem e neste aparelho no momento do login. */
  cloudXP: number | null
  localXP: number | null
}

const EMPTY_REPORT: SyncReport = {
  downloadedAt: null, downloaded: [], empty: [], downloadFailed: {}, uploadedAt: null, uploadFailed: {}, cloudXP: null, localXP: null,
}

interface AuthStore {
  user: FirebaseUser | null
  guestMode: boolean
  authLoading: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  /** Partes que NAO foram sincronizadas (ex.: grande demais para o limite do Firestore). */
  syncWarnings: string[]
  /** O que a ultima sincronizacao fez: mostrado em Configuracoes para o resultado nao ser invisivel. */
  syncReport: SyncReport | null
  /** Documentos que NAO podem ser enviados (nao deu para ler a nuvem): protege os dados de la. */
  unsafeDocs: string[]
  setUser: (user: FirebaseUser | null) => void
  setGuestMode: (guest: boolean) => void
  setAuthLoading: (loading: boolean) => void
  setSyncStatus: (status: AuthStore['syncStatus']) => void
  setSyncWarnings: (warnings: string[]) => void
  setSyncReport: (patch: Partial<SyncReport>) => void
  setUnsafeDocs: (docs: string[]) => void
}

// "Continuar sem login" vale entre aberturas do app: sem isto a tela de login voltava toda vez.
const GUEST_KEY = 'pokermind-guest'
function readGuest(): boolean {
  try { return localStorage.getItem(GUEST_KEY) === '1' } catch { return false }
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  guestMode: readGuest(),
  authLoading: true,
  syncStatus: 'idle',
  syncWarnings: [],
  syncReport: null,
  unsafeDocs: [],
  setUser: (user) => set({ user }),
  setGuestMode: (guestMode) => {
    try {
      if (guestMode) localStorage.setItem(GUEST_KEY, '1')
      else localStorage.removeItem(GUEST_KEY)
    } catch { /* sem armazenamento: so vale nesta abertura */ }
    set({ guestMode })
  },
  setAuthLoading: (authLoading) => set({ authLoading }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setSyncWarnings: (syncWarnings) => set({ syncWarnings }),
  setSyncReport: (patch) => set((s) => ({ syncReport: { ...(s.syncReport ?? EMPTY_REPORT), ...patch } })),
  setUnsafeDocs: (unsafeDocs) => set({ unsafeDocs }),
}))
