import { describe, it, expect, beforeAll } from 'vitest'
import { loadSpots, type SpotBank } from '../spots'
import { loadEquity169, type EquityTable } from '../equity169'
import { evHuPush, evHuCall, evLoss, versusRange, mwPushEV, mwCallEV, type MwPlayer } from '../coach/ev'

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

describe('EV multiway e ICM', () => {
  const pl = (key: string, total: number, committed: number, folded = false): MwPlayer => ({ key, total, committed, folded })

  it('com 2 jogadores reproduz exatamente o EV heads-up (all-in e call)', () => {
    const S = 10
    // o banco HU nomeia a defesa 'BB' (sem _vs_): o modelo multiway pede 'BB_vs_SB'
    const huBank = { get: (id: string) => bank.get(id === 'HU:10:BB_vs_SB' ? 'HU:10:BB' : id) }
    for (const hand of ['K9o', 'A5o', '72o', 'AA', 'T9s']) {
      const players = [pl('SB', S, 0.5), pl('BB', S, 1)]
      const push = mwPushEV({ bank: huBank, table, prefix: 'HU', bucket: 10, hand, hero: 0, players, behind: [1] })!
      const ref = evHuPush(table, hand, 10, bank.get('HU:10:BB')!)
      expect(push.chip.agg).toBeCloseTo(ref.agg, 9)
      expect(push.chip.fold).toBeCloseTo(ref.fold, 9)
      const call = mwCallEV({ bank, table, prefix: 'HU', bucket: 10, hand, hero: 1, players, shover: 0 })!
      const refCall = evHuCall(table, hand, 10, bank.get('HU:10:SB')!)
      expect(call.chip.agg).toBeCloseTo(refCall.agg, 9)
      expect(call.chip.fold).toBeCloseTo(refCall.fold, 9)
    }
  })

  const six = (hero: string): { players: MwPlayer[]; hero: number; behind: number[] } => {
    const keys = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    const players = keys.map((k) => pl(k, 10, k === 'SB' ? 0.5 : k === 'BB' ? 1 : 0))
    const h = keys.indexOf(hero)
    return { players, hero: h, behind: keys.map((_, i) => i).filter((i) => i > h) }
  }

  it('6-max: AA tem EV de all-in maior que o de foldar; 72o nao; sem premios nao ha ICM', () => {
    const s = six('UTG')
    const aa = mwPushEV({ bank, table, prefix: '6max', bucket: 10, hand: 'AA', ...s })!
    const trash = mwPushEV({ bank, table, prefix: '6max', bucket: 10, hand: '72o', ...s })!
    expect(aa.chip.delta).toBeGreaterThan(0)
    expect(trash.chip.delta).toBeLessThan(0)
    expect(aa.icm).toBeNull()
  })

  it('o EV multiway fecha com o solver: mao pura de push tem delta > 0 e a de fold, delta < 0', () => {
    const s = six('BTN')
    const spot = bank.get('6max:10:BTN')!
    let okPush = 0, okFold = 0, nPush = 0, nFold = 0
    for (const h of table.hands) {
      const f = spot.freq(h)
      if (f !== 1 && f !== 0) continue
      const r = mwPushEV({ bank, table, prefix: '6max', bucket: 10, hand: h, ...s })!
      if (f === 1) { nPush++; if (r.chip.delta > 0) okPush++ } else { nFold++; if (r.chip.delta < 0) okFold++ }
    }
    // modelo simplificado (so o 1o chamador): exige concordancia alta, nao perfeita
    expect(okPush / nPush).toBeGreaterThan(0.85)
    expect(okFold / nFold).toBeGreaterThan(0.85)
  })

  it('ICM com 3 vivos e premio 65/35: o valor sobe com mais fichas e a aversao a risco aparece', () => {
    const payouts = [0.65, 0.35]
    const players = [pl('BTN', 8, 0), pl('SB', 12, 0.5), pl('BB', 10, 1)]
    const total = 30
    const r = mwPushEV({ bank, table, prefix: 'sng6_top2', bucket: 8, hand: 'A5o', hero: 0, players, behind: [1, 2], payouts })!
    expect(r.icm).not.toBeNull()
    // valor total do premio em % (todos somam 100): o heroi vale entre 0 e 100
    expect(r.icm!.agg).toBeGreaterThan(0)
    expect(r.icm!.agg).toBeLessThan(100)
    // valor linear em fichas (% do premio por ficha) ~ delta em fichas * 100 / total: o ICM e mais conservador
    const linear = (r.chip.delta * 100) / total
    if (r.chip.delta > 0) expect(r.icm!.delta).toBeLessThan(linear)
    else expect(r.icm!.delta).toBeLessThan(0)
  })
})
