import { describe, it, expect } from 'vitest'
import { buildPots, awardPots } from '../game/pots'

const seat = (total: number, folded = false) => ({ total, folded })

describe('buildPots', () => {
  it('tres all-ins de stacks diferentes: principal + 2 sides', () => {
    const pots = buildPots([seat(100), seat(300), seat(600)])
    expect(pots).toEqual([
      { amount: 300, eligible: [0, 1, 2] },
      { amount: 400, eligible: [1, 2] },
      { amount: 300, eligible: [2] },
    ])
  })

  it('quem foldou contribui mas nao concorre', () => {
    const pots = buildPots([seat(100), seat(100), seat(60, true)])
    expect(pots).toEqual([{ amount: 260, eligible: [0, 1] }])
  })

  it('camadas com os mesmos elegiveis se fundem', () => {
    const pots = buildPots([seat(50, true), seat(100), seat(100)])
    expect(pots).toEqual([{ amount: 250, eligible: [1, 2] }])
  })

  it('soma dos potes = soma das contribuicoes', () => {
    const seats = [seat(37), seat(120, true), seat(500), seat(500), seat(80)]
    const total = seats.reduce((a, s) => a + s.total, 0)
    expect(buildPots(seats).reduce((a, p) => a + p.amount, 0)).toBe(total)
  })
})

describe('awardPots', () => {
  it('vencedor do principal nao leva o side pot', () => {
    // seat0 tem a melhor mao mas so cobre o principal (3 x 100); o side (2 x 200) e disputado por 1 e 2
    const pots = buildPots([seat(100), seat(300), seat(300)])
    const { payout } = awardPots(pots, [900, 100, 500], 0)
    expect(payout).toEqual([300, 0, 400])
  })

  it('split do principal com side pot ganho por um terceiro', () => {
    const pots = buildPots([seat(100), seat(100), seat(300)])
    const { payout } = awardPots(pots, [500, 500, 100], 0)
    // principal 300 dividido entre 0 e 1; o side pot (200) so tem o seat 2
    expect(payout).toEqual([150, 150, 200])
  })

  it('ficha impar vai ao primeiro vencedor a esquerda do botao', () => {
    const pots = [{ amount: 101, eligible: [0, 1, 2] }]
    // botao no assento 0: a esquerda dele e o 1
    const a = awardPots(pots, [10, 10, 1], 0)
    expect(a.payout).toEqual([50, 51, 0])
    // botao no assento 1: a esquerda e o 2, mas 2 perdeu; entao volta ao 0
    const b = awardPots(pots, [10, 10, 1], 1)
    expect(b.payout).toEqual([51, 50, 0])
  })

  it('unico elegivel leva o pote sem precisar de score', () => {
    const { payout } = awardPots([{ amount: 40, eligible: [2] }], [null, null, null], 0)
    expect(payout).toEqual([0, 0, 40])
  })
})
