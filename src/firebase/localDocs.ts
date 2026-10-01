// Ponte entre os stores do app e os documentos da nuvem: le o estado local como documento e
// aplica de volta o resultado de uma fusao (so o que realmente mudou).
import {
  useUserStore, useTrainingStore, useSpacedRepetitionStore, usePostflopReviewStore,
  useHandsStore, useLeakStore, useNotesStore, usePlayStore,
} from '@/store'
import { sameData, stripMeta } from '@/engine/syncMerge'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any>

/** Estado local de cada documento, no mesmo formato em que ele vive na nuvem. */
export function getLocalDoc(name: string): Obj | null {
  switch (name) {
    case 'profile': return useUserStore.getState().profile as unknown as Obj
    case 'training': {
      const s = useTrainingStore.getState()
      return {
        sessionHistory: s.sessionHistory,
        competitionHighScores: s.competitionHighScores,
        totalQuestionsToday: s.totalQuestionsToday,
        lastResetDate: s.lastResetDate,
      }
    }
    case 'spacedRepetition': return { sm2Data: useSpacedRepetitionStore.getState().sm2Data }
    case 'postflopReview': return { profiles: usePostflopReviewStore.getState().profiles }
    case 'hands': {
      const s = useHandsStore.getState()
      return { savedHands: s.savedHands, deleted: s.deleted }
    }
    case 'leaks': {
      const s = useLeakStore.getState()
      return { stats: s.stats, decisions: s.decisions }
    }
    case 'notes': {
      const s = useNotesStore.getState()
      return { notes: s.notes, deleted: s.deleted }
    }
    case 'play': {
      const s = usePlayStore.getState()
      return { sessions: s.sessions, xpDay: s.xpDay, xpToday: s.xpToday }
    }
    default: return null
  }
}

/** Aplica o resultado da fusao no store; devolve true se algo mudou. */
export function applyMergedDoc(name: string, merged: Obj): boolean {
  const current = getLocalDoc(name)
  if (sameData(stripMeta(current), stripMeta(merged))) return false
  const m = stripMeta(merged) as Obj
  switch (name) {
    case 'profile':
      useUserStore.setState((st) => ({ profile: { ...st.profile, ...m, id: st.profile.id } as any }))
      break
    case 'training': useTrainingStore.setState({ ...m }); break
    case 'spacedRepetition': useSpacedRepetitionStore.setState({ sm2Data: m.sm2Data ?? {} }); break
    case 'postflopReview': usePostflopReviewStore.setState({ profiles: m.profiles ?? {} }); break
    case 'hands': useHandsStore.setState({ savedHands: m.savedHands ?? [], deleted: m.deleted ?? {} }); break
    case 'leaks': useLeakStore.setState({ stats: m.stats ?? {}, decisions: m.decisions ?? 0 }); break
    case 'notes': useNotesStore.setState({ notes: m.notes ?? [], deleted: m.deleted ?? {} }); break
    case 'play': usePlayStore.setState({ sessions: m.sessions ?? [], xpDay: m.xpDay ?? '', xpToday: m.xpToday ?? 0 }); break
    default: return false
  }
  return true
}
