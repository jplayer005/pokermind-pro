import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import {
  useUserStore, useTrainingStore, useSpacedRepetitionStore, usePostflopReviewStore, useHandsStore,
  useLeakStore, useNotesStore, usePlayStore,
} from '@/store'
import { uploadUserData, SYNC_DOCS, DOC_SIZE_LIMIT, type SyncPayload } from '@/firebase/sync'
import { getLocalDoc, applyMergedDoc } from '@/firebase/localDocs'

const DEBOUNCE_MS = 2000

const DOC_LABEL: Record<string, string> = {
  hands: 'Mãos salvas',
  spacedRepetition: 'Revisão espaçada',
  notes: 'Anotações',
  play: 'Sessões da mesa',
}

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
  const deletedHands = useHandsStore((s) => s.deleted)
  const leakStats = useLeakStore((s) => s.stats)
  const leakDecisions = useLeakStore((s) => s.decisions)
  const notes = useNotesStore((s) => s.notes)
  const deletedNotes = useNotesStore((s) => s.deleted)
  const playSessions = usePlayStore((s) => s.sessions)

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
        leakDecisions === 0 &&
        notes.length === 0 &&
        playSessions.length === 0
      if (pristine) {
        setSyncStatus('idle')
        return
      }
      setSyncStatus('syncing')
      try {
        // Cada documento do Firestore tem limite de ~1 MiB. O que nao cabe NAO sobe, e o
        // jogador precisa saber disso (nunca em silencio).
        const warnings: string[] = []
        const payload: SyncPayload = {}
        for (const name of SYNC_DOCS) {
          const doc = getLocalDoc(name)
          if (!doc) continue
          if (JSON.stringify(doc).length > DOC_SIZE_LIMIT) {
            warnings.push(`${DOC_LABEL[name] ?? name} grande demais para sincronizar. Continua salvo neste aparelho.`)
            continue
          }
          payload[name] = doc
        }
        // Documentos que nao deu para ler da nuvem ficam de fora: enviar o estado local por cima
        // poderia apagar o que ja esta la.
        const unsafe = useAuthStore.getState().unsafeDocs
        if (unsafe.length > 0) {
          warnings.push(`Não foi possível ler da nuvem: ${unsafe.join(', ')}. Esses dados não foram enviados, para não apagar o que já está salvo lá.`)
        }
        setSyncWarnings(warnings)
        const result = await uploadUserData(user.uid, payload, unsafe)

        // o que outro aparelho enviou nesse meio tempo chega aqui (so aplica se mudou: sem laco)
        for (const [name, merged] of Object.entries(result.merged)) applyMergedDoc(name, merged)

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
  }, [
    profile, training, sm2Data, postflopProfiles, savedHands, deletedHands, leakStats, leakDecisions,
    notes, deletedNotes, playSessions, user?.uid, guestMode,
  ])
}
