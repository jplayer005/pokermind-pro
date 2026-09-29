// ============================================================
// ENGINE: HUD dos bots (VPIP, PFR, 3-bet, AF, WTSD) acumulado por assento
// ============================================================
import type { GameState } from '../game/types'

export interface HudStats {
  hands: number
  vpip: number
  pfr: number
  threeBet: number
  sawFlop: number
  showdowns: number
  aggr: number // apostas e aumentos pos-flop
  calls: number // calls pos-flop
}

export const emptyHud = (): HudStats => ({
  hands: 0, vpip: 0, pfr: 0, threeBet: 0, sawFlop: 0, showdowns: 0, aggr: 0, calls: 0,
})

/** Acumula uma mao terminada nas estatisticas de cada assento. */
export function updateHud(prev: Record<number, HudStats>, game: GameState): Record<number, HudStats> {
  const next: Record<number, HudStats> = { ...prev }
  let preflopRaises = 0

  for (const seat of game.seats) {
    if (seat.out && !seat.cards) continue
    next[seat.id] = { ...(prev[seat.id] ?? emptyHud()) }
    next[seat.id].hands++
  }

  const vpip = new Set<number>()
  const pfr = new Set<number>()
  const tb = new Set<number>()
  for (const e of game.history) {
    const st = next[e.seat]
    if (!st) continue
    if (e.street === 'preflop') {
      if (e.type === 'call' || e.type === 'raise') vpip.add(e.seat)
      if (e.type === 'raise') {
        pfr.add(e.seat)
        if (preflopRaises === 1) tb.add(e.seat)
        preflopRaises++
      }
    } else {
      if (e.type === 'raise') st.aggr++
      else if (e.type === 'call') st.calls++
    }
  }
  vpip.forEach((id) => next[id] && next[id].vpip++)
  pfr.forEach((id) => next[id] && next[id].pfr++)
  tb.forEach((id) => next[id] && next[id].threeBet++)

  const flopSeen = game.board.length >= 3
  for (const seat of game.seats) {
    const st = next[seat.id]
    if (!st) continue
    const foldedPre = game.history.some((e) => e.seat === seat.id && e.street === 'preflop' && e.type === 'fold')
    if (flopSeen && !foldedPre && seat.cards) {
      st.sawFlop++
      if (game.result?.showdown && !seat.folded) st.showdowns++
    }
  }
  return next
}

export const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

/** Linha curta para a mesa, ex.: "V34 P21". Vazio ate haver amostra minima. */
export function hudLine(s: HudStats | undefined, minHands = 8): string {
  if (!s || s.hands < minHands) return ''
  const af = s.calls > 0 ? (s.aggr / s.calls).toFixed(1) : s.aggr > 0 ? '∞' : '0'
  return `V${pctOf(s.vpip, s.hands)} P${pctOf(s.pfr, s.hands)} AF${af}`
}
