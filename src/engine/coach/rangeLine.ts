// ============================================================
// ENGINE: a linha do range na revisao da mao. Por rua em que o heroi decidiu: a largura do range do
// vilao (% das maos), a equity do heroi contra ele e o pote. A rua em que a equity mais despenca fica
// marcada: e onde a mao "passou a perder" (por exemplo, o raise do turn contra um top par).
// ============================================================
import type { GradedDecision } from './types'

/** Queda de equity (em pontos percentuais) que marca a rua como virada. */
export const EQUITY_DROP = 15

export interface RangeLineRow {
  street: GradedDecision['street']
  /** % das maos que o vilao ainda pode ter. */
  rangePct: number
  /** Equity do heroi contra esse range, em %. */
  equityPct: number
  /** Pote (em fichas) antes da decisao. */
  pot: number
  /** A equity caiu EQUITY_DROP pontos ou mais desde a decisao anterior. */
  drop: boolean
}

export function rangeLine(decisions: readonly GradedDecision[]): RangeLineRow[] {
  const rows: RangeLineRow[] = []
  for (const d of decisions) {
    if (d.rangePct === undefined || d.equity === undefined) continue
    const equityPct = Math.round(d.equity * 100)
    const prev = rows[rows.length - 1]
    rows.push({ street: d.street, rangePct: d.rangePct, equityPct, pot: d.potBefore, drop: !!prev && prev.equityPct - equityPct >= EQUITY_DROP })
  }
  return rows
}
