import { describe, it, expect } from 'vitest'
import { adapt, pickType, summarize, STREAK_TO_LEVEL_UP, type Answer } from '../odds/round'
import { mulberry32 } from '../cards'

describe('adapt: o nivel acompanha o desempenho', () => {
  it('sobe depois de acertos seguidos e zera a sequencia', () => {
    let s = { level: 1 as 1 | 2 | 3, streak: 0 }
    for (let i = 0; i < STREAK_TO_LEVEL_UP - 1; i++) s = adapt(s.level, s.streak, true)
    expect(s).toEqual({ level: 1, streak: STREAK_TO_LEVEL_UP - 1 })
    s = adapt(s.level, s.streak, true)
    expect(s).toEqual({ level: 2, streak: 0 })
  })

  it('desce com um erro e nunca sai de 1 a 3', () => {
    expect(adapt(2, 2, false)).toEqual({ level: 1, streak: 0 })
    expect(adapt(1, 0, false)).toEqual({ level: 1, streak: 0 })
    let s = { level: 3 as 1 | 2 | 3, streak: 0 }
    for (let i = 0; i < 10; i++) s = adapt(s.level, s.streak, true)
    expect(s.level).toBe(3)
  })
})

describe('summarize', () => {
  const a = (type: Answer['type'], correct: boolean, ms: number): Answer => ({ type, correct, ms })

  it('conta acertos, precisao, tempo medio e o detalhe por tipo', () => {
    const r = summarize([a('outs', true, 2000), a('outs', false, 4000), a('potodds', true, 3000)])
    expect(r.total).toBe(3)
    expect(r.right).toBe(2)
    expect(r.accuracy).toBeCloseTo(2 / 3, 5)
    expect(r.avgMs).toBe(3000)
    expect(r.byType.outs).toEqual({ n: 2, right: 1 })
    expect(r.byType.potodds).toEqual({ n: 1, right: 1 })
    expect(r.byType.rule).toEqual({ n: 0, right: 0 })
  })

  it('sem respostas nao divide por zero', () => {
    const r = summarize([])
    expect(r).toMatchObject({ total: 0, right: 0, accuracy: 0, avgMs: 0 })
  })
})

describe('pickType', () => {
  it('em modo unico devolve sempre o tipo escolhido', () => {
    for (let s = 1; s < 20; s++) expect(pickType('potodds', mulberry32(s))).toBe('potodds')
  })

  it('no misto nao repete o tipo anterior e usa todos', () => {
    const rng = mulberry32(3)
    let last: ReturnType<typeof pickType> | undefined
    const seen = new Set<string>()
    for (let i = 0; i < 80; i++) {
      const t = pickType('mixed', rng, last)
      expect(t).not.toBe(last)
      seen.add(t)
      last = t
    }
    expect(seen.size).toBe(4)
  })
})
