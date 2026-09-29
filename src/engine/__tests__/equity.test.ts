import { describe, it, expect } from 'vitest'
import { equityVsCombos } from '../equity'
import { parseCards, mulberry32 } from '../cards'

const combo = (s: string) => parseCards(s) as [number, number]

describe('equity', () => {
  it('AA vs KK pre-flop ~82,6%', () => {
    const r = equityVsCombos(combo('As Ah'), [combo('Ks Kh')], [], 200_000, mulberry32(1))
    expect(r.equity).toBeGreaterThan(0.821)
    expect(r.equity).toBeLessThan(0.831)
  }, 60_000)

  it('AKs vs QQ ~46%', () => {
    const r = equityVsCombos(combo('As Ks'), [combo('Qc Qd')], [], 200_000, mulberry32(2))
    expect(r.equity).toBeGreaterThan(0.45)
    expect(r.equity).toBeLessThan(0.47)
  }, 60_000)

  it('river e exato: nuts vs air', () => {
    const board = parseCards('2c 7d 9h Js 3c')
    const r = equityVsCombos(combo('Jc Jd'), [combo('4c 5d')], board)
    expect(r.exact).toBe(true)
    expect(r.equity).toBe(1)
  })

  it('kicker no river: AK vence AQ (o bug antigo dava empate)', () => {
    const board = parseCards('2c 7d 9h Js 3c')
    const r = equityVsCombos(combo('As Kd'), [combo('Ah Qd')], board)
    expect(r.equity).toBe(1)
  })

  it('turn e exato e soma 44 rodadas por combo', () => {
    const board = parseCards('2c 7d 9h Js')
    const r = equityVsCombos(combo('As Kd'), [combo('Th Td')], board)
    expect(r.exact).toBe(true)
    expect(r.runs).toBe(44)
  })

  it('combos que colidem com hero ou board sao ignorados', () => {
    const r = equityVsCombos(combo('As Ah'), [combo('As Kh')], [], 100)
    expect(r.runs).toBe(0)
    expect(r.equity).toBe(0.5)
  })
})
