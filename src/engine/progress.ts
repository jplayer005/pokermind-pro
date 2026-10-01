// ============================================================
// ENGINE: progresso (XP, acertos, historico de sessoes de mesa, fila de flashcards).
// Funcoes puras: as telas e os stores so aplicam o resultado.
// ============================================================
import type { Grade } from './coach/types'

/** XP por decisao avaliada pelo coach: errar nao pune, so nao rende. */
export const XP_PER_GRADE: Record<Grade, number> = { best: 3, good: 2, inaccuracy: 1, mistake: 0, blunder: 0 }
/** Teto diario de XP vindo da mesa (jogar horas nao pode render mais que estudar). */
export const TABLE_XP_DAILY_CAP = 150

export const isCorrectGrade = (g: Grade) => g === 'best' || g === 'good'

export interface HandCredit {
  /** Decisoes avaliadas (contam na meta diaria). */
  answered: number
  correct: number
  /** XP concedido ja respeitando o teto do dia. */
  xp: number
}

export function creditForDecisions(grades: Grade[], xpGrantedToday: number): HandCredit {
  const raw = grades.reduce((a, g) => a + XP_PER_GRADE[g], 0)
  const room = Math.max(0, TABLE_XP_DAILY_CAP - xpGrantedToday)
  return {
    answered: grades.length,
    correct: grades.filter(isCorrectGrade).length,
    xp: Math.min(raw, room),
  }
}

// ---------------------------------------------------------------- sessoes de mesa

export interface PlaySession {
  id: string
  endedAt: number
  modeId: string
  label: string
  hands: number
  /** Cash: saldo em bb. Torneio: indefinido. */
  netBB?: number
  /** Torneio: colocacao final, tamanho do campo e premio em buy-ins (0 fora do dinheiro). */
  place?: number
  field?: number
  prizeBuyIns?: number
  /** Decisoes avaliadas pelo coach na sessao, quantas foram certas e quantas viraram vazamento. */
  decisions: number
  correct: number
  leaks: number
}

export interface PlaySummary {
  sessions: number
  hands: number
  cashNetBB: number
  cashSessions: number
  tournaments: number
  itm: number
  /** ROI dos torneios: (premios - buy-ins) / buy-ins; null sem torneios. */
  roi: number | null
  /** % de decisoes certas; null sem decisoes avaliadas. */
  accuracy: number | null
}

export function summarizeSessions(list: PlaySession[]): PlaySummary {
  let hands = 0, cashNetBB = 0, cashSessions = 0, tournaments = 0, itm = 0, prizes = 0, decisions = 0, correct = 0
  for (const s of list) {
    hands += s.hands
    decisions += s.decisions
    correct += s.correct
    if (s.place !== undefined) {
      tournaments++
      prizes += s.prizeBuyIns ?? 0
      if ((s.prizeBuyIns ?? 0) > 0) itm++
    } else if (s.netBB !== undefined) {
      cashSessions++
      cashNetBB += s.netBB
    }
  }
  return {
    sessions: list.length,
    hands,
    cashNetBB,
    cashSessions,
    tournaments,
    itm,
    roi: tournaments > 0 ? (prizes - tournaments) / tournaments : null,
    accuracy: decisions > 0 ? correct / decisions : null,
  }
}

// ---------------------------------------------------------------- flashcards (SM-2)

export interface Sm2Like {
  nextReview: string
}

/**
 * Fila da sessao: cartoes ja vistos e vencidos (mais atrasados primeiro) + ate `maxNew` cartoes
 * novos. Cartoes vistos e ainda nao vencidos ficam de fora: esse e o espacamento.
 */
export function buildFlashcardQueue(
  ids: string[],
  sm2: Record<string, Sm2Like | undefined>,
  today: string,
  maxNew = 10,
): { due: string[]; fresh: string[]; queue: string[] } {
  const due = ids
    .filter((id) => sm2[id] && (sm2[id] as Sm2Like).nextReview <= today)
    .sort((a, b) => (sm2[a] as Sm2Like).nextReview.localeCompare((sm2[b] as Sm2Like).nextReview))
  const fresh = ids.filter((id) => !sm2[id]).slice(0, maxNew)
  return { due, fresh, queue: [...due, ...fresh] }
}
