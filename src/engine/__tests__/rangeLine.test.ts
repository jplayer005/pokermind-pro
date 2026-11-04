import { describe, it, expect } from 'vitest'
import { SCENARIOS, buildScenarioHand } from '../lab/scenarios'
import { gradeDecision } from '../coach/grade'
import { rangeLine } from '../coach/rangeLine'
import { mulberry32 } from '../cards'
import type { GradedDecision } from '../coach/types'

const dec = (o: Partial<GradedDecision>): GradedDecision => ({
  handNumber: 1, street: 'flop', took: 'call', best: 'call', grade: 'best', evLossBB: 0, approx: true, potBefore: 10, toCall: 0,
  ctx: 'X', tag: '', explain: [], hole: [0, 1], board: [], ...o,
})

describe('decisao pos-flop grava a largura do range do vilao', () => {
  it('em todo cenario do laboratorio, rangePct fica entre 1 e 100 e a equity entre 0 e 1', () => {
    for (const sc of SCENARIOS) {
      const g = buildScenarioHand(sc, mulberry32(7), 1)
      const d = gradeDecision(g, { type: 'fold' }, mulberry32(1), { icmPayouts: sc.payouts })
      expect(d.rangePct).toBeGreaterThanOrEqual(1)
      expect(d.rangePct).toBeLessThanOrEqual(100)
      expect(d.equity).toBeGreaterThanOrEqual(0)
      expect(d.equity).toBeLessThanOrEqual(1)
    }
  })

  it('no check-raise all-in da bolha o range do vilao e estreito (menos de 40% das maos)', () => {
    const sc = SCENARIOS.find((s) => s.id === 'bolha-top-par')!
    const g = buildScenarioHand(sc, mulberry32(3), 1)
    const d = gradeDecision(g, { type: 'fold' }, mulberry32(1), { icmPayouts: sc.payouts })
    expect(d.rangePct).toBeLessThan(40)
  })

  it('decisao pre-flop nao tem rangePct', () => {
    expect(dec({ street: 'preflop' }).rangePct).toBeUndefined()
  })
})

describe('rangeLine: a linha por rua da revisao', () => {
  it('so entram decisoes com range e equity; a rua em que a equity mais cai (15 pontos ou mais) e marcada', () => {
    const rows = rangeLine([
      dec({ street: 'preflop' }),
      dec({ street: 'flop', rangePct: 30, equity: 0.7, potBefore: 8 }),
      dec({ street: 'turn', rangePct: 9, equity: 0.35, potBefore: 20 }),
      dec({ street: 'river', rangePct: 8, equity: 0.3, potBefore: 40 }),
    ])
    expect(rows.map((r) => r.street)).toEqual(['flop', 'turn', 'river'])
    expect(rows.map((r) => r.drop)).toEqual([false, true, false]) // -35 no turn; -5 no river
    expect(rows[0]).toMatchObject({ rangePct: 30, equityPct: 70, pot: 8 })
  })

  it('sem queda grande nada e marcado, e sem dados a lista e vazia', () => {
    expect(rangeLine([dec({ street: 'flop', rangePct: 30, equity: 0.6 }), dec({ street: 'turn', rangePct: 25, equity: 0.55 })]).some((r) => r.drop)).toBe(false)
    expect(rangeLine([dec({})])).toEqual([])
  })
})
