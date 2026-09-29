import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { auth } from '@/firebase/config'
import { downloadUserData, toTimestampMillis, SYNC_DOCS } from '@/firebase/sync'
import { useAuthStore } from '@/store/authStore'
import {
  useUserStore,
  useTrainingStore,
  useSpacedRepetitionStore,
  usePostflopReviewStore,
  useHandsStore,
  useLeakStore,
} from '@/store'
import LoginPage from '@/pages/LoginPage'
import type { UserProfile, UserStats, Achievement, StudyGoal } from '@/types'

async function hydrateFromFirestore(uid: string, email?: string | null) {
  try {
    const { data, failed } = await downloadUserData(uid)
    // O que nao deu para LER nao pode ser ENVIADO depois: subir o estado local por cima poderia
    // apagar o que esta na nuvem. (Antes, uma falha aqui derrubava tudo e o upload seguia mesmo assim.)
    useAuthStore.getState().setUnsafeDocs(Object.keys(failed))

    const setProfile = useUserStore.getState().setProfileFromFirebaseUser
    const userState = useUserStore.getState()
    const localXPBefore = userState.profile.stats.xp
    const cloudXPBefore = (data.profile?.stats as UserStats | undefined)?.xp ?? null
    useAuthStore.getState().setSyncReport({
      downloadedAt: Date.now(),
      downloaded: SYNC_DOCS.filter((n) => data[n] !== null),
      empty: SYNC_DOCS.filter((n) => data[n] === null && !failed[n]),
      downloadFailed: failed,
      cloudXP: cloudXPBefore,
      localXP: localXPBefore,
    })

    // Profile: compara XP para resolver conflito
    if (data.profile) {
      const cloudXP = (data.profile.stats as UserStats | undefined)?.xp ?? 0
      const localXP = userState.profile.stats.xp
      const cloudUpdatedAt = toTimestampMillis(data.profile.updatedAt)
      const localUpdatedAt = toTimestampMillis((userState.profile as any).updatedAt)

      // "Mais nova" nao basta: uma nuvem recem-criada e vazia (XP 0) nao pode sobrescrever
      // um perfil local com progresso. So vence se tem mais XP, ou e mais nova e nao tem menos.
      if (cloudXP > localXP || (cloudUpdatedAt > localUpdatedAt && cloudXP >= localXP)) {
        const { updatedAt, ...rest } = data.profile as any
        useUserStore.setState((state) => ({
          profile: {
            ...state.profile,
            ...(rest as Partial<UserProfile>),
            id: uid,
          },
        }))
      }
    } else {
      // Primeira vez na nuvem: já vai sincronizar via useSyncTrigger (debounce 2s)
    }

    if (data.training) {
      const { updatedAt, ...rest } = data.training as any
      const cloudUpdatedAt = toTimestampMillis(data.training.updatedAt)
      const localHistory = useTrainingStore.getState().sessionHistory
      const localXP = useUserStore.getState().profile.stats.xp
      if (cloudUpdatedAt > 0 && (rest.sessionHistory?.length ?? 0) >= localHistory.length) {
        useTrainingStore.setState({ ...rest })
      }
    }

    if (data.spacedRepetition) {
      const { updatedAt, sm2Data } = data.spacedRepetition as any
      const cloudUpdatedAt = toTimestampMillis(data.spacedRepetition.updatedAt)
      const localCount = Object.keys(useSpacedRepetitionStore.getState().sm2Data).length
      if (cloudUpdatedAt > 0 && Object.keys(sm2Data ?? {}).length >= localCount) {
        useSpacedRepetitionStore.setState({ sm2Data: sm2Data ?? {} })
      }
    }

    if (data.postflopReview) {
      const { updatedAt, profiles } = data.postflopReview as any
      const cloudUpdatedAt = toTimestampMillis(data.postflopReview.updatedAt)
      const localCount = Object.keys(usePostflopReviewStore.getState().profiles).length
      if (cloudUpdatedAt > 0 && Object.keys(profiles ?? {}).length >= localCount) {
        usePostflopReviewStore.setState({ profiles: profiles ?? {} })
      }
    }

    if (data.hands) {
      const { updatedAt, savedHands } = data.hands as any
      const cloudUpdatedAt = toTimestampMillis(data.hands.updatedAt)
      const localCount = useHandsStore.getState().savedHands.length
      if (cloudUpdatedAt > 0 && (savedHands?.length ?? 0) >= localCount) {
        useHandsStore.setState({ savedHands: savedHands ?? [] })
      }
    }

    if (data.leaks) {
      const { stats, decisions } = data.leaks as any
      const cloudUpdatedAt = toTimestampMillis(data.leaks.updatedAt)
      const localDecisions = useLeakStore.getState().decisions
      // mesma regra dos outros stores: a nuvem so vence se tem pelo menos tanto quanto o local
      if (cloudUpdatedAt > 0 && (decisions ?? 0) >= localDecisions) {
        useLeakStore.setState({ stats: stats ?? {}, decisions: decisions ?? 0 })
      }
    }

    // Garante que o ID e e-mail do profile apontam para o usuário Firebase real
    setProfile(uid, email ?? undefined)
  } catch (e) {
    console.error('[auth] hydrateFromFirestore error', e)
    // Falha geral: nao sabemos o que ha na nuvem, entao NADA pode ser enviado por cima dela.
    const reason = e instanceof Error ? e.message : String(e)
    const auth = useAuthStore.getState()
    auth.setUnsafeDocs([...SYNC_DOCS])
    auth.setSyncReport({
      downloadedAt: Date.now(),
      downloadFailed: Object.fromEntries(SYNC_DOCS.map((n) => [n, reason])),
    })
  }
}

