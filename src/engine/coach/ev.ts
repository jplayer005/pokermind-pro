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

// ---------------------------------------------------------------- multiway (6/9-max, SNG, mesa final)
// Modelo: o heroi da all-in (ou paga um all-in) e e chamado por UM oponente (o primeiro que paga,
// pelas frequencias de call do solver); chamadas multiplas e overcalls ficam de fora. O EV em
// fichas e exato dentro desse modelo. Em torneio com a mesa toda conhecida (SNG, mesa final) o
// resultado final de cada ramo vira valor ICM (modelo Malmuth-Harville) em % do premio.

import { calculateICM } from '@/lib/poker'

export interface MwPlayer {
  /** Nome da posicao no banco de spots (UTG, UTG1, MP, LJ, HJ, CO, BTN, SB, BB). */
  key: string
  /** Fichas no inicio da mao (stack atras + ja comprometido, ante incluso). */
  total: number
  /** Comprometido na mao ate agora (blinds, ante, apostas). */
  committed: number
  folded: boolean
}

export interface MwEV {
  /** EV em fichas relativo ao inicio da mao (agg = all-in/call, fold = foldar). */
  chip: PushFoldEV
  /** Valor ICM em % do premio total, ou null fora de torneio de mesa completa. */
  icm: PushFoldEV | null
}

interface Branch {
  prob: number
  /** Ganho liquido de cada jogador (indexado como `players`), soma zero. */
  net: number[]
}

function foldNets(players: MwPlayer[], hero: number): number[] {
  const P = players.reduce((a, p) => a + p.committed, 0)
  const othersT = players.reduce((a, p, i) => (i === hero ? a : a + p.total), 0)
  return players.map((p, i) => (i === hero ? -p.committed : -p.committed + (P * p.total) / Math.max(othersT, 1)))
}

/** Heroi e `opp` brigam por `E` fichas; os demais so perdem o que ja puseram no pote. */
function showdownNets(players: MwPlayer[], hero: number, opp: number, E: number, heroWins: boolean): number[] {
  const dead = players.reduce((a, p, i) => (i === hero || i === opp ? a : a + p.committed), 0)
  return players.map((p, i) => {
    if (i === hero) return heroWins ? E + dead : -E
    if (i === opp) return heroWins ? -E : E + dead
    return -p.committed
  })
}

function uncalledNets(players: MwPlayer[], hero: number): number[] {
  const others = players.reduce((a, p, i) => (i === hero ? a : a + p.committed), 0)
  return players.map((p, i) => (i === hero ? others : -p.committed))
}

function expect(branches: Branch[], hero: number): number {
  return branches.reduce((a, b) => a + b.prob * b.net[hero], 0)
}

function icmExpect(players: MwPlayer[], hero: number, branches: Branch[], payouts: number[]): number {
  return branches.reduce((a, b) => {
    const stacks = players.map((p, i) => Math.max(0, p.total + b.net[i]))
    return a + b.prob * calculateICM(stacks, payouts)[hero] * 100
  }, 0)
}

function icmUsable(players: MwPlayer[], payouts?: number[]): payouts is number[] {
  if (!payouts || payouts.length === 0 || players.length < 2) return false
  // recursao N! : acima de 7 jogadores com muitos premios fica caro; nesse caso so em fichas
  return players.length <= 7 || payouts.length <= 3
}

function finish(players: MwPlayer[], hero: number, agg: Branch[], payouts?: number[]): MwEV {
  const foldB: Branch[] = [{ prob: 1, net: foldNets(players, hero) }]
  const chipAgg = expect(agg, hero)
  const chipFold = foldB[0].net[hero]
  let icm: PushFoldEV | null = null
  if (icmUsable(players, payouts)) {
    const a = icmExpect(players, hero, agg, payouts)
    const f = icmExpect(players, hero, foldB, payouts)
    icm = { agg: a, fold: f, delta: a - f }
  }
  return { chip: { agg: chipAgg, fold: chipFold, delta: chipAgg - chipFold }, icm }
}

/**
 * Heroi (indice `hero`) da all-in com `hand`. `behind`: indices dos oponentes ainda a agir,
 * na ordem de acao. Precisa do spot de call de cada um contra a posicao do heroi.
 */
export function mwPushEV(a: {
  bank: { get: (id: string) => Spot | undefined }
  table: EquityTable
  prefix: string
  bucket: number
  hand: string
  hero: number
  players: MwPlayer[]
  behind: number[]
  payouts?: number[]
}): MwEV | null {
  const { players, hero, behind } = a
  if (behind.length === 0) return null
  const heroKey = players[hero].key
  const branches: Branch[] = []
  let none = 1
  for (const j of behind) {
    const spot = a.bank.get(`${a.prefix}:${a.bucket}:${players[j].key}_vs_${heroKey}`)
    if (!spot) return null
    const { p, e } = versusRange(a.table, a.hand, (h) => spot.freq(h))
    const q = none * p
    none *= 1 - p
    if (q <= 0) continue
    const E = Math.min(players[hero].total, players[j].total)
    branches.push({ prob: q * e, net: showdownNets(players, hero, j, E, true) })
    branches.push({ prob: q * (1 - e), net: showdownNets(players, hero, j, E, false) })
  }
  branches.push({ prob: none, net: uncalledNets(players, hero) })
  return finish(players, hero, branches, a.payouts)
}

/** Heroi paga o all-in de `shover` com `hand` (overcalls e outros chamadores ignorados). */
export function mwCallEV(a: {
  bank: { get: (id: string) => Spot | undefined }
  table: EquityTable
  prefix: string
  bucket: number
  hand: string
  hero: number
  players: MwPlayer[]
  shover: number
  payouts?: number[]
}): MwEV | null {
  const { players, hero, shover } = a
  const spot = a.bank.get(`${a.prefix}:${a.bucket}:${players[shover].key}`)
  if (!spot) return null
  const { e } = versusRange(a.table, a.hand, (h) => spot.freq(h))
  const E = Math.min(players[hero].total, players[shover].total)
  const branches: Branch[] = [
    { prob: e, net: showdownNets(players, hero, shover, E, true) },
    { prob: 1 - e, net: showdownNets(players, hero, shover, E, false) },
  ]
  return finish(players, hero, branches, a.payouts)
}
