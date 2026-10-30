// ============================================================
// ENGINE: equity necessaria para PAGAR uma aposta em ICM (Malmuth-Harville), contra o que as
// fichas sozinhas pedem. Vale para pote heads-up num torneio em que todos os jogadores vivos
// estao na mesa (SNG, mesa final, cenarios de bolha). Em fichas, perder 1 e ganhar 1 pesam o
// mesmo; em ICM perder pesa mais, e a diferenca e o "premio de risco".
// ============================================================
import { calculateICM } from '@/lib/poker'
import { legalActions, potTotal } from '../game/reducer'
import type { GameState } from '../game/types'

export interface IcmCall {
  /** Equity necessaria em fichas (0..1): pagar / (pote + pagar). */
  chipNeeded: number
  /** Equity necessaria em ICM (0..1): zera a diferenca entre pagar e largar em valor de premio. */
  icmNeeded: number
  /** icmNeeded - chipNeeded: quanto o risco de sair do torneio encarece o call. */
  premium: number
  /** Valor ICM do heroi, em % do premio total, se largar, ganhar ou perder o pote. */
  fold: number
  win: number
  lose: number
  /** Quem cobre quem (o stack maior elimina o menor). */
  villainCoversHero: boolean
  heroCoversVillain: boolean
}

/**
 * Info de ICM para o heroi diante de uma aposta, ou null quando nao se aplica: sem premios, vez
 * de outro jogador, nada a pagar, pote com mais de dois jogadores ou conta cara demais.
 */
export function icmCallInfo(state: GameState, payouts: number[] | undefined): IcmCall | null {
  if (!payouts || payouts.length === 0 || state.over || state.toAct < 0) return null
  const hero = state.seats[state.toAct]
  if (!hero?.isHero) return null
  const la = legalActions(state)
  if (!la.canCall || la.callAmount <= 0) return null
  const live = state.seats.filter((s) => !s.out && !s.folded)
  if (live.length !== 2) return null
  const villain = live.find((s) => s.id !== hero.id)
  const players = state.seats.filter((s) => !s.out)
  if (!villain || players.length < 2) return null
  // a recursao do ICM cresce com jogadores x premios: acima disso so em fichas
  if (players.length > 7 && payouts.length > 3) return null

  const pot = potTotal(state)
  const call = la.callAmount
  // aposta maior que o stack do heroi: o excesso volta ao vilao e nao entra na disputa
  const excess = Math.max(0, state.currentBet - hero.bet - call)
  const heroIdx = players.findIndex((s) => s.id === hero.id)
  const value = (heroStack: number, villainStack: number) =>
    calculateICM(
      players.map((s) => (s.id === hero.id ? heroStack : s.id === villain.id ? villainStack : s.stack)),
      payouts,
    )[heroIdx] * 100

  const fold = value(hero.stack, villain.stack + pot)
  const win = value(hero.stack + pot - excess, villain.stack + excess)
  const lose = value(hero.stack - call, villain.stack + pot + call)
  if (!(win > lose)) return null

  const chipNeeded = call / (pot - excess + call)
  const icmNeeded = (fold - lose) / (win - lose)
  const heroTotal = hero.stack + hero.bet
  const villainTotal = villain.stack + villain.bet
  return {
    chipNeeded, icmNeeded, premium: icmNeeded - chipNeeded, fold, win, lose,
    villainCoversHero: villainTotal >= heroTotal,
    heroCoversVillain: heroTotal >= villainTotal,
  }
}
