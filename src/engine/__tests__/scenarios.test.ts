import { describe, it, expect } from 'vitest'
import { SCENARIOS, buildScenarioHand, scenarioById } from '../lab/scenarios'
import { buildVillainRange } from '../coach/range'
import { isQuizSpot } from '../coach/readQuiz'
import { categoryOf, evaluate, HAND_CATEGORY } from '../evaluator'
import { mulberry32, rankOf } from '../cards'

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)
const key = (c: readonly [number, number]) => [...c].sort((a, b) => a - b).join('-')

describe('cenarios: toda mao montada e valida e termina na decisao do heroi', () => {
  for (const sc of SCENARIOS) {
    it(`${sc.id}: heroi na vez, cartas unicas e fichas conservadas`, () => {
      for (const seed of SEEDS) {
        const g = buildScenarioHand(sc, mulberry32(seed), seed)
        expect(g.over).toBe(false)
        expect(g.seats[g.toAct].isHero).toBe(true)
        expect(g.street).toBe(sc.decisionStreet)
        expect(g.handNumber).toBe(seed)
        const cards = [...g.seats.flatMap((s) => s.cards ?? []), ...g.board]
        expect(new Set(cards).size).toBe(cards.length)
        expect(g.deck.some((c) => cards.includes(c))).toBe(false)
        expect(g.seats.every((s) => s.stack + s.total === s.startStack)).toBe(true)
        expect(g.seats[0].startStack).toBe(sc.stacks.hero * g.cfg.bb)
        expect(g.seats[1].startStack).toBe(sc.stacks.villain * g.cfg.bb)
      }
    })

    it(`${sc.id}: o heroi enfrenta aposta grande (a pausa do modo quiz abriria)`, () => {
      for (const seed of SEEDS) {
        expect(isQuizSpot(buildScenarioHand(sc, mulberry32(seed), 1), 'all')).toBe(true)
      }
    })

    it(`${sc.id}: a mao do vilao sai do range coerente com as acoes dele`, () => {
      for (const seed of SEEDS) {
        const g = buildScenarioHand(sc, mulberry32(seed), 1)
        const range = buildVillainRange(g)!
        const hand = g.seats[1].cards!
        expect(new Set(range.combos.map(key)).has(key(hand))).toBe(true)
      }
    })

    it(`${sc.id}: as maos variam entre as repeticoes`, () => {
      const heroes = new Set(SEEDS.map((s) => key(buildScenarioHand(sc, mulberry32(s), 1).seats[0].cards!)))
      expect(heroes.size).toBeGreaterThan(5)
    })
  }
})

describe('cenarios: o tema de cada um se mantem', () => {
  it('bolha-top-par: o heroi tem sempre o par do topo, num board seco e sem flush draw', () => {
    const sc = scenarioById('bolha-top-par')!
    for (const seed of SEEDS) {
      const g = buildScenarioHand(sc, mulberry32(seed), 1)
      const hero = g.seats[0].cards!
      const top = Math.max(...g.board.map(rankOf))
      expect(hero.some((c) => rankOf(c) === top)).toBe(true)
      expect(categoryOf(evaluate([...hero, ...g.board]))).toBe(HAND_CATEGORY.PAIR)
      const suits = new Set(g.board.map((c) => c & 3))
      expect(suits.size).toBe(3) // flop arco-iris
    }
  })

  it('overpair-3bet: o heroi tem um par de damas acima do board', () => {
    const sc = scenarioById('overpair-3bet')!
    for (const seed of SEEDS) {
      const g = buildScenarioHand(sc, mulberry32(seed), 1)
      const hero = g.seats[0].cards!
      expect(rankOf(hero[0])).toBe(rankOf(hero[1]))
      expect(rankOf(hero[0])).toBeGreaterThan(Math.max(...g.board.map(rankOf)))
    }
  })

  it('flush-draw-shove: o heroi tem flush draw e o vilao esta all-in', () => {
    const sc = scenarioById('flush-draw-shove')!
    for (const seed of SEEDS) {
      const g = buildScenarioHand(sc, mulberry32(seed), 1)
      expect(g.seats[1].allIn).toBe(true)
      const hero = g.seats[0].cards!
      const suit = g.board.reduce((acc, c) => { acc[c & 3] = (acc[c & 3] ?? 0) + 1; return acc }, {} as Record<number, number>)
      const flushSuit = Number(Object.keys(suit).find((s) => suit[Number(s)] === 2))
      expect(hero.filter((c) => (c & 3) === flushSuit).length).toBe(2)
    }
  })
})

describe('cenarios: catalogo', () => {
  it('ids unicos, textos preenchidos e sem travessao', () => {
    const ids = SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of SCENARIOS) {
      expect(s.title.length).toBeGreaterThan(5)
      expect(s.lesson.length).toBeGreaterThan(20)
      expect(s.context.length).toBeGreaterThan(0)
      const text = [s.title, s.summary, s.lesson, ...s.context].join(' ')
      expect(text).not.toMatch(/[–—]/)
    }
  })

  it('scenarioById devolve undefined para id desconhecido', () => {
    expect(scenarioById('nao-existe')).toBeUndefined()
  })
})
