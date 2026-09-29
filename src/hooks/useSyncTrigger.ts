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
      // Estado local virgem (nada jogado ainda): nao ha o que salvar, e enviar isto poderia
      // gravar um perfil vazio "mais novo" por cima do progresso guardado em outro aparelho/app.
      const pristine =
        profile.stats.xp === 0 &&
        training.sessionHistory.length === 0 &&
        Object.keys(sm2Data).length === 0 &&
        Object.keys(postflopProfiles).length === 0 &&
        savedHands.length === 0 &&
        leakDecisions === 0
      if (pristine) {
        setSyncStatus('idle')
        return
      }
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
        // Documentos que nao deu para ler da nuvem ficam de fora: enviar o estado local por cima
        // poderia apagar o que ja esta la.
        const unsafe = useAuthStore.getState().unsafeDocs
        if (unsafe.length > 0) {
          warnings.push(`Não foi possível ler da nuvem: ${unsafe.join(', ')}. Esses dados não foram enviados, para não apagar o que já está salvo lá.`)
        }
        setSyncWarnings(warnings)
        const result = await uploadUserData(user.uid, {
          profile: profile as unknown as Record<string, unknown>,
          training: training as unknown as Record<string, unknown>,
          ...(sm2Ok
            ? { spacedRepetition: { sm2Data } as unknown as Record<string, unknown> }
            : {}),
          postflopReview: { profiles: postflopProfiles } as unknown as Record<string, unknown>,
          ...(handsOk ? { hands: { savedHands } as unknown as Record<string, unknown> } : {}),
          leaks: { stats: leakStats, decisions: leakDecisions } as unknown as Record<string, unknown>,
        }, unsafe)
        const failedDocs = Object.keys(result.failed)
        useAuthStore.getState().setSyncReport({ uploadedAt: Date.now(), uploadFailed: result.failed })
        if (failedDocs.length > 0) {
          console.error('[sync] documentos que falharam ao enviar', result.failed)
          setSyncWarnings([...warnings, `Falha ao enviar: ${failedDocs.join(', ')}.`])
          setSyncStatus('error')
        } else {
          setSyncStatus('idle')
        }
      } catch (e) {
        console.error('[sync] upload error', e)
        setSyncStatus('error')
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [profile, training, sm2Data, postflopProfiles, savedHands, leakStats, leakDecisions, user?.uid, guestMode])
}
