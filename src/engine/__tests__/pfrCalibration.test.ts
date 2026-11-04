import { describe, it, expect } from 'vitest'
import { createGame, legalActions, startHand, applyAction } from '../game/reducer'
import { decideBot, preflopReference } from '../bots/policy'
import { pickProfiles } from '../bots/profiles'
import { emptyHud, updateHud, pctOf, type HudStats } from '../bots/hud'
import { mulberry32 } from '../cards'
import type { GameState, Action } from '../game/types'

/** Joga como a tabela manda no pre-flop e so passa/larga depois: isola o PFR e o VPIP "de livro". */
function chartAction(g: GameState): Action {
  const la = legalActions(g)
  if (g.street !== 'preflop') return la.canCheck ? { type: 'check' } : { type: 'fold' }
  const ref = preflopReference(g)
  if (ref.best === 'raise' && la.canRaise) {
    const bb = g.cfg.bb
    const to = g.currentBet > bb ? g.currentBet * 3 : bb * 2.5
    return { type: 'raise', to: Math.max(la.minTo, Math.min(la.maxTo, Math.round(to))) }
  }
  if (ref.best === 'call' && la.canCall) return { type: 'call' }
  if (la.canCheck) return { type: 'check' }
  return { type: 'fold' }
}

/** PFR e VPIP (em %) do jogador que segue a tabela, contra bots comuns, rodando por todas as posicoes. */
export function chartHeroStats(seats: number, hands: number, seed: number): { pfr: number; vpip: number } {
  const rng = mulberry32(seed)
  const profiles = pickProfiles(seats - 1, rng)
  let hud: Record<string, HudStats> = {}
  for (let h = 0; h < hands; h++) {
    const players = [
      { name: 'Hero', isHero: true, profile: 'tag', stack: 200 },
      ...profiles.map((p, i) => ({ name: `B${i}`, profile: p, stack: 200 })),
    ]
    // o botao gira: o heroi passa por todas as posicoes de forma uniforme
    let g = startHand(createGame(players, { sb: 1, bb: 2, ante: 0 }, h % seats), rng)
    let guard = 0
    // so o pre-flop importa para PFR e VPIP: a mao termina para a medicao quando o pre-flop acaba
    while (!g.over && g.street === 'preflop') {
      const seat = g.seats[g.toAct]
      g = applyAction(g, seat.isHero ? chartAction(g) : decideBot(g, rng, 0, 30))
      if (++guard > 300) throw new Error('mao nao termina')
    }
    hud = updateHud(hud, g)
  }
  const s = hud.Hero ?? emptyHud()
  return { pfr: pctOf(s.pfr, s.hands), vpip: pctOf(s.vpip, s.hands) }
}

/** Media de varias sementes: a medicao de uma so tem ruido de cerca de 1 ponto. */
function avgStats(seats: number) {
  const runs = [21, 22, 23, 24].map((seed) => chartHeroStats(seats, 3000, seed))
  const mean = (k: 'pfr' | 'vpip') => runs.reduce((a, r) => a + r[k], 0) / runs.length
  return { pfr: mean('pfr'), vpip: mean('vpip') }
}

describe('calibracao do PFR de quem segue a tabela', () => {
  it('mesa de 6: PFR entre 20% e 25% (e VPIP de um jogador solto-agressivo)', () => {
    const r = avgStats(6)
    expect(r.pfr).toBeGreaterThanOrEqual(20)
    expect(r.pfr).toBeLessThanOrEqual(25)
    expect(r.vpip).toBeGreaterThan(r.pfr) // paga alguma coisa alem de aumentar
    expect(r.vpip).toBeLessThanOrEqual(32)
  }, 240_000)

  it('mesa de 9: PFR no maximo razoavel que a mesa permite (16% a 25%)', () => {
    // Com 8 adversarios seguindo as mesmas tabelas, quase sempre alguem abre antes: mesmo abrindo
    // 62% do botao o PFR de livro nao passa de uns 17%. 20% na mesa de 9 exigiria ranges absurdos.
    const r = avgStats(9)
    expect(r.pfr).toBeGreaterThanOrEqual(16)
    expect(r.pfr).toBeLessThanOrEqual(25)
  }, 240_000)
})
