import { describe, it, expect } from 'vitest'
import { applyAction, createGame, legalActions, positionsBySeat, startHand } from '../game/reducer'
import { emptyHud, updateHud, type HudStats } from '../bots/hud'
import { MIN_OPEN_OPPS, heroOpenTables } from '../ranges/coverage'
import { mulberry32 } from '../cards'
import type { GameState } from '../game/types'

const names = ['Hero', 'B1', 'B2', 'B3', 'B4', 'B5']
const newHand = (button: number) =>
  startHand(createGame(names.map((n, i) => ({ name: n, isHero: i === 0, profile: 'tag', stack: 200 })), { sb: 1, bb: 2, ante: 0 }, button), mulberry32(5))

/** Todos largam, menos o heroi, que faz a acao dada na primeira vez que age. */
function playOut(g: GameState, heroAct: 'raise' | 'fold' | 'call'): GameState {
  let guard = 0
  while (!g.over && g.street === 'preflop' && ++guard < 50) {
    const la = legalActions(g)
    const seat = g.seats[g.toAct]
    if (seat.isHero && heroAct === 'raise' && la.canRaise) g = applyAction(g, { type: 'raise', to: la.minTo })
    else if (seat.isHero && heroAct === 'call' && la.canCall) g = applyAction(g, { type: 'call' })
    else g = applyAction(g, la.canCheck ? { type: 'check' } : { type: 'fold' })
  }
  return g
}

describe('aberturas por posicao no HUD', () => {
  it('conta a oportunidade e a abertura do heroi na posicao dele', () => {
    const g = playOut(newHand(0), 'raise')
    const pos = positionsBySeat(g)[0]
    const h = updateHud({}, g).Hero
    expect(pos).not.toBe('BB')
    expect(h.open?.[`6max|${pos}`]).toEqual({ opps: 1, opens: 1 })
  })

  it('largar ou so pagar e uma oportunidade sem abertura', () => {
    for (const act of ['fold', 'call'] as const) {
      const g = playOut(newHand(0), act)
      const pos = positionsBySeat(g)[0]
      expect(updateHud({}, g).Hero.open?.[`6max|${pos}`]).toEqual({ opps: 1, opens: 0 })
    }
  })

  it('com aumento antes de voce nao e oportunidade de abrir', () => {
    // o botao gira ate o heroi ficar depois do primeiro a agir: o UTG (bot) aumenta e o heroi so reage
    for (let b = 0; b < 6; b++) {
      let g = newHand(b)
      const first = g.seats[g.toAct]
      if (first.isHero) continue
      g = applyAction(g, { type: 'raise', to: legalActions(g).minTo })
      g = playOut(g, 'fold')
      const pos = positionsBySeat(g)[0]
      if (pos === 'BB' || pos === 'SB') continue
      expect(updateHud({}, g).Hero.open?.[`6max|${pos}`]).toBeUndefined()
      return
    }
    throw new Error('sem caso de teste')
  })

  it('o BB nunca entra na tabela', () => {
    let seen = false
    for (let b = 0; b < 6; b++) {
      const g = playOut(newHand(b), 'raise')
      if (positionsBySeat(g)[0] === 'BB') {
        seen = true
        expect(updateHud({}, g).Hero.open).toBeUndefined()
      }
    }
    expect(seen).toBe(true)
  })
})

describe('heroOpenTables', () => {
  it('sem dados nao ha tabela', () => {
    expect(heroOpenTables(undefined)).toEqual([])
  })

  it('com poucas oportunidades mostra a linha mas sem diferenca nem media', () => {
    const [t] = heroOpenTables({ '6max|BTN': { opps: 3, opens: 3 } })
    const btn = t.rows.find((r) => r.position === 'BTN')!
    expect(btn).toMatchObject({ opps: 3, opened: 100, diff: null })
    expect(t.mean).toBeNull()
  })

  it('com amostra em todas as posicoes calcula a media com o BB em zero e a diferenca para o alvo', () => {
    const open: NonNullable<HudStats['open']> = {}
    for (const p of ['UTG', 'HJ', 'CO', 'BTN', 'SB']) open[`6max|${p}`] = { opps: MIN_OPEN_OPPS * 10, opens: MIN_OPEN_OPPS * 5 } // 50% em todas
    const [t] = heroOpenTables(open)
    expect(t.format).toBe('6max')
    expect(t.mean).toBeCloseTo((5 * 50) / 6, 5)
    const utg = t.rows.find((r) => r.position === 'UTG')!
    expect(utg.diff).toBe(50 - utg.target)
    expect(t.targetMean).toBeGreaterThan(20)
    expect(t.targetMean).toBeLessThan(25)
  })

  it('uma tabela por formato jogado', () => {
    const tables = heroOpenTables({ '6max|CO': { opps: 1, opens: 0 }, '9max|LJ': { opps: 1, opens: 1 } })
    expect(tables.map((t) => t.format)).toEqual(['6max', '9max'])
  })
})
