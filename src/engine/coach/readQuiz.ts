// ============================================================
// ENGINE: quiz "pausa e leia". Diante de uma aposta grande, o heroi estima ANTES de agir
// (1) o tipo de mao mais provavel do vilao e (2) a propria equity contra o range dele;
// depois o coach mostra o range suposto, a equity estimada e a necessaria para pagar.
// Estimativa de treino, nao solver (mesma base do coach: buildVillainRange).
// ============================================================
import { rankOf, type Rng } from '../cards'
import { equityVsCombos, type Combo } from '../equity'
import { categoryOf, evaluate, HAND_CATEGORY } from '../evaluator'
import { legalActions, potTotal } from '../game/reducer'
import type { GameState } from '../game/types'
import type { Grade } from './types'
import { buildVillainRange, hasDraw } from './range'

export type QuizFreq = 'all' | 'half' | 'river'
export type Band = 'strong' | 'pair' | 'draw' | 'air'
export type Bands = Record<Band, number>

export const BAND_INFO: { id: Band; label: string; hint: string }[] = [
  { id: 'strong', label: 'Mão forte', hint: 'Dois pares, trinca ou melhor' },
  { id: 'pair', label: 'Um par', hint: 'Par com carta da mão' },
  { id: 'draw', label: 'Draw', hint: 'Flush ou sequência a completar' },
  { id: 'air', label: 'Ar / blefe', hint: 'Sem par nem draw' },
]

/** Aposta que faz a mesa pausar: pelo menos meio pote, ou all-in. */
const BIG_BET = 0.5
/** Acerto cheio da equity: ate 10 pontos de diferenca. */
const EQ_HIT = 0.1

export interface ReadQuiz {
  /** Assento do vilao lido e o numero da mao, para identificar a decisao. */
  seat: number
  handNumber: number
  street: GameState['street']
  bands: Bands
  /** Equity do heroi contra o range (0..1), ajustada para varios oponentes como no coach. */
  equity: number
  /** Equity necessaria para pagar (0..1). */
  needed: number
  toCall: number
  pot: number
  /** Como o range foi montado (passos), para a explicacao. */
  steps: string[]
  /** Combos do range, para mostrar quantos sao e permitir o replay. */
  combos: number
}

/** Pausa diante de aposta grande no pos-flop, conforme a frequencia escolhida. */
export function isQuizSpot(state: GameState, freq: QuizFreq): boolean {
  if (state.over || state.toAct < 0 || state.street === 'preflop') return false
  const seat = state.seats[state.toAct]
  if (!seat?.isHero) return false
  const la = legalActions(state)
  if (!la.canCall) return false
  const pot = potTotal(state)
  const bet = la.callAmount / Math.max(pot - la.callAmount, state.cfg.bb)
  const allIn = la.callAmount >= seat.stack
  if (bet < BIG_BET && !allIn) return false
  if (freq === 'river') return state.street === 'river' || allIn
  if (freq === 'half') return (state.handNumber + state.history.length) % 2 === 0
  return true
}

/** Faixa da mao do vilao neste board: forte, par com carta da mao, draw ou ar. */
export function bandOf(combo: Combo, board: readonly number[]): Band {
  const cat = categoryOf(evaluate([...combo, ...board]))
  const boardRanks = new Set(board.map(rankOf))
  const hit = boardRanks.has(rankOf(combo[0])) || boardRanks.has(rankOf(combo[1])) || rankOf(combo[0]) === rankOf(combo[1])
  if (cat >= HAND_CATEGORY.TRIPS) return 'strong'
  if (cat === HAND_CATEGORY.TWO_PAIR && hit) return 'strong'
  if (cat === HAND_CATEGORY.PAIR && hit) return 'pair'
  return hasDraw(combo, board) ? 'draw' : 'air'
}

export function bandsOf(combos: readonly Combo[], board: readonly number[]): Bands {
  const out: Bands = { strong: 0, pair: 0, draw: 0, air: 0 }
  if (combos.length === 0) return out
  for (const c of combos) out[bandOf(c, board)]++
  for (const k of Object.keys(out) as Band[]) out[k] /= combos.length
  return out
}

export function buildQuiz(state: GameState, rng: Rng = Math.random): ReadQuiz | null {
  if (!isQuizSpot(state, 'all')) return null
  const hero = state.seats[state.toAct]
  const vr = buildVillainRange(state)
  if (!vr || !hero.cards) return null
  const la = legalActions(state)
  const pot = potTotal(state)
  const foes = Math.max(1, state.seats.filter((x) => !x.out && !x.folded).length - 1)
  const raw = equityVsCombos(hero.cards as [number, number], vr.combos, state.board, 700, rng).equity
  return {
    seat: vr.seat,
    handNumber: state.handNumber,
    street: state.street,
    bands: bandsOf(vr.combos, state.board),
    equity: Math.pow(raw, 1 + 0.7 * (foes - 1)),
    needed: la.callAmount / (pot + la.callAmount),
    toCall: la.callAmount,
    pot,
    steps: vr.steps,
    combos: vr.combos.length,
  }
}

export interface QuizResult {
  /** Faixa escolhida e a mais provavel do range. */
  picked: Band
  top: Band
  /** Acertou a faixa: escolheu a mais provavel ou uma quase tao provavel. */
  bandHit: boolean
  /** Palpite de equity (0..1) e o erro com sinal: positivo = otimista demais. */
  guess: number
  error: number
  eqHit: boolean
  grade: Grade
  /** Vazio quando acertou; QUIZ_EQ_OVER (otimista) ou QUIZ_EQ_UNDER (pessimista). */
  tag: string
}

function gradeFor(absErr: number): Grade {
  if (absErr <= EQ_HIT) return 'best'
  if (absErr <= 0.2) return 'good'
  if (absErr <= 0.3) return 'inaccuracy'
  if (absErr <= 0.45) return 'mistake'
  return 'blunder'
}

export function scoreQuiz(q: ReadQuiz, picked: Band, guess: number): QuizResult {
  const top = (Object.keys(q.bands) as Band[]).reduce((a, b) => (q.bands[b] > q.bands[a] ? b : a))
  const error = guess - q.equity
  const grade = gradeFor(Math.abs(error))
  const eqHit = Math.abs(error) <= EQ_HIT
  return {
    picked,
    top,
    bandHit: q.bands[picked] >= q.bands[top] * 0.8,
    guess,
    error,
    eqHit,
    grade,
    tag: grade === 'best' || grade === 'good' ? '' : error > 0 ? 'QUIZ_EQ_OVER' : 'QUIZ_EQ_UNDER',
  }
}
