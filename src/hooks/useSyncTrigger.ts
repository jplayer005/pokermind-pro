import { useCallback, useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { useAuthStore } from '@/store/authStore'
import {
  useUserStore, useTrainingStore, useSpacedRepetitionStore, usePostflopReviewStore, useHandsStore,
  useLeakStore, useNotesStore, usePlayStore,
} from '@/store'
import { uploadUserData, SYNC_DOCS, DOC_SIZE_LIMIT, type SyncPayload } from '@/firebase/sync'
import { getLocalDoc, applyMergedDoc } from '@/firebase/localDocs'

const DEBOUNCE_MS = 2000
/** Espera entre tentativas depois de uma falha (internet fora, servidor ocupado...). */
export const RETRY_MS = [5_000, 15_000, 60_000, 300_000]

/** Espera antes da tentativa numero `attempt` (0 = primeira falha); cresce e para em 5 minutos. */
export const retryDelay = (attempt: number) => RETRY_MS[Math.min(Math.max(0, attempt), RETRY_MS.length - 1)]

/** Falha que tentar de novo nao resolve (o documento nao cabe no Firestore). */
export const isPermanentFailure = (reason: string) => reason.includes('grande demais')

const DOC_LABEL: Record<string, string> = {
  hands: 'Mãos salvas',
  spacedRepetition: 'Revisão espaçada',
  notes: 'Anotações',
  play: 'Sessões da mesa',
}

/**
 * Envia os dados para a nuvem. A "fila" e o proprio estado salvo no aparelho: o envio le o estado
 * ATUAL e funde com a nuvem na hora (idempotente), entao tentar de novo mais tarde nunca perde nem
 * duplica nada. Falhou? Tenta de novo sozinho (espera crescente) e imediatamente quando a internet
 * volta ou o app e reaberto.
 */
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
  const retryRef = useRef<ReturnType<typeof setTimeout>>()
  const attemptRef = useRef(0)
  const runningRef = useRef(false)
  const uidRef = useRef<string | null>(null)
  uidRef.current = user && !guestMode ? user.uid : null

  const runSync = useCallback(async () => {
    const uid = uidRef.current
    if (!uid || runningRef.current) return
    clearTimeout(retryRef.current)
    // Estado local virgem (nada jogado ainda): nao ha o que salvar, e enviar isto poderia
    // gravar um perfil vazio "mais novo" por cima do progresso guardado em outro aparelho/app.
    const pristine =
      useUserStore.getState().profile.stats.xp === 0 &&
      useTrainingStore.getState().sessionHistory.length === 0 &&
      Object.keys(useSpacedRepetitionStore.getState().sm2Data).length === 0 &&
      Object.keys(usePostflopReviewStore.getState().profiles).length === 0 &&
      useHandsStore.getState().savedHands.length === 0 &&
      useLeakStore.getState().decisions === 0 &&
      useNotesStore.getState().notes.length === 0 &&
      usePlayStore.getState().sessions.length === 0
    if (pristine) {
      setSyncStatus('idle')
      return
    }
    runningRef.current = true
    setSyncStatus('syncing')
    let failedSomething = false
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
      const result = await uploadUserData(uid, payload, unsafe)

      // o que outro aparelho enviou nesse meio tempo chega aqui (so aplica se mudou: sem laco)
      for (const [name, merged] of Object.entries(result.merged)) applyMergedDoc(name, merged)

      const failedDocs = Object.keys(result.failed)
      useAuthStore.getState().setSyncReport({ uploadedAt: Date.now(), uploadFailed: result.failed })
      if (failedDocs.length > 0) {
        // documento grande demais nao se resolve esperando: so avisa, sem ficar tentando
        failedSomething = Object.values(result.failed).some((r) => !isPermanentFailure(r))
        console.error('[sync] documentos que falharam ao enviar', result.failed)
        setSyncWarnings([...warnings, `Falha ao enviar: ${failedDocs.join(', ')}. Vou tentar de novo sozinho.`])
        setSyncStatus('error')
      } else {
        attemptRef.current = 0
        setSyncStatus('idle')
      }
    } catch (e) {
      failedSomething = true
      console.error('[sync] upload error', e)
      setSyncStatus('error')
    } finally {
      runningRef.current = false
    }
    if (failedSomething) {
      const wait = retryDelay(attemptRef.current)
      attemptRef.current++
      retryRef.current = setTimeout(() => void runSync(), wait)
    }
  }, [setSyncStatus, setSyncWarnings])

  // mudou algo no aparelho: envia (com espera curta para juntar varias mudancas)
  useEffect(() => {
    if (!user || guestMode) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void runSync(), DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [
    runSync, profile, training, sm2Data, postflopProfiles, savedHands, deletedHands, leakStats, leakDecisions,
    notes, deletedNotes, playSessions, user?.uid, guestMode, // eslint-disable-line react-hooks/exhaustive-deps
  ])

  // internet voltou ou o app foi reaberto: se a ultima tentativa falhou, tenta agora, sem esperar
  useEffect(() => {
    const retryNow = () => {
      if (useAuthStore.getState().syncStatus !== 'error') return
      attemptRef.current = 0
      void runSync()
    }
    const onVisible = () => { if (document.visibilityState === 'visible') retryNow() }
    window.addEventListener('online', retryNow)
    document.addEventListener('visibilitychange', onVisible)
    const sub = CapApp.addListener('appStateChange', (s) => { if (s.isActive) retryNow() })
    return () => {
      window.removeEventListener('online', retryNow)
      document.removeEventListener('visibilitychange', onVisible)
      void sub.then((h) => h.remove())
      clearTimeout(retryRef.current)
    }
  }, [runSync])
}
