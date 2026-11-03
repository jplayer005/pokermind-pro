// ============================================================
// ENGINE: "Pinte o range". Spots (abrir de uma posicao, 3-bet, defesa do BB, push/fold por stack)
// montados a partir das tabelas do app, a nota da pintura (ponderada por combos) e a escolha do
// proximo spot pela repeticao espacada. Sem React.
// ============================================================
import { generateHandGrid } from '@/lib/poker'
import {
  BB_DEFENSE_RANGES, PUSH_FOLD_RANGES, THREE_BET_RANGES, getOpenRaiseRange,
} from '@/data/ranges'
import type { Position } from '@/types'
import type { Rng } from '../cards'
import type { Grade } from '../coach/types'

export type PaintScenario = 'open' | '3bet' | 'bbdef' | 'pushfold'

export interface PaintSpot {
  id: string
  scenario: PaintScenario
  position: string
  title: string
  subtitle: string
  /** As maos do range correto, no formato do grid (AA, AKs, AKo). */
  truth: string[]
}

const GRID = new Set(generateHandGrid().flat())

/** Combos de uma mao: par 6, suited 4, offsuit 12. */
export const comboCount = (hand: string): number => (hand.length === 2 ? 6 : hand.endsWith('s') ? 4 : 12)

const sumCombos = (hands: Iterable<string>) => {
  let n = 0
  for (const h of hands) n += comboCount(h)
  return n
}

/** Todos os spots: so entram os que tem range nas tabelas. */
export function allSpots(): PaintSpot[] {
  const out: PaintSpot[] = []
  const push = (s: PaintSpot) => { if (s.truth.length > 3) out.push({ ...s, truth: [...new Set(s.truth)].filter((h) => GRID.has(h)) }) }

  for (const pos of ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]) {
    push({
      id: `open-${pos}`, scenario: 'open', position: pos,
      title: `Abrir do ${pos}`, subtitle: '6-max, 100 bb, ninguém agiu antes de você',
      truth: getOpenRaiseRange('6max', pos),
    })
  }
  for (const pos of ['CO', 'BTN', 'SB', 'BB'] as Position[]) {
    push({
      id: `3bet-${pos}`, scenario: '3bet', position: pos,
      title: `3-bet do ${pos}`, subtitle: 'Contra uma abertura, 100 bb',
      truth: THREE_BET_RANGES[pos] ?? [],
    })
  }
  for (const v of ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]) {
    push({
      id: `bbdef-${v}`, scenario: 'bbdef', position: 'BB',
      title: `BB defende contra o ${v}`, subtitle: 'Pagar ou dar 3-bet, 100 bb',
      truth: BB_DEFENSE_RANGES[v] ?? [],
    })
  }
  for (const stack of [10, 15]) {
    for (const pos of ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as Position[]) {
      push({
        id: `push-${stack}-${pos}`, scenario: 'pushfold', position: pos,
        title: `Empurrar do ${pos}`, subtitle: `${stack} bb, ninguém agiu antes de você`,
        truth: PUSH_FOLD_RANGES[stack]?.[pos] ?? [],
      })
    }
  }
  return out
}

export interface PaintScore {
  /** Combos acertados / (combos do gabarito + combos pintados a mais): 1 = perfeito. */
  accuracy: number
  /** Maos do gabarito que ficaram sem pintar e maos pintadas fora do range. */
  missed: string[]
  extra: string[]
  hits: string[]
  grade: Grade
  passed: boolean
  /** TIGHT (faltou range), LOOSE (sobrou) ou vazio quando passou. */
  tag: '' | 'TIGHT' | 'LOOSE'
}

/** Nota minima para contar como acerto do spot. */
export const PASS_ACCURACY = 0.8

function gradeFor(a: number): Grade {
  if (a >= 0.92) return 'best'
  if (a >= PASS_ACCURACY) return 'good'
  if (a >= 0.65) return 'inaccuracy'
  if (a >= 0.45) return 'mistake'
  return 'blunder'
}

export function scorePaint(painted: Iterable<string>, truth: readonly string[]): PaintScore {
  const p = new Set([...painted].filter((h) => GRID.has(h)))
  const t = new Set(truth)
  const hits = [...t].filter((h) => p.has(h))
  const missed = [...t].filter((h) => !p.has(h))
  const extra = [...p].filter((h) => !t.has(h))
  const hitCombos = sumCombos(hits)
  const denom = sumCombos(t) + sumCombos(extra)
  const accuracy = denom > 0 ? hitCombos / denom : 0
  const passed = accuracy >= PASS_ACCURACY
  const tag = passed ? '' : sumCombos(missed) >= sumCombos(extra) ? 'TIGHT' : 'LOOSE'
  return { accuracy, missed, extra, hits, grade: gradeFor(accuracy), passed, tag }
}

export interface PickState {
  /** Ids de spots que ja tem historico de repeticao espacada. */
  seen: ReadonlySet<string>
  /** Ids vencidos para revisar hoje. */
  due: ReadonlySet<string>
  /** Spot anterior (para nao repetir em seguida). */
  last?: string
}

/** Proximo spot: vencidos primeiro, depois os nunca vistos, depois qualquer um; sem repetir o ultimo. */
export function pickNextSpot(spots: readonly PaintSpot[], st: PickState, rng: Rng = Math.random): PaintSpot {
  const notLast = spots.filter((s) => s.id !== st.last)
  const pool = notLast.length > 0 ? notLast : [...spots]
  const due = pool.filter((s) => st.due.has(s.id))
  const fresh = pool.filter((s) => !st.seen.has(s.id))
  const pick = due.length > 0 ? due : fresh.length > 0 ? fresh : pool
  return pick[Math.floor(rng() * pick.length)]
}
