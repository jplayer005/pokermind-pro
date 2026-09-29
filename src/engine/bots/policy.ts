// ============================================================
// ENGINE: politica dos bots. Pre-flop pelas ranges do app; pos-flop por
// equity contra um range estimado. O perfil (bots/profiles) ajusta as frequencias.
// E uma aproximacao de treino, nao um solver.
// ============================================================
import { canonical169, type Rng } from '../cards'
import { equityVsCombos, type Combo } from '../equity'
import { legalActions, positionsBySeat, potTotal } from '../game/reducer'
import type { Action, GameState, LegalActions } from '../game/types'
import { profileOf, type BotProfile } from './profiles'
import { getOpenRaiseRange, THREE_BET_RANGES, FOUR_BET_RANGES } from '@/data/ranges'
import type { Position, TableFormat } from '@/types'

// ---------- forca relativa das 169 maos (formula de Chen) ----------

const R = 'AKQJT98765432'

function chen(hiIdx: number, loIdx: number, suited: boolean): number {
  // indices: A=0..2=12; converte para 2=0..A=12
  const hi = 12 - hiIdx
  const lo = 12 - loIdx
  const pts = (r: number) => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2)
  let s = pts(hi)
  if (hi === lo) return Math.max(5, s * 2)
  if (suited) s += 2
  const gap = hi - lo - 1
  s -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5
  if (gap <= 1 && hi < 10) s += 1
  return Math.ceil(s)
}

let pctCache: Record<string, number> | null = null

/** Percentil da mao (0 = a melhor, 1 = a pior), ponderado por combos. */
export function handPercentile(hand: string): number {
  if (!pctCache) {
    const list: { hand: string; score: number; combos: number; hi: number }[] = []
    for (let i = 0; i < 13; i++)
      for (let j = i; j < 13; j++) {
        if (i === j) list.push({ hand: R[i] + R[j], score: chen(i, j, false), combos: 6, hi: 12 - i })
        else {
          list.push({ hand: R[i] + R[j] + 's', score: chen(i, j, true), combos: 4, hi: 12 - i })
          list.push({ hand: R[i] + R[j] + 'o', score: chen(i, j, false), combos: 12, hi: 12 - i })
        }
      }
    list.sort((a, b) => b.score - a.score || b.hi - a.hi || (a.hand < b.hand ? -1 : 1))
    pctCache = {}
    let cum = 0
    for (const h of list) {
      pctCache[h.hand] = (cum + h.combos / 2) / 1326
      cum += h.combos
    }
  }
  return pctCache[hand] ?? 1
}

const comboCount = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12)
const coverage = (hands: string[]) => hands.reduce((a, h) => a + comboCount(h), 0) / 1326

const ALL_COMBOS: Combo[] = (() => {
  const out: Combo[] = []
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) out.push([a, b])
  return out
})()

// ---------- helpers de acao ----------

function raiseTo(la: LegalActions, target: number, stack: number, bet: number): Action {
  if (!la.canRaise) return la.canCall ? { type: 'call' } : { type: 'check' }
  const to = Math.max(la.minTo, Math.min(la.maxTo, Math.round(target)))
  // comprometeu quase tudo: vai all-in de uma vez
  if (to - bet >= stack * 0.7) return { type: 'raise', to: la.maxTo }
  return { type: 'raise', to }
}

const checkOrFold = (la: LegalActions): Action => (la.canCheck ? { type: 'check' } : { type: 'fold' })

function formatFor(n: number): TableFormat {
  return n <= 2 ? 'HU' : n <= 6 ? '6max' : '9max'
}

// ---------- decisao ----------

export function decideBot(state: GameState, rng: Rng = Math.random): Action {
  const seat = state.seats[state.toAct]
  const la = legalActions(state)
  const profile = profileOf(seat.profile)
  if (!seat.cards) return checkOrFold(la)
  return state.street === 'preflop'
    ? decidePreflop(state, la, profile, rng)
    : decidePostflop(state, la, profile, rng)
}

