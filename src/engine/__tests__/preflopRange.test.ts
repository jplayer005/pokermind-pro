import { describe, it, expect } from 'vitest'
import { createGame, startHand, applyAction, positionsBySeat } from '../game/reducer'
import { preflopRangeFor } from '../coach/preflopRange'
import { canonical169, mulberry32 } from '../cards'
import type { GameState, PlayerInit } from '../game/types'

const cfg = { sb: 1, bb: 2, ante: 0 }
const mk = (n: number, stackBB: number, profile = 'tag'): PlayerInit[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, profile, stack: stackBB * 2 }))

const fold = { type: 'fold' } as const
const call = { type: 'call' } as const
const raise = (to: number) => ({ type: 'raise', to }) as const

/** Mesa de 6 no preflop, botao no assento 0: UTG=3, HJ=4, CO=5, BTN=0, SB=1, BB=2. */
function table6(stackBB = 100, profile = 'tag'): GameState {
  return startHand(createGame(mk(6, stackBB, profile), cfg, 0), mulberry32(7))
}

const hands = (r: { combos: readonly (readonly [number, number])[] }) =>
  new Set(r.combos.map((c) => canonical169(c[0], c[1])))
const none = new Set<number>()

/** Abertura do assento `seatId` para `to` fichas; quem age antes dele foldou. */
function openedBy(g: GameState, seatId: number, to = 5): GameState {
  while (g.toAct !== seatId) g = applyAction(g, fold)
  return applyAction(g, raise(to))
}

describe('preflopRangeFor: abertura depende da posicao', () => {
  it('UTG aberto e mais estreito que BTN aberto, e usa a tabela de cada posicao', () => {
    const utg = openedBy(table6(), 3)
    const btn = openedBy(table6(), 0)
    expect(positionsBySeat(utg)[3]).toBe('UTG')
    expect(positionsBySeat(btn)[0]).toBe('BTN')
    const rU = preflopRangeFor(utg, 3, none)
    const rB = preflopRangeFor(btn, 0, none)
    expect(rU.combos.length).toBeGreaterThan(0)
    expect(rB.combos.length).toBeGreaterThan(rU.combos.length * 1.5)
    expect(hands(rU).has('AA')).toBe(true)
    expect(hands(rU).has('72o')).toBe(false)
    expect(hands(rB).has('76s')).toBe(true)
    expect(hands(rU).has('76s')).toBe(false)
    expect(rU.step).toMatch(/UTG/)
    expect(rB.step).toMatch(/BTN/)
  })

  it('cartas mortas saem do range', () => {
    const g = openedBy(table6(), 0)
    const dead = new Set<number>([48, 49]) // dois ases
    const r = preflopRangeFor(g, 0, dead)
    expect(r.combos.every((c) => !dead.has(c[0]) && !dead.has(c[1]))).toBe(true)
  })
})

describe('preflopRangeFor: 3-bet e 4-bet apertam o range', () => {
  it('quem deu 3-bet tem menos combos que quem abriu da mesma posicao', () => {
    let g = openedBy(table6(), 3) // UTG abre
    g = applyAction(g, fold) // HJ
    g = applyAction(g, fold) // CO
    g = applyAction(g, raise(16)) // BTN 3-bet
    const three = preflopRangeFor(g, 0, none)
    const open = preflopRangeFor(openedBy(table6(), 0), 0, none)
    expect(three.combos.length).toBeLessThan(open.combos.length / 2)
    expect(three.step).toMatch(/3-bet/)
  })
})

describe('preflopRangeFor: quem pagou o aumento', () => {
  it('BB que defendeu contra BTN tem range largo, com offsuit fracos', () => {
    let g = openedBy(table6(), 0, 5) // BTN abre
    g = applyAction(g, fold) // SB
    g = applyAction(g, call) // BB paga
    const r = preflopRangeFor(g, 2, none)
    expect(hands(r).has('76o')).toBe(true)
    expect(r.step).toMatch(/BB/)
  })

  it('caller normal nao tem AA (teria dado 3-bet), mas a calling station sim', () => {
    const mkSpot = (profile: string) => {
      const base = startHand(createGame(
        mk(6, 100).map((p, i) => (i === 5 ? { ...p, profile } : p)), cfg, 0,
      ), mulberry32(7))
      let g = openedBy(base, 3) // UTG abre
      g = applyAction(g, fold) // HJ
      g = applyAction(g, call) // CO paga (assento 5)
      return g
    }
    expect(hands(preflopRangeFor(mkSpot('tag'), 5, none)).has('AA')).toBe(false)
    expect(hands(preflopRangeFor(mkSpot('station'), 5, none)).has('AA')).toBe(true)
  })
})

describe('preflopRangeFor: stack curto', () => {
  it('shove de 8bb usa a tabela de push da posicao: BTN empurra bem mais largo que UTG', () => {
    const shoveFrom = (seatId: number) => {
      let g = table6(8)
      while (g.toAct !== seatId) g = applyAction(g, fold)
      return applyAction(g, raise(16)) // all-in de 8bb
    }
    const utg = preflopRangeFor(shoveFrom(3), 3, none)
    const btn = preflopRangeFor(shoveFrom(0), 0, none)
    expect(btn.combos.length).toBeGreaterThan(utg.combos.length * 1.5)
    expect(btn.step).toMatch(/all-in/)
    expect(btn.step).toMatch(/8bb/)
    expect(hands(btn).has('A5s')).toBe(true)
  })
})

describe('preflopRangeFor: sem aumento', () => {
  it('BB que so checou tem range largo', () => {
    let g = table6()
    while (g.toAct !== 1) g = applyAction(g, call) // todos limpam ate o SB
    g = applyAction(g, call) // SB completa
    const r = preflopRangeFor(g, 2, none)
    expect(r.combos.length).toBeGreaterThan(500)
  })
})
