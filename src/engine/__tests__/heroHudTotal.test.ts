import { describe, it, expect } from 'vitest'
import { applyAction, createGame, legalActions, startHand } from '../game/reducer'
import { updateHeroHud } from '../bots/hud'
import { mergePlay } from '../syncMerge'
import { mulberry32 } from '../cards'
import type { GameState } from '../game/types'

const names = ['Hero', 'B1', 'B2', 'B3', 'B4', 'B5']
function playHand(seed: number): GameState {
  let g = startHand(createGame(names.map((n, i) => ({ name: n, isHero: i === 0, profile: 'tag', stack: 200 })), { sb: 1, bb: 2, ante: 0 }, seed % 6), mulberry32(seed))
  let guard = 0
  while (!g.over && g.street === 'preflop' && ++guard < 60) {
    const la = legalActions(g)
    g = applyAction(g, g.seats[g.toAct].isHero && la.canRaise ? { type: 'raise', to: la.minTo } : la.canCheck ? { type: 'check' } : { type: 'fold' })
  }
  return g
}

describe('HUD acumulado do heroi', () => {
  it('comeca do nada e soma maos entre chamadas, so do heroi', () => {
    let total = updateHeroHud(undefined, playHand(1))
    expect(total).toBeDefined()
    expect(total!.hands).toBe(1)
    total = updateHeroHud(total, playHand(2))
    total = updateHeroHud(total, playHand(3))
    expect(total!.hands).toBe(3)
    expect(total!.pfr).toBeLessThanOrEqual(3)
  })

  it('as aberturas por posicao tambem acumulam', () => {
    let total = updateHeroHud(undefined, playHand(1))
    for (let i = 2; i <= 12; i++) total = updateHeroHud(total, playHand(i))
    const cells = Object.values(total!.open ?? {})
    expect(cells.reduce((a, c) => a + c.opps, 0)).toBeGreaterThan(5)
  })

  it('sem heroi na mesa nao muda nada', () => {
    const g = playHand(1)
    const noHero = { ...g, seats: g.seats.map((s) => ({ ...s, isHero: false })) }
    expect(updateHeroHud(undefined, noHero)).toBeUndefined()
  })
})

describe('mergePlay com o HUD do heroi', () => {
  const hud = (hands: number) => ({ hands, vpip: 0, pfr: 0, threeBet: 0, sawFlop: 0, showdowns: 0, aggr: 0, calls: 0, facedBet: 0, foldToBet: 0 })

  it('fica a copia com mais maos (somar duplicaria as mesmas maos vistas nos dois aparelhos)', () => {
    expect(mergePlay({ sessions: [], heroHud: hud(40) }, { sessions: [], heroHud: hud(90) }).heroHud.hands).toBe(90)
    expect(mergePlay({ sessions: [], heroHud: hud(120) }, { sessions: [], heroHud: hud(90) }).heroHud.hands).toBe(120)
  })

  it('so um lado tem: usa esse; nenhum: nao inventa o campo', () => {
    expect(mergePlay({ sessions: [] }, { sessions: [], heroHud: hud(5) }).heroHud.hands).toBe(5)
    expect('heroHud' in mergePlay({ sessions: [] }, { sessions: [] })).toBe(false)
  })
})

describe('migracao do store da mesa (v1 para v2)', () => {
  it('guarda sessoes e XP e so acrescenta o HUD vazio', async () => {
    ;(globalThis as any).localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    const { usePlayStore } = await import('@/store')
    const opts = usePlayStore.persist.getOptions()
    expect(opts.version).toBe(2)
    const old = { sessions: [{ id: 's1', endedAt: 5 }], xpDay: '2026-11-01', xpToday: 30 }
    const migrated = (await opts.migrate!(old, 1)) as any
    expect(migrated).toMatchObject({ ...old, heroHud: null })
  })
})