function decidePreflop(state: GameState, la: LegalActions, p: BotProfile, rng: Rng): Action {
  const seat = state.seats[state.toAct]
  const cards = seat.cards as [number, number]
  const hand = canonical169(cards[0], cards[1])
  const pct = handPercentile(hand)
  const bb = state.cfg.bb
  const stackBB = (seat.stack + seat.bet) / bb
  const raises = state.history.filter((e) => e.street === 'preflop' && e.type === 'raise').length
  const n = state.seats.filter((x) => !x.out).length
  const pos = (positionsBySeat(state)[seat.id] ?? 'BTN') as Position
  const facing = la.canCall

  // Stack curto: empurra ou foge
  if (stackBB <= 12) {
    const pushPct = Math.min(0.55, (0.18 + (12 - stackBB) * 0.03) * p.looseness)
    if (raises === 0 && pct <= pushPct && la.canRaise) return { type: 'raise', to: la.maxTo }
    if (raises > 0 && pct <= pushPct * 0.5) return la.canRaise ? { type: 'raise', to: la.maxTo } : { type: 'call' }
    return checkOrFold(la)
  }

  // Sem aumento anterior
  if (raises === 0) {
    if (!facing) {
      // opcao do BB
      return pct <= 0.08 * p.looseness && rng() < 0.8 * Math.min(1, p.aggression)
        ? raiseTo(la, bb * 3.5, seat.stack, seat.bet)
        : { type: 'check' }
    }
    const open = getOpenRaiseRange(formatFor(n), pos)
    const inRange = open.includes(hand)
    const cov = coverage(open)
    let opens = inRange
    if (p.looseness < 1) opens = inRange && pct <= cov * p.looseness
    else if (p.looseness > 1) opens = inRange || (pct <= cov * p.looseness && rng() < 0.6)
    if (opens) {
      const size = pos === 'SB' ? 3 : pos === 'BTN' || pos === 'CO' ? 2.3 : 2.5
      return raiseTo(la, bb * size, seat.stack, seat.bet)
    }
    // estacao paga (limp) com mao razoavel
    if (p.stickiness > 0.1 && pct <= 0.4) return { type: 'call' }
    return checkOrFold(la)
  }

  const sizeBB = state.currentBet / bb

  if (raises === 1) {
    const three = THREE_BET_RANGES[pos] ?? []
    if (three.includes(hand) && rng() < Math.min(0.95, 0.8 * p.aggression + 0.1)) {
      const mult = pos === 'BB' || pos === 'SB' ? 3.8 : 3
      return raiseTo(la, state.currentBet * mult, seat.stack, seat.bet)
    }
    const base = pos === 'BB' ? 0.38 : pos === 'SB' ? 0.14 : pos === 'BTN' ? 0.2 : pos === 'CO' ? 0.16 : 0.12
    const callPct = (base * p.looseness) / (sizeBB > 4 ? 1.6 : 1) + Math.max(0, p.stickiness) * 0.4
    return pct <= callPct ? { type: 'call' } : { type: 'fold' }
  }

  // 3-bet ou mais
  const four = FOUR_BET_RANGES[pos] ?? []
  if (four.includes(hand)) {
    return raiseTo(la, state.currentBet * 2.3, seat.stack, seat.bet)
  }
  const stick = 0.05 * p.looseness + Math.max(0, p.stickiness) * 0.3
  return pct <= stick ? { type: 'call' } : { type: 'fold' }
}

function decidePostflop(state: GameState, la: LegalActions, p: BotProfile, rng: Rng): Action {
  const seat = state.seats[state.toAct]
  const cards = seat.cards as [number, number]
  const pot = potTotal(state)
  const foes = Math.max(1, state.seats.filter((x) => !x.out && !x.folded).length - 1)

  const raw = equityVsCombos(cards, ALL_COMBOS, state.board, 220, rng).equity
  // contra varios oponentes a equity individual encolhe
  const multi = Math.pow(raw, 1 + 0.7 * (foes - 1))
  const facing = la.canCall
  const toCall = la.callAmount
  const discount = facing ? 0.1 + 0.1 * Math.min(1, toCall / Math.max(pot, 1)) : 0
  const adj = multi - discount
  const A = p.aggression
  const streetFactor = state.street === 'flop' ? 1 : state.street === 'turn' ? 0.7 : 0.5

  const betPct = (frac: number): Action =>
    raiseTo(la, state.currentBet + frac * pot, seat.stack, seat.bet)

  if (!facing) {
    if (adj > 0.72) return rng() < Math.min(0.95, 0.75 * A) ? betPct(0.66) : { type: 'check' }
    if (adj > 0.55) return rng() < Math.min(0.8, 0.5 * A) ? betPct(0.4) : { type: 'check' }
    const bluff = p.bluff * streetFactor * (adj < 0.4 ? 1 : 0.4)
    return rng() < bluff ? betPct(0.5) : { type: 'check' }
  }

  const potOdds = toCall / (pot + toCall)
  const need = potOdds + 0.03 - p.stickiness
  if (adj > 0.78 && la.canRaise && rng() < Math.min(0.7, 0.45 * A)) {
    return raiseTo(la, state.currentBet * 2.6 + pot * 0.2, seat.stack, seat.bet)
  }
  if (adj > need) return { type: 'call' }
  if (la.canRaise && rng() < 0.03 * A * (1 + p.bluff)) {
    return raiseTo(la, state.currentBet * 2.5, seat.stack, seat.bet)
  }
  return { type: 'fold' }
}
