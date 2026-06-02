import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { auth } from '@/firebase/config'
import { downloadUserData, toTimestampMillis } from '@/firebase/sync'
import { useAuthStore } from '@/store/authStore'
import {
  useUserStore,
  useTrainingStore,
  useSpacedRepetitionStore,
  usePostflopReviewStore,
  useHandsStore,
} from '@/store'
import LoginPage from '@/pages/LoginPage'
import type { UserProfile, UserStats, Achievement, StudyGoal } from '@/types'

async function hydrateFromFirestore(uid: string, email?: string | null) {
  try {
    const data = await downloadUserData(uid)

    const setProfile = useUserStore.getState().setProfileFromFirebaseUser
    const userState = useUserStore.getState()

    // Profile: compara XP para resolver conflito
    if (data.profile) {
      const cloudXP = (data.profile.stats as UserStats | undefined)?.xp ?? 0
      const localXP = userState.profile.stats.xp
      const cloudUpdatedAt = toTimestampMillis(data.profile.updatedAt)
      const localUpdatedAt = toTimestampMillis((userState.profile as any).updatedAt)

      if (cloudXP > localXP || cloudUpdatedAt > localUpdatedAt) {
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

    // Garante que o ID e e-mail do profile apontam para o usuário Firebase real
    setProfile(uid, email ?? undefined)
  } catch (e) {
    console.error('[auth] hydrateFromFirestore error', e)
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
        setUser(firebaseUser)
        if (firebaseUser) {
          await hydrateFromFirestore(firebaseUser.uid, firebaseUser.email)
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
