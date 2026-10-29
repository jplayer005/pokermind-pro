// ============================================================
// ENGINE: range pre-flop suposto de um vilao, pela POSICAO, pelo STACK e pela ACAO dele.
// Le as tabelas do app (data/ranges): abertura por posicao, 3-bet, 4-bet, defesa do BB e
// push/fold. O perfil do bot alarga ou aperta o resultado. E uma estimativa de treino,
// nao um solver.
// ============================================================
import { canonical169 } from '../cards'
import type { Combo } from '../equity'
import { combosUpToPercentile, handPercentile } from '../bots/policy'
import { profileOf } from '../bots/profiles'
import { positionsBySeat } from '../game/reducer'
import type { GameState } from '../game/types'
import {
  BB_DEFENSE_RANGES, FOUR_BET_RANGES, PUSH_FOLD_RANGES, THREE_BET_RANGES, getOpenRaiseRange,
} from '@/data/ranges'
import type { Position, TableFormat } from '@/types'

export interface PreflopRange {
  combos: Combo[]
  /** Como o range foi montado, para a explicacao do coach. */
  step: string
}

const R = 'AKQJT98765432'
const comboCount = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12)
const coverage = (hs: readonly string[]) => hs.reduce((a, h) => a + comboCount(h), 0) / 1326

const ALL_HANDS: string[] = (() => {
  const out: string[] = []
  for (let i = 0; i < 13; i++)
    for (let j = i; j < 13; j++) {
      if (i === j) out.push(R[i] + R[j])
      else out.push(R[i] + R[j] + 's', R[i] + R[j] + 'o')
    }
  return out.sort((a, b) => handPercentile(a) - handPercentile(b))
})()

/** Aperta (looseness < 1) ou alarga (> 1) uma lista de maos pela forca, mantendo a ordem do range. */
function adjustByLooseness(hands: readonly string[], loose: number): string[] {
  if (Math.abs(loose - 1) < 0.02 || hands.length === 0) return [...hands]
  const target = coverage(hands) * loose
  if (loose < 1) {
    const out: string[] = []
    let cum = 0
    for (const h of [...hands].sort((a, b) => handPercentile(a) - handPercentile(b))) {
      if (cum >= target) break
      out.push(h)
      cum += comboCount(h) / 1326
    }
    return out
  }
  const out = [...hands]
  const have = new Set(hands)
  let cum = coverage(hands)
  for (const h of ALL_HANDS) {
    if (cum >= target) break
    if (have.has(h)) continue
    out.push(h)
    cum += comboCount(h) / 1326
  }
  return out
}

function toCombos(hands: readonly string[], dead: ReadonlySet<number>): Combo[] {
  const set = new Set(hands)
  const out: Combo[] = []
  for (let a = 0; a < 52; a++) {
    if (dead.has(a)) continue
    for (let b = a + 1; b < 52; b++) {
      if (dead.has(b)) continue
      if (set.has(canonical169(a, b))) out.push([a, b])
    }
  }
  return out
}

function pushTable(stackBB: number, pos: Position): string[] {
  const keys = Object.keys(PUSH_FOLD_RANGES).map(Number)
  const key = keys.reduce((best, k) => (Math.abs(k - stackBB) < Math.abs(best - stackBB) ? k : best), keys[0])
  return PUSH_FOLD_RANGES[key]?.[pos] ?? []
}

/**
 * Range pre-flop do assento `seat`, pelo que ele fez nesta mao ate agora.
 * `dead` sao as cartas que o heroi ve (as dele e o board), que saem do range.
 */
