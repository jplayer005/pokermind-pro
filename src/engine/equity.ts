// ============================================================
// ENGINE: equity mao vs range (avaliador real)
// ============================================================
import { drawCards, type Rng } from './cards'
import { evaluate } from './evaluator'

export interface EquityResult {
  equity: number
  wins: number
  ties: number
  losses: number
  runs: number
  exact: boolean
}

export type Combo = readonly [number, number]

/** Limite de avaliacoes para preferir enumeracao exata a Monte Carlo. */
const EXACT_LIMIT = 200_000

function tally(hero: number[], vill: number[], acc: { w: number; t: number; l: number }) {
  const h = evaluate(hero)
  const v = evaluate(vill)
  if (h > v) acc.w++
  else if (h < v) acc.l++
  else acc.t++
}

function finish(acc: { w: number; t: number; l: number }, exact: boolean): EquityResult {
  const runs = acc.w + acc.t + acc.l
  return {
    equity: runs > 0 ? (acc.w + acc.t * 0.5) / runs : 0.5,
    wins: acc.w,
    ties: acc.t,
    losses: acc.l,
    runs,
    exact,
  }
}

/**
 * Equity do hero contra uma lista de combos do vilao (sorteio uniforme por combo).
 * `board` pode ter 0, 3, 4 ou 5 cartas. Combos que colidem com hero/board sao ignorados.
 * Enumera tudo quando cabe em EXACT_LIMIT; senao amostra `iterations` vezes.
 */
export function equityVsCombos(
  hero: Combo,
  villainCombos: readonly Combo[],
  board: readonly number[] = [],
  iterations = 2000,
  rng: Rng = Math.random,
): EquityResult {
  const dead = new Set<number>([hero[0], hero[1], ...board])
  const valid = villainCombos.filter(([a, b]) => !dead.has(a) && !dead.has(b) && a !== b)
  const acc = { w: 0, t: 0, l: 0 }
  if (valid.length === 0) return finish(acc, false)

  const need = 5 - board.length
  const heroBase = [hero[0], hero[1], ...board]

  // Enumeracao exata para river e turn (e flop com poucos combos)
  if (need === 0) {
    for (const v of valid) tally(heroBase, [v[0], v[1], ...board], acc)
    return finish(acc, true)
  }
  if (need === 1) {
    const free: number[] = []
    for (let c = 0; c < 52; c++) if (!dead.has(c)) free.push(c)
    if (valid.length * free.length <= EXACT_LIMIT) {
      for (const v of valid) {
        for (const c of free) {
          if (c === v[0] || c === v[1]) continue
          tally([...heroBase, c], [v[0], v[1], ...board, c], acc)
        }
      }
      return finish(acc, true)
    }
  }

  for (let i = 0; i < iterations; i++) {
    const v = valid[Math.floor(rng() * valid.length)]
    const extra = drawCards(need, [...dead, v[0], v[1]], rng)
    tally([...heroBase, ...extra], [v[0], v[1], ...board, ...extra], acc)
  }
  return finish(acc, false)
}
