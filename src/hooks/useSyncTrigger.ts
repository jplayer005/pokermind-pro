import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useUserStore, useTrainingStore, useSpacedRepetitionStore, usePostflopReviewStore, useHandsStore } from '@/store'
import { uploadUserData } from '@/firebase/sync'

const DEBOUNCE_MS = 2000

export function useSyncTrigger() {
  const { user, guestMode, setSyncStatus } = useAuthStore()
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

  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!user || guestMode) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      if (!user) return
      setSyncStatus('syncing')
      try {
        const sm2Keys = Object.keys(sm2Data)
        await uploadUserData(user.uid, {
          profile: profile as unknown as Record<string, unknown>,
          training: training as unknown as Record<string, unknown>,
          ...(sm2Keys.length <= 800
            ? { spacedRepetition: { sm2Data } as unknown as Record<string, unknown> }
            : {}),
          postflopReview: { profiles: postflopProfiles } as unknown as Record<string, unknown>,
          hands: { savedHands } as unknown as Record<string, unknown>,
        })
        setSyncStatus('idle')
      } catch (e) {
        console.error('[sync] upload error', e)
        setSyncStatus('error')
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [profile, training, sm2Data, postflopProfiles, savedHands, user?.uid, guestMode])
}