export function preflopRangeFor(state: GameState, seat: number, dead: ReadonlySet<number>): PreflopRange {
  const bb = state.cfg.bb
  const villain = state.seats[seat]
  const loose = profileOf(villain.profile).looseness
  const stick = profileOf(villain.profile).stickiness
  const positions = positionsBySeat(state)
  const pos = (positions[seat] ?? 'BTN') as Position
  const n = state.seats.filter((x) => !x.out).length
  const format: TableFormat = n <= 2 ? 'HU' : n <= 6 ? '6max' : '9max'
  const stackBB = villain.startStack / bb

  const pre = state.history.filter((e) => e.street === 'preflop')
  const raisesTotal = pre.filter((e) => e.type === 'raise').length
  const vPre = pre.filter((e) => e.seat === seat && (e.type === 'raise' || e.type === 'call' || e.type === 'check'))
  const vRaises = vPre.filter((e) => e.type === 'raise').length
  const vCalledRaise = vPre.some((e) => e.type === 'call' && e.toCall > bb)
  const firstRaise = pre.find((e) => e.type === 'raise')
  const openerPos = (firstRaise ? positions[firstRaise.seat] : undefined) as Position | undefined
  const label = (h: readonly string[], tail: string) =>
    `${tail}: ~${Math.max(1, Math.round(coverage(h) * 100))}% das mãos`

  const fromWidth = (cap: number, step: string): PreflopRange => ({
    combos: combosUpToPercentile(Math.min(0.9, cap * loose), [...dead]),
    step,
  })

  // ---- stack curto: quem aumenta esta empurrando
  if (vRaises >= 1 && stackBB <= 12) {
    const table = pushTable(stackBB, pos)
    if (table.length > 0) {
      const hs = adjustByLooseness(table, loose)
      return { combos: toCombos(hs, dead), step: label(hs, `foi all-in com ${Math.round(stackBB)}bb no ${pos}`) }
    }
    return fromWidth(0.3, `foi all-in com ${Math.round(stackBB)}bb`)
  }

  if (vRaises >= 2) {
    const hs = adjustByLooseness(FOUR_BET_RANGES[pos] ?? [], loose)
    if (hs.length > 0) return { combos: toCombos(hs, dead), step: label(hs, `deu 4-bet ou mais no ${pos}`) }
    return fromWidth(0.07, 'deu 4-bet ou mais no pré-flop')
  }

  if (vRaises === 1 && raisesTotal >= 2) {
    const hs = adjustByLooseness(THREE_BET_RANGES[pos] ?? [], loose)
    if (hs.length > 0) return { combos: toCombos(hs, dead), step: label(hs, `deu 3-bet no ${pos}`) }
    return fromWidth(0.11, 'deu 3-bet no pré-flop')
  }

  if (vRaises === 1) {
    const open = getOpenRaiseRange(format, pos)
    if (open.length > 0) {
      const hs = adjustByLooseness(open, loose)
      return { combos: toCombos(hs, dead), step: label(hs, `abriu do ${pos} com ${Math.round(stackBB)}bb`) }
    }
    return fromWidth(0.24, `abriu do ${pos}`)
  }

  if (vCalledRaise) {
    const opener = openerPos ?? 'BTN'
    // quem nao e station teria dado 3-bet com as maos do range de 3-bet
    const threeBet = new Set(stick > 0.1 ? [] : THREE_BET_RANGES[pos] ?? [])
    let base: string[] = []
    let tail = `pagou o aumento do ${opener} no ${pos}`
    if (pos === 'BB') {
      base = BB_DEFENSE_RANGES[opener] ?? BB_DEFENSE_RANGES.BTN ?? []
      tail = `defendeu o BB contra o ${opener}`
    } else if (pos === 'SB') {
      const bbDef = BB_DEFENSE_RANGES[opener] ?? BB_DEFENSE_RANGES.BTN ?? []
      base = bbDef.slice(0, Math.floor(bbDef.length * 0.75))
    } else {
      base = getOpenRaiseRange(format, pos).filter((h) => handPercentile(h) <= 0.3)
    }
    const hs = adjustByLooseness(base.filter((h) => !threeBet.has(h)), loose)
    if (hs.length > 0) return { combos: toCombos(hs, dead), step: label(hs, tail) }
    return fromWidth(0.3, 'pagou um aumento no pré-flop')
  }

  return fromWidth(0.6, 'só viu o flop sem aumento')
}
