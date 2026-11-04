// ============================================================
// ENGINE: HUD dos bots (VPIP, PFR, 3-bet, AF, WTSD) acumulado por jogador (nome)
// ============================================================
import type { GameState } from '../game/types'
import { positionsBySeat } from '../game/reducer'
import { formatFor } from './policy'

export interface HudStats {
  hands: number
  vpip: number
  pfr: number
  threeBet: number
  sawFlop: number
  showdowns: number
  aggr: number // apostas e aumentos pos-flop
  calls: number // calls pos-flop
  /** Vezes que enfrentou uma aposta pos-flop e quantas dessas largou (fold para aposta). */
  facedBet: number
  foldToBet: number
  /**
   * Aberturas por posicao, chave `formato|posicao` (ex.: "6max|BTN"): quantas vezes a vez de abrir o pote
   * chegou (ninguem tinha aumentado) e quantas vezes o jogador aumentou. O BB nao conta (nao abre).
   */
  open?: Record<string, { opps: number; opens: number }>
}

export const emptyHud = (): HudStats => ({
  hands: 0, vpip: 0, pfr: 0, threeBet: 0, sawFlop: 0, showdowns: 0, aggr: 0, calls: 0, facedBet: 0, foldToBet: 0,
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
      // enfrentou uma aposta (havia algo a pagar): pagou, aumentou ou largou
      if (e.toCall > 0 && (e.type === 'call' || e.type === 'raise' || e.type === 'fold')) {
        st.facedBet++
        if (e.type === 'fold') st.foldToBet++
      }
    }
  }
  // oportunidades de abrir o pote por posicao: a primeira acao pre-flop do jogador, com o pote sem aumento
  const nPlayers = game.seats.filter((x) => !x.out).length
  if (nPlayers > 2) {
    const fmt = formatFor(nPlayers)
    const posOf = positionsBySeat(game)
    const acted = new Set<number>()
    let raisesSoFar = 0
    for (const e of game.history) {
      if (e.street !== 'preflop' || (e.type !== 'fold' && e.type !== 'check' && e.type !== 'call' && e.type !== 'raise')) continue
      const first = !acted.has(e.seat)
      acted.add(e.seat)
      const pos = posOf[e.seat]
      const st = next[nameOf(e.seat)]
      if (first && raisesSoFar === 0 && st && pos && pos !== 'BB') {
        const key = `${fmt}|${pos}`
        const cell = st.open?.[key] ?? { opps: 0, opens: 0 }
        st.open = { ...st.open, [key]: { opps: cell.opps + 1, opens: cell.opens + (e.type === 'raise' ? 1 : 0) } }
      }
      if (e.type === 'raise') raisesSoFar++
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

/**
 * Acumula uma mao terminada no HUD do HEROI (o acumulado entre sessoes). Devolve undefined quando
 * a mesa nao tem heroi. So o heroi entra: os bots mudam de nome a cada campo e a lista nao pararia de crescer.
 */
export function updateHeroHud(prev: HudStats | undefined | null, game: GameState): HudStats | undefined {
  const hero = game.seats.find((s) => s.isHero)
  if (!hero) return undefined
  return updateHud(prev ? { [hero.name]: prev } : {}, game)[hero.name]
}

export const pctOf = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

/** Linha curta para a mesa, ex.: "V34 P21". Vazio ate haver amostra minima. */
export function hudLine(s: HudStats | undefined, minHands = 8): string {
  if (!s || s.hands < minHands) return ''
  const af = s.calls > 0 ? (s.aggr / s.calls).toFixed(1) : s.aggr > 0 ? '∞' : '0'
  return `V${pctOf(s.vpip, s.hands)} P${pctOf(s.pfr, s.hands)} AF${af}`
}

/** Faixa (%) da MEDIA das aberturas de todas as posicoes nos ranges do app (ver data/openRanking). */
export const PFR_TARGET = { min: 20, max: 25 } as const

export interface StatRow {
  name: string
  isHero: boolean
  hands: number
  /** Em % das maos. */
  vpip: number
  pfr: number
  threeBet: number
  /** Fator de agressao pos-flop (apostas e aumentos / calls). */
  af: string
  /** % das apostas pos-flop que largou; null com menos de 5 apostas enfrentadas. */
  foldToBet: number | null
}

/** Linhas da tela de estatisticas: o heroi primeiro, os demais por maos jogadas e depois por nome. */
export function statRows(hud: Record<string, HudStats>, heroName: string | null): StatRow[] {
  const rows = Object.entries(hud)
    .filter(([, s]) => s.hands > 0)
    .map(([name, s]): StatRow => ({
      name,
      isHero: name === heroName,
      hands: s.hands,
      vpip: pctOf(s.vpip, s.hands),
      pfr: pctOf(s.pfr, s.hands),
      threeBet: pctOf(s.threeBet, s.hands),
      af: s.calls > 0 ? (s.aggr / s.calls).toFixed(1) : s.aggr > 0 ? '∞' : '0',
      foldToBet: s.facedBet >= 5 ? pctOf(s.foldToBet, s.facedBet) : null,
    }))
  return rows.sort((a, b) => Number(b.isHero) - Number(a.isHero) || b.hands - a.hands || a.name.localeCompare(b.name))
}
