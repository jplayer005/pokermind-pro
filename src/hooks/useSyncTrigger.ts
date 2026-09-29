import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUserStore, useTrainingStore, useSpacedRepetitionStore, usePostflopReviewStore, useHandsStore, useLeakStore } from '@/store'
import { uploadUserData } from '@/firebase/sync'

const DEBOUNCE_MS = 2000
/** Margem abaixo do limite de 1 MiB por documento do Firestore. */
const HANDS_DOC_LIMIT = 800_000

export function useSyncTrigger() {
  const { user, guestMode, setSyncStatus, setSyncWarnings } = useAuthStore()
  const profile = useUserStore((s) => s.profile)
  const training = useTrainingStore((s) => ({
    sessionHistory: s.sessionHistory,
    competitionHighScores: s.competitionHighScores,
    totalQuestionsToday: s.totalQuestionsToday,
    lastResetDate: s.lastResetDate,
  }))
  const sm2Data = useSpacedRepetitionStore((s) => s.sm2Data)
  const postflopProfiles = usePostflopReviewStore((s) => s.profiles)
  const savedHands = useHandsStore((s) => s.savedHands)
  const leakStats = useLeakStore((s) => s.stats)
  const leakDecisions = useLeakStore((s) => s.decisions)

  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!user || guestMode) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!user) return
      setSyncStatus('syncing')
      try {
        const sm2Keys = Object.keys(sm2Data)
        // Cada store sobe num documento do Firestore (limite ~1 MiB). O que nao cabe NAO
        // sobe, e o jogador precisa saber disso (antes era ignorado em silencio).
        const warnings: string[] = []
        const sm2Ok = sm2Keys.length <= 800
        if (!sm2Ok) warnings.push('Revisão espaçada grande demais para sincronizar (mais de 800 itens). Ela continua salva neste aparelho.')
        const handsOk = JSON.stringify(savedHands).length <= HANDS_DOC_LIMIT
        if (!handsOk) warnings.push('Mãos salvas grandes demais para sincronizar. Apague algumas no Replayer; elas continuam neste aparelho.')
        setSyncWarnings(warnings)
        await uploadUserData(user.uid, {
          profile: profile as unknown as Record<string, unknown>,
          training: training as unknown as Record<string, unknown>,
          ...(sm2Ok
            ? { spacedRepetition: { sm2Data } as unknown as Record<string, unknown> }
            : {}),
          postflopReview: { profiles: postflopProfiles } as unknown as Record<string, unknown>,
          ...(handsOk ? { hands: { savedHands } as unknown as Record<string, unknown> } : {}),
          leaks: { stats: leakStats, decisions: leakDecisions } as unknown as Record<string, unknown>,
        })
        setSyncStatus('idle')
      } catch (e) {
        console.error('[sync] upload error', e)
        setSyncStatus('error')
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [profile, training, sm2Data, postflopProfiles, savedHands, leakStats, leakDecisions, user?.uid, guestMode])
}
