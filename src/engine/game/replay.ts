// ============================================================
// ENGINE: converte uma mao terminada da mesa para o formato do Replayer (SavedHand)
// ============================================================
import { fromInt } from '../cards'
import { positionsBySeat, potTotal } from './reducer'
import type { GameState } from './types'
import type { GradedDecision } from '../coach/types'
import { isLeak } from '../coach/types'
import type { Action, Position, ReplayerAction, SavedHand } from '@/types'

const round2 = (n: number) => Math.round(n * 100) / 100

export function toSavedHand(
  game: GameState, decisions: GradedDecision[], modeId: string, modeLabel: string, id?: string,
): SavedHand {
  const bb = game.cfg.bb
  const pos = positionsBySeat(game)
  const hero = game.seats.find((s) => s.isHero)
  const revealed = game.result?.showdown === true

  const players = game.seats
    .filter((s) => s.cards)
    .map((s) => ({
      name: s.name,
      position: (pos[s.id] ?? 'BTN') as Position,
      stack: round2(s.startStack / bb),
      isHero: s.isHero,
      cards: s.cards && (s.isHero || (revealed && !s.folded)) ? s.cards.map(fromInt) : undefined,
    }))

  let preflopRaises = 0
  const actions: ReplayerAction[] = []
  for (const e of game.history) {
    if (e.type === 'ante' || e.type === 'sb' || e.type === 'bb') continue
    let action: Action
    if (e.type === 'raise') {
      if (e.allIn) action = 'shove'
      else if (e.street === 'preflop') action = preflopRaises === 0 ? 'raise' : preflopRaises === 1 ? '3bet' : '4bet'
      else action = 'raise'
      if (e.street === 'preflop') preflopRaises++
    } else {
      action = e.type
    }
    actions.push({
      player: game.seats[e.seat].name,
      action,
      amount: e.type === 'fold' || e.type === 'check' ? undefined : round2(e.amount / bb),
      street: e.street,
      timestamp: actions.length,
    })
  }

  const heroNet = hero && game.result ? game.result.net[hero.id] : 0
  const leaks = decisions.filter((d) => isLeak(d.grade))
  const notes = leaks.length
    ? leaks.map((d) => `${d.street}: ${d.took} (referência ${d.best})${d.tag ? ` [${d.tag}]` : ''}`).join('\n')
    : 'Sem erros marcados pelo coach.'

  return {
    id: id ?? `played_${Date.now()}_${game.handNumber}`,
    title: `${modeLabel}, mão ${game.handNumber}`,
    date: Date.now(),
    heroCards: hero?.cards ? hero.cards.map(fromInt) : [],
    board: game.board.map(fromInt),
    players,
    actions,
    pot: round2(potTotal(game) / bb),
    result: round2(heroNet / bb),
    notes,
    tags: ['jogada', modeId, leaks.length ? 'erro' : 'ok'],
    mode: modeId,
    decisions: decisions.map((d) => ({
      street: d.street,
      took: d.took,
      best: d.best,
      grade: d.grade,
      evLossBB: d.evLossBB,
      approx: d.approx,
      tag: d.tag,
      explain: d.explain,
      equity: d.equity !== undefined ? Math.round(d.equity * 100) / 100 : undefined,
    })),
  }
}
