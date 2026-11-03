import { describe, it, expect } from 'vitest'
import { allSpots, comboCount, pickNextSpot, scorePaint } from '../ranges/painter'
import { generateHandGrid } from '@/lib/poker'
import { mulberry32 } from '../cards'

const GRID = new Set(generateHandGrid().flat())

describe('allSpots: os spots para pintar', () => {
  const spots = allSpots()

  it('ha spots de cada tipo, com ids unicos e textos preenchidos', () => {
    expect(new Set(spots.map((s) => s.id)).size).toBe(spots.length)
    for (const sc of ['open', '3bet', 'bbdef', 'pushfold'] as const) expect(spots.some((s) => s.scenario === sc)).toBe(true)
    for (const s of spots) {
      expect(s.title.length).toBeGreaterThan(4)
      expect(s.subtitle.length).toBeGreaterThan(4)
      expect([s.title, s.subtitle].join(' ')).not.toMatch(/[–—]/)
    }
  })

  it('o gabarito de cada spot so tem maos validas do grid, sem repetidas, e nao e vazio', () => {
    for (const s of spots) {
      expect(s.truth.length).toBeGreaterThan(3)
      expect(new Set(s.truth).size).toBe(s.truth.length)
      for (const h of s.truth) expect(GRID.has(h)).toBe(true)
    }
  })

  it('posicoes mais tardias abrem mais maos: UTG < CO < BTN', () => {
    const total = (id: string) => spots.find((s) => s.id === id)!.truth.reduce((a, h) => a + comboCount(h), 0)
    expect(total('open-UTG')).toBeLessThan(total('open-CO'))
    expect(total('open-CO')).toBeLessThan(total('open-BTN'))
  })
})

describe('comboCount', () => {
  it('par 6, suited 4, offsuit 12; o grid inteiro soma 1326', () => {
    expect(comboCount('AA')).toBe(6)
    expect(comboCount('AKs')).toBe(4)
    expect(comboCount('AKo')).toBe(12)
    expect([...GRID].reduce((a, h) => a + comboCount(h), 0)).toBe(1326)
  })
})

describe('scorePaint: nota pelo peso em combos', () => {
  const truth = ['AA', 'KK', 'AKs', 'AKo']

  it('acertar tudo vale 100% e e a melhor nota', () => {
    const r = scorePaint(['AA', 'KK', 'AKs', 'AKo'], truth)
    expect(r.accuracy).toBe(1)
    expect(r.grade).toBe('best')
    expect(r.passed).toBe(true)
    expect(r.missed).toEqual([])
    expect(r.extra).toEqual([])
    expect(r.tag).toBe('')
  })

  it('nao pintar nada vale 0 e erra todas as maos', () => {
    const r = scorePaint([], truth)
    expect(r.accuracy).toBe(0)
    expect(r.grade).toBe('blunder')
    expect(r.passed).toBe(false)
    expect(r.missed.sort()).toEqual([...truth].sort())
  })

  it('esquecer uma mao de muitos combos pesa mais que uma de poucos', () => {
    const missOffsuit = scorePaint(['AA', 'KK', 'AKs'], truth) // falta AKo (12 combos)
    const missPair = scorePaint(['KK', 'AKs', 'AKo'], truth) // falta AA (6 combos)
    expect(missOffsuit.accuracy).toBeLessThan(missPair.accuracy)
  })

  it('pintar a mais (maos fora do range) tambem custa, e a tag diz que ficou largo', () => {
    const r = scorePaint(['AA', 'KK', 'AKs', 'AKo', '72o', 'T9o'], truth)
    expect(r.accuracy).toBeLessThan(1)
    expect(r.extra.sort()).toEqual(['72o', 'T9o'])
    expect(r.missed).toEqual([])
  })

  it('a tag diferencia apertado demais de largo demais', () => {
    const tight = scorePaint(['AA'], truth)
    expect(tight.tag).toBe('TIGHT')
    const loose = scorePaint([...truth, '72o', '83o', '94o', 'J2o'], truth)
    expect(loose.tag).toBe('LOOSE')
  })

  it('ignora maos pintadas que nao existem no grid e repeticoes', () => {
    const r = scorePaint(['AA', 'AA', 'KK', 'AKs', 'AKo', 'XYZ'], truth)
    expect(r.accuracy).toBe(1)
  })

  it('as faixas de nota sobem com a precisao', () => {
    const big = Array.from(GRID).filter((h) => comboCount(h) > 0)
    const t = big.slice(0, 40)
    const grades = [40, 34, 28, 22, 10].map((n) => scorePaint(t.slice(0, n), t).grade)
    // quanto menos acertos, pior ou igual a nota (nunca melhora)
    const order = ['best', 'good', 'inaccuracy', 'mistake', 'blunder']
    for (let i = 1; i < grades.length; i++) expect(order.indexOf(grades[i])).toBeGreaterThanOrEqual(order.indexOf(grades[i - 1]))
    expect(grades[0]).toBe('best')
  })
})

describe('vazamentos do Pinte o range', () => {
  it('o contexto vira um nome legivel e leva de volta ao spot', async () => {
    const { labelFor, drillTarget } = await import('../coach/leaks')
    expect(labelFor('RANGE_open-UTG')).toMatch(/Abrir do UTG/)
    expect(labelFor('RANGE_push-10-BTN')).toMatch(/Empurrar do BTN/)
    expect(labelFor('RANGE_desconhecido')).toBe('Pintar o range: desconhecido')
    const t = drillTarget('RANGE_open-UTG')
    expect(t.path).toBe('/ranges')
    expect(t.state).toEqual({ spotId: 'open-UTG' })
  })
})

describe('pickNextSpot: a repeticao espacada manda', () => {
  const spots = allSpots()
  const rng = () => mulberry32(5)()

  it('spots vencidos para revisar vem primeiro', () => {
    const due = new Set([spots[3].id, spots[7].id])
    for (let i = 0; i < 20; i++) {
      const s = pickNextSpot(spots, { seen: new Set(spots.map((x) => x.id)), due }, mulberry32(i + 1))
      expect(due.has(s.id)).toBe(true)
    }
  })

  it('sem vencidos, os nunca vistos vem antes dos ja vistos', () => {
    const seen = new Set(spots.slice(0, spots.length - 2).map((s) => s.id))
    for (let i = 0; i < 20; i++) {
      const s = pickNextSpot(spots, { seen, due: new Set() }, mulberry32(i + 1))
      expect(seen.has(s.id)).toBe(false)
    }
  })

  it('nao repete o ultimo spot quando ha outra opcao', () => {
    for (let i = 0; i < 40; i++) {
      const s = pickNextSpot(spots, { seen: new Set(), due: new Set(), last: spots[0].id }, mulberry32(i + 1))
      expect(s.id).not.toBe(spots[0].id)
    }
  })

  it('com tudo visto e nada vencido, sorteia qualquer um', () => {
    const s = pickNextSpot(spots, { seen: new Set(spots.map((x) => x.id)), due: new Set() }, rng)
    expect(spots.some((x) => x.id === s.id)).toBe(true)
  })
})
