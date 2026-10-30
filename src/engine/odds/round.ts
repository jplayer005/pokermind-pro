// ============================================================
// ENGINE: regras da rodada do Odds Rush (nivel adaptativo, sorteio do tipo, resumo).
// Sem React: a tela so cuida do relogio e dos toques.
// ============================================================
import type { Rng } from '../cards'
import { QUESTION_TYPES, type Level, type QType } from './questions'

export const ROUND_SECONDS = 60
/** Acertos seguidos para subir de nivel; um erro desce. */
export const STREAK_TO_LEVEL_UP = 3

export type Mode = 'mixed' | QType

export function adapt(level: Level, streak: number, correct: boolean): { level: Level; streak: number } {
  if (!correct) return { level: Math.max(1, level - 1) as Level, streak: 0 }
  const next = streak + 1
  if (next >= STREAK_TO_LEVEL_UP && level < 3) return { level: (level + 1) as Level, streak: 0 }
  return { level, streak: level === 3 ? 0 : next }
}

export interface Answer { type: QType; correct: boolean; ms: number }

export interface RoundSummary {
  total: number
  right: number
  accuracy: number
  avgMs: number
  byType: Record<QType, { n: number; right: number }>
}

export function summarize(answers: readonly Answer[]): RoundSummary {
  const byType = Object.fromEntries(QUESTION_TYPES.map((t) => [t.id, { n: 0, right: 0 }])) as RoundSummary['byType']
  let right = 0
  let ms = 0
  for (const a of answers) {
    byType[a.type].n++
    if (a.correct) { byType[a.type].right++; right++ }
    ms += a.ms
  }
  const total = answers.length
  return { total, right, accuracy: total ? right / total : 0, avgMs: total ? Math.round(ms / total) : 0, byType }
}

/** Tipo da proxima pergunta: o escolhido, ou no misto qualquer um menos o anterior. */
export function pickType(mode: Mode, rng: Rng, last?: QType): QType {
  if (mode !== 'mixed') return mode
  const pool = QUESTION_TYPES.map((t) => t.id).filter((t) => t !== last)
  return pool[Math.floor(rng() * pool.length)]
}