function SplashLoader() {
  return (
    <div className="fixed inset-0 bg-bg-base flex flex-col items-center justify-center gap-4 z-50">
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-900/30"
      >
        <Zap size={26} className="text-bg-base" />
      </motion.div>
      <div className="font-display font-bold text-xl text-text-primary tracking-tight">
        Poker<span className="text-gradient-gold">Mind</span>
      </div>
    </div>
  )
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, guestMode, authLoading, setUser, setAuthLoading } = useAuthStore()

  useEffect(() => {
    // Timeout de segurança: se Firebase não responder em 6s, libera o app
    const timeout = setTimeout(() => setAuthLoading(false), 6000)

    let unsubscribeFn: (() => void) | undefined
    try {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        clearTimeout(timeout)
        if (firebaseUser) {
          // Segura o app na tela de carregamento ate baixar da nuvem. Sem isto, no login
          // interativo o app abria e o sync subia o estado local (vazio) antes do download acabar.
          setAuthLoading(true)
          // seguro por padrao: nada sobe para a nuvem ate o download terminar e provar que e seguro
          useAuthStore.getState().setUnsafeDocs([...SYNC_DOCS])
          useAuthStore.getState().setSyncReport({
            downloadedAt: null, downloaded: [], empty: [], downloadFailed: {}, cloudXP: null, localXP: null,
          })
        }
        setUser(firebaseUser)
        if (firebaseUser) {
          // Sem rede o download pode demorar muito: nao deixa o app preso na tela de carregamento.
          // Enquanto nao terminar, nada e enviado (todos os documentos ficam "nao seguros").
          const hydrating = hydrateFromFirestore(firebaseUser.uid, firebaseUser.email)
          const timedOut = new Promise<void>((resolve) =>
            setTimeout(() => {
              if (useAuthStore.getState().syncReport?.downloadedAt == null) {
                useAuthStore.getState().setUnsafeDocs([...SYNC_DOCS])
                useAuthStore.getState().setSyncReport({
                  downloadFailed: Object.fromEntries(SYNC_DOCS.map((n) => [n, 'tempo esgotado'])),
                })
              }
              resolve()
            }, 15000),
          )
          await Promise.race([hydrating, timedOut])
        }
        setAuthLoading(false)
      })
      unsubscribeFn = unsubscribe
    } catch (e) {
      clearTimeout(timeout)
      console.error('[auth] Firebase init error', e)
      setAuthLoading(false)
    }

    return () => {
      clearTimeout(timeout)
      unsubscribeFn?.()
    }
  }, [])

  if (authLoading) return <SplashLoader />
  if (!user && !guestMode) return <LoginPage />
  return <>{children}</>
}
