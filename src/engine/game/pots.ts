// ============================================================
// ENGINE: side pots e distribuicao
// ============================================================
import type { PotLayer } from './types'

export interface PotInput {
  total: number
  folded: boolean
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i])

/**
 * Monta pote principal e side pots por camadas de contribuicao.
 * Quem foldou contribui mas nao concorre. Camadas com os mesmos elegiveis se fundem.
 */
export function buildPots(seats: readonly PotInput[]): PotLayer[] {
  const levels = [...new Set(seats.filter((s) => s.total > 0).map((s) => s.total))].sort((a, b) => a - b)
  const pots: PotLayer[] = []
  let prev = 0
  for (const lvl of levels) {
    let amount = 0
    for (const s of seats) amount += Math.max(0, Math.min(s.total, lvl) - prev)
    const eligible: number[] = []
    seats.forEach((s, i) => {
      if (!s.folded && s.total >= lvl) eligible.push(i)
    })
    if (amount > 0) {
      const last = pots[pots.length - 1]
      if (last && (eligible.length === 0 || sameSet(last.eligible, eligible))) last.amount += amount
      else pots.push({ amount, eligible })
    }
    prev = lvl
  }
  return pots
}

export interface Award {
  payout: number[]
  pots: (PotLayer & { winners: number[] })[]
}

/**
 * Reparte cada pote entre os melhores `scores` dentre os elegiveis.
 * Ficha sobrando vai para o primeiro vencedor a esquerda do botao.
 */
export function awardPots(
  pots: readonly PotLayer[],
  scores: readonly (number | null)[],
  button: number,
): Award {
  const n = scores.length
  const payout = new Array<number>(n).fill(0)
  const out: Award['pots'] = []

  for (const pot of pots) {
    const elig = pot.eligible.filter((i) => scores[i] !== null)
    let winners: number[]
    if (elig.length === 0) {
      winners = pot.eligible.length ? [pot.eligible[0]] : []
    } else {
      const best = Math.max(...elig.map((i) => scores[i] as number))
      winners = elig.filter((i) => scores[i] === best)
    }
    if (winners.length === 0) continue

    // ordem a esquerda do botao
    const ordered = [...winners].sort(
      (a, b) => ((a - button - 1 + n) % n) - ((b - button - 1 + n) % n),
    )
    const share = Math.floor(pot.amount / ordered.length)
    let rest = pot.amount - share * ordered.length
    for (const w of ordered) {
      payout[w] += share + (rest > 0 ? 1 : 0)
      if (rest > 0) rest--
    }
    out.push({ ...pot, winners: ordered })
  }
  return { payout, pots: out }
}
