// ============================================================
// ENGINE: EV (em bb) de push/fold em HEADS-UP, a partir dos ranges do solver e da tabela de
// equity 169x169. Modelo chip-EV, exato em estrutura (SB 0,5 / BB 1, stacks efetivos iguais);
// as aproximacoes sao: equity da tabela (ruido ~0,3 pp) e remocao de cartas so do heroi.
// Nas maos "mistas" do solver o EV das duas acoes tem de ser ~igual: e o teste de sanidade.
// ============================================================
import { generateHandCombos } from '@/lib/poker'
import type { Card, Rank, Suit } from '@/types'
import type { EquityTable } from '../equity169'
import type { Spot } from '../spots'

export interface PushFoldEV {
  /** EV (bb) da acao agressiva (all-in ou call). */
  agg: number
  /** EV (bb) de foldar (-0,5 como SB, -1 como BB). */
  fold: number
  /** agg - fold: quanto vale ir all-in/pagar em vez de foldar. */
  delta: number
}

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

/** Cartas concretas para um exemplo da mao canonica (so para contar combos restantes). */
function sampleCards(hand: string): Card[] {
  const r1 = hand[0] as Rank
  const r2 = hand[1] as Rank
  if (r1 === r2) return [{ rank: r1, suit: SUITS[0] }, { rank: r2, suit: SUITS[1] }]
  if (hand.endsWith('s')) return [{ rank: r1, suit: SUITS[0] }, { rank: r2, suit: SUITS[0] }]
  return [{ rank: r1, suit: SUITS[0] }, { rank: r2, suit: SUITS[1] }]
}

/**
 * Do ponto de vista de `hero`: probabilidade `p` de o oponente tomar a acao (paga / empurra) e
 * equity media `e` do heroi contra as maos com que ele toma essa acao. Pesa por combos
 * disponiveis apos remover as cartas do heroi.
 */
export function versusRange(
  table: EquityTable,
  hero: string,
  oppFreq: (hand: string) => number,
): { p: number; e: number } {
  const dead = sampleCards(hero)
  let total = 0
  let acting = 0
  let eqSum = 0
  for (const h of table.hands) {
    const combos = generateHandCombos(h, dead).length
    if (combos === 0) continue
    const w = combos
    const f = oppFreq(h)
    total += w
    acting += w * f
    eqSum += w * f * table.eq(hero, h)
  }
  return { p: total > 0 ? acting / total : 0, e: acting > 0 ? eqSum / acting : 0.5 }
}

/** SB (botao) da all-in com `hero` contra a defesa do BB. `stack` em bb efetivos. */
export function evHuPush(table: EquityTable, hero: string, stack: number, callSpot: Spot): PushFoldEV {
  const { p, e } = versusRange(table, hero, (h) => callSpot.freq(h))
  const shove = (1 - p) * 1 + p * (e * 2 * stack - stack)
  const fold = -0.5
  return { agg: shove, fold, delta: shove - fold }
}

/** BB paga o all-in do SB com `hero`. `stack` em bb efetivos. */
export function evHuCall(table: EquityTable, hero: string, stack: number, pushSpot: Spot): PushFoldEV {
  const { e } = versusRange(table, hero, (h) => pushSpot.freq(h))
  const call = e * 2 * stack - stack
  const fold = -1
  return { agg: call, fold, delta: call - fold }
}

/** Perda (bb) por tomar `choseAggressive` em vez da melhor das duas acoes. */
export function evLoss(ev: PushFoldEV, choseAggressive: boolean): number {
  const chosen = choseAggressive ? ev.agg : ev.fold
  return Math.max(0, Math.max(ev.agg, ev.fold) - chosen)
}

/** EV do push/fold em heads-up para o spot do heroi: `acao` 'push' (SB) ou 'call' (BB). */
export function huPushFoldEV(
  bank: { get: (id: string) => Spot | undefined },
  table: EquityTable,
  acao: 'push' | 'call',
  hand: string,
  stackBucket: number,
): PushFoldEV | null {
  if (acao === 'push') {
    const call = bank.get(`HU:${stackBucket}:BB`)
    return call ? evHuPush(table, hand, stackBucket, call) : null
  }
  const push = bank.get(`HU:${stackBucket}:SB`)
  return push ? evHuCall(table, hand, stackBucket, push) : null
}
