// ============================================================
// ENGINE: pergunta de range no pre-flop. Quando a vez de ABRIR o pote chega ao heroi, a mesa pode
// perguntar "essa mao esta no seu range de abertura daqui?" antes de ele agir. O gabarito e o mesmo
// range que os bots e o coach usam (getOpenRaiseRange). Erros viram cards de repeticao espacada.
// ============================================================
import { canonical169 } from '../cards'
import { legalActions, positionsBySeat } from '../game/reducer'
import type { GameState } from '../game/types'
import { formatFor } from '../bots/policy'
import { getOpenRaiseRange } from '@/data/ranges'
import type { Grade } from './types'
import type { Position, TableFormat } from '@/types'

export type OpenQuizFreq = 'off' | 'some' | 'all'

/** Abaixo disso o spot e de push ou fold, nao de abertura. */
const MIN_STACK_BB = 12

export interface OpenQuiz {
  handNumber: number
  hand: string
  pos: Position
  format: TableFormat
  /** A mao esta no range de abertura da posicao. */
  inRange: boolean
  /** Range de abertura da posicao, para mostrar na revelacao. */
  range: string[]
  /** Chave do card de repeticao espacada. */
  key: string
}

/** Vez do heroi de abrir o pote: pre-flop, sem aumento antes, com algo a pagar (fora a opcao do BB). */
export function isOpenQuizSpot(state: GameState): boolean {
  if (state.over || state.toAct < 0 || state.street !== 'preflop') return false
  const seat = state.seats[state.toAct]
  if (!seat?.isHero || !seat.cards) return false
  if (state.history.some((e) => e.street === 'preflop' && e.type === 'raise')) return false
  if (!legalActions(state).canCall) return false
  if (state.seats.filter((x) => !x.out).length <= 2) return false
  return (seat.stack + seat.bet) / state.cfg.bb > MIN_STACK_BB
}

export function buildOpenQuiz(state: GameState): OpenQuiz | null {
  if (!isOpenQuizSpot(state)) return null
  const seat = state.seats[state.toAct]
  const pos = positionsBySeat(state)[seat.id] as Position | undefined
  if (!pos || pos === 'BB' || !seat.cards) return null
  const format = formatFor(state.seats.filter((x) => !x.out).length)
  const hand = canonical169(seat.cards[0], seat.cards[1])
  const range = getOpenRaiseRange(format, pos)
  return { handNumber: state.handNumber, hand, pos, format, inRange: range.includes(hand), range, key: `open:${format}:${pos}:${hand}` }
}

/** Conforme a frequencia: card vencido na repeticao espacada e sempre perguntado; senao, em maos alternadas. */
export function shouldAskOpenQuiz(state: GameState, freq: OpenQuizFreq, dueKeys: ReadonlySet<string>): boolean {
  if (freq === 'off') return false
  if (freq === 'all') return true
  const q = buildOpenQuiz(state)
  if (q && dueKeys.has(q.key)) return true
  return state.handNumber % 2 === 0
}

export interface OpenQuizResult {
  /** O que o jogador respondeu: true = "esta no range". */
  answeredIn: boolean
  correct: boolean
  grade: Grade
  /** Vazio quando acertou; OPEN_TOO_WIDE (abriria mao fora do range) ou OPEN_TOO_TIGHT (largaria mao do range). */
  tag: string
}

export function scoreOpenQuiz(q: OpenQuiz, answeredIn: boolean): OpenQuizResult {
  const correct = answeredIn === q.inRange
  return {
    answeredIn,
    correct,
    grade: correct ? 'best' : 'mistake',
    tag: correct ? '' : answeredIn ? 'OPEN_TOO_WIDE' : 'OPEN_TOO_TIGHT',
  }
}
