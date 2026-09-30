import { describe, it, expect, beforeAll } from 'vitest'
import { loadSpots, type SpotBank } from '../spots'
import { loadEquity169, type EquityTable } from '../equity169'
import { evHuPush, evHuCall, evLoss, versusRange } from '../coach/ev'

let bank: SpotBank
let table: EquityTable
beforeAll(async () => {
  bank = await loadSpots()
  table = await loadEquity169()
})

describe('tabela de equity 169x169', () => {
  it('ancoras conhecidas', () => {
    expect(table.eq('AA', 'KK')).toBeGreaterThan(0.81)
    expect(table.eq('AA', 'KK')).toBeLessThan(0.84)
    expect(table.eq('AKs', 'QQ')).toBeGreaterThan(0.44)
    expect(table.eq('AKs', 'QQ')).toBeLessThan(0.48)
    expect(table.eq('AA', '72o')).toBeGreaterThan(0.85)
  })

  it('simetrica: e(a,b) + e(b,a) = 1 e a diagonal vale 0,5', () => {
    for (const a of ['AA', 'T9s', '72o', 'KQo', '55']) {
      expect(table.eq(a, a)).toBeCloseTo(0.5, 3)
      for (const b of ['KK', '87s', 'A5o', '22']) {
        expect(table.eq(a, b) + table.eq(b, a)).toBeCloseTo(1, 3)
      }
    }
  })

  it('mao desconhecida vale 0,5', () => {
    expect(table.eq('XX', 'AA')).toBe(0.5)
  })
})

describe('EV de push/fold em heads-up reproduz o Nash do solver', () => {
  const STACKS = [3, 5, 8, 10, 15, 20, 25]

  it('maos puras: o sinal do EV concorda com a acao do solver, em todos os stacks', () => {
    for (const S of STACKS) {
      const push = bank.get(`HU:${S}:SB`)!
      const call = bank.get(`HU:${S}:BB`)!
      for (const h of table.hands) {
        const fPush = push.freq(h)
        const dPush = evHuPush(table, h, S, call).delta
        if (fPush >= 0.98) expect(dPush, `SB push ${h} ${S}bb`).toBeGreaterThan(-0.05)
        if (fPush <= 0.02) expect(dPush, `SB fold ${h} ${S}bb`).toBeLessThan(0.05)

        const fCall = call.freq(h)
        const dCall = evHuCall(table, h, S, push).delta
        if (fCall >= 0.98) expect(dCall, `BB call ${h} ${S}bb`).toBeGreaterThan(-0.05)
        if (fCall <= 0.02) expect(dCall, `BB fold ${h} ${S}bb`).toBeLessThan(0.05)
      }
    }
  })

  it('maos mistas: as duas acoes tem EV quase igual (equilibrio)', () => {
    let mixed = 0
    for (const S of STACKS) {
      const push = bank.get(`HU:${S}:SB`)!
      const call = bank.get(`HU:${S}:BB`)!
      for (const h of table.hands) {
        if (push.freq(h) > 0.15 && push.freq(h) < 0.85) {
          mixed++
          expect(Math.abs(evHuPush(table, h, S, call).delta), `SB ${h} ${S}bb`).toBeLessThan(0.2)
        }
        if (call.freq(h) > 0.15 && call.freq(h) < 0.85) {
          mixed++
          expect(Math.abs(evHuCall(table, h, S, push).delta), `BB ${h} ${S}bb`).toBeLessThan(0.2)
        }
      }
    }
    expect(mixed).toBeGreaterThan(5) // o teste nao pode passar vazio
  })

  it('magnitudes: AA vale muito ir all-in; 72o com stack fundo perde ao empurrar', () => {
    const call10 = bank.get('HU:10:BB')!
    expect(evHuPush(table, 'AA', 10, call10).delta).toBeGreaterThan(1)
    const call20 = bank.get('HU:20:BB')!
    expect(evHuPush(table, '72o', 20, call20).delta).toBeLessThan(-0.3)
    // a defesa do BB tambem: AA paga sempre, 72o foge
    const push10 = bank.get('HU:10:SB')!
    expect(evHuCall(table, 'AA', 10, push10).delta).toBeGreaterThan(3)
    expect(evHuCall(table, '72o', 10, push10).delta).toBeLessThan(-0.3)
  })

  it('SB fold vale -0,5 e BB fold vale -1 (blinds ja postados)', () => {
    expect(evHuPush(table, 'AA', 10, bank.get('HU:10:BB')!).fold).toBe(-0.5)
    expect(evHuCall(table, 'AA', 10, bank.get('HU:10:SB')!).fold).toBe(-1)
  })
})

describe('perda de EV', () => {
  it('escolher a melhor acao custa 0; a pior custa o delta', () => {
    const ev = { agg: 2.0, fold: -0.5, delta: 2.5 }
    expect(evLoss(ev, true)).toBe(0)
    expect(evLoss(ev, false)).toBeCloseTo(2.5, 10)
    const ev2 = { agg: -1.2, fold: -0.5, delta: -0.7 }
    expect(evLoss(ev2, false)).toBe(0)
    expect(evLoss(ev2, true)).toBeCloseTo(0.7, 10)
  })

  it('versusRange: contra um range vazio p=0 e contra todo o range p=1', () => {
    expect(versusRange(table, 'AA', () => 0).p).toBe(0)
    expect(versusRange(table, 'AA', () => 1).p).toBeCloseTo(1, 10)
  })
})
