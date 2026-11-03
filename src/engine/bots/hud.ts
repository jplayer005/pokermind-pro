// ============================================================
// ENGINE: HUD dos bots (VPIP, PFR, 3-bet, AF, WTSD) acumulado por jogador (nome)
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

/**
 * Acumula uma mao terminada nas estatisticas de cada JOGADOR (chave = nome). Assim as estatisticas
 * acompanham o jogador quando ele muda de mesa ou de assento num torneio.
 */
export function updateHud(prev: Record<string, HudStats>, game: GameState): Record<string, HudStats> {
  const next: Record<string, HudStats> = { ...prev }
  let preflopRaises = 0
  const nameOf = (seatId: number) => game.seats[seatId].name

  for (const seat of game.seats) {
    if (seat.out && !seat.cards) continue
    next[seat.name] = { ...(prev[seat.name] ?? emptyHud()) }
    next[seat.name].hands++
  }

  const vpip = new Set<string>()
  const pfr = new Set<string>()
  const tb = new Set<string>()
  for (const e of game.history) {
    const who = nameOf(e.seat)
    const st = next[who]
    if (!st) continue
    if (e.street === 'preflop') {
      if (e.type === 'call' || e.type === 'raise') vpip.add(who)
      if (e.type === 'raise') {
        pfr.add(who)
        if (preflopRaises === 1) tb.add(who)
        preflopRaises++
      }
    } else {
      if (e.type === 'raise') st.aggr++
      else if (e.type === 'call') st.calls++
    }
  }
  vpip.forEach((n) => next[n] && next[n].vpip++)
  pfr.forEach((n) => next[n] && next[n].pfr++)
  tb.forEach((n) => next[n] && next[n].threeBet++)

  const flopSeen = game.board.length >= 3
  for (const seat of game.seats) {
    const st = next[seat.name]
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
