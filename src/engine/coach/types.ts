// ============================================================
// ENGINE: tipos do coach (nota de cada decisao do heroi)
// ============================================================
import type { Street } from '../game/types'

export type Grade = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
export type Kind = 'fold' | 'check' | 'call' | 'raise'

export interface GradedDecision {
  handNumber: number
  street: Street
  /** Acao tomada e a recomendada pelo coach. */
  took: Kind
  best: Kind
  grade: Grade
  /** Perda estimada em bb. null quando o coach so tem a faixa (ranges/solver), sem EV. */
  evLossBB: number | null
  /** true = estimativa (equity contra range suposto), nao solver. */
  approx: boolean
  potBefore: number
  toCall: number
  /** Equity estimada (0..1) e a necessaria para pagar, quando calculadas. */
  equity?: number
  needed?: number
  /** Tag do vazamento (ex.: PF_OPEN_CO_TOO_TIGHT). Vazia quando a decisao foi boa. */
  tag: string
  explain: string[]
  /** Cartas do heroi e board no momento, para a revisao. */
  hole: [number, number]
  board: number[]
}

export const GRADE_ORDER: Grade[] = ['best', 'good', 'inaccuracy', 'mistake', 'blunder']
export const isLeak = (g: Grade) => g === 'inaccuracy' || g === 'mistake' || g === 'blunder'
