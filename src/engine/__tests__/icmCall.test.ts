import { describe, it, expect } from 'vitest'
import { icmCallInfo } from '../coach/icmCall'
import { SCENARIOS, buildScenarioHand, scenarioById } from '../lab/scenarios'
import { applyAction, createGame, startHand } from '../game/reducer'
import { mulberry32 } from '../cards'

const BUBBLE = [0.65, 0.35, 0]
const FLAT = [0.5, 0.3, 0.2]
const hand = (id: string, seed = 1) => buildScenarioHand(scenarioById(id)!, mulberry32(seed), 1)

describe('icmCallInfo: casos em que ICM e fichas coincidem', () => {
  it('premio unico (winner-take-all): a equity necessaria em ICM e igual a em fichas', () => {
    const info = icmCallInfo(hand('bolha-top-par'), [1])!
    expect(info.icmNeeded).toBeCloseTo(info.chipNeeded, 9)
    expect(info.premium).toBeCloseTo(0, 9)
  })

  it('so dois jogadores: o valor ICM e linear nas fichas, sem premio de risco', () => {
    let g = startHand(createGame([
      { name: 'H', isHero: true, profile: 'tag', stack: 200 },
      { name: 'V', profile: 'tag', stack: 120 },
    ], { sb: 1, bb: 2, ante: 0 }, 0), mulberry32(4))
    g = applyAction(g, { type: 'raise', to: 5 })
    g = applyAction(g, { type: 'call' })
    g = applyAction(g, { type: 'raise', to: 8 }) // vilao (BB) aposta no flop
    const info = icmCallInfo(g, [0.65, 0.35])!
    expect(info).toBeTruthy()
    expect(info.premium).toBeCloseTo(0, 9)
  })
})

describe('icmCallInfo: bolha com 3 jogadores', () => {
  it('pagar exige mais equity em ICM do que em fichas (premio de risco positivo)', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const info = icmCallInfo(hand('bolha-top-par', seed), BUBBLE)!
      expect(info.icmNeeded).toBeGreaterThan(info.chipNeeded)
      expect(info.icmNeeded).toBeLessThan(1)
      expect(info.premium).toBeCloseTo(info.icmNeeded - info.chipNeeded, 12)
    }
  })

  it('os valores ICM do heroi sao coerentes: ganhar > largar > perder', () => {
    const info = icmCallInfo(hand('bolha-top-par'), BUBBLE)!
    expect(info.win).toBeGreaterThan(info.fold)
    expect(info.fold).toBeGreaterThan(info.lose)
    // a equity que zera a diferenca: p*win + (1-p)*lose = fold
    const p = info.icmNeeded
    expect(p * info.win + (1 - p) * info.lose).toBeCloseTo(info.fold, 9)
  })

  it('sem bolha (todos pagos) o premio de risco e menor que na bolha', () => {
    const bubble = icmCallInfo(hand('bolha-top-par'), BUBBLE)!
    const flat = icmCallInfo(hand('bolha-top-par'), FLAT)!
    expect(flat.premium).toBeGreaterThan(0)
    expect(flat.premium).toBeLessThan(bubble.premium)
  })

  it('o stack medio paga mais caro que o chip leader pela mesma decisao', () => {
    const leader = icmCallInfo(hand('bolha-top-par'), BUBBLE)!
    const medium = icmCallInfo(hand('bolha-stack-medio'), BUBBLE)!
    expect(medium.premium).toBeGreaterThan(leader.premium)
  })
})

describe('icmCallInfo: quem cobre quem', () => {
  it('o chip leader cobre o vilao; no cenario do stack medio, o vilao cobre voce', () => {
    const leader = icmCallInfo(hand('bolha-top-par'), BUBBLE)!
    expect(leader.heroCoversVillain).toBe(true)
    expect(leader.villainCoversHero).toBe(false)
    const medium = icmCallInfo(hand('bolha-stack-medio'), BUBBLE)!
    expect(medium.villainCoversHero).toBe(true)
    expect(medium.heroCoversVillain).toBe(false)
  })
})

describe('coach pos-flop com ICM', () => {
  it('a nota usa a equity necessaria de ICM e explica a diferenca', async () => {
    const { gradeDecision } = await import('../coach/grade')
    const g = hand('bolha-stack-medio')
    const withIcm = gradeDecision(g, { type: 'call' }, mulberry32(5), { icmPayouts: BUBBLE })
    const chipOnly = gradeDecision(g, { type: 'call' }, mulberry32(5))
    expect(withIcm.needed!).toBeGreaterThan(chipOnly.needed!)
    expect(withIcm.explain.join(' ')).toMatch(/Em ICM a equity necessária sobe de/)
    expect(withIcm.explain.join(' ')).toMatch(/ele te cobre/)
    expect(chipOnly.explain.join(' ')).not.toMatch(/Em ICM/)
  })

  it('o stack medio e avisado a largar onde so fichas mandariam pagar', async () => {
    const { gradeDecision } = await import('../coach/grade')
    const g = hand('bolha-stack-medio')
    const icm = gradeDecision(g, { type: 'call' }, mulberry32(5), { icmPayouts: BUBBLE })
    const chips = gradeDecision(g, { type: 'call' }, mulberry32(5))
    expect(['inaccuracy', 'mistake', 'blunder']).toContain(icm.grade)
    expect(icm.best).toBe('fold')
    // em fichas pagar nao era erro: a equity (~50%) passa os 45% necessarios
    expect(chips.best).not.toBe('fold')
  })
})

describe('icmCallInfo: quando nao se aplica', () => {
  it('sem premios, sem aposta para pagar ou em pote multiway devolve null', () => {
    const g = hand('bolha-top-par')
    expect(icmCallInfo(g, undefined)).toBeNull()
    expect(icmCallInfo(g, [])).toBeNull()
    // pote com 3 jogadores vivos: o heroi e o BB e enfrenta o raise do UTG com o SB ainda na mao
    let multi = startHand(createGame([
      { name: 'V', profile: 'tag', stack: 200 },
      { name: 'W', profile: 'tag', stack: 200 },
      { name: 'H', isHero: true, profile: 'tag', stack: 200 },
    ], { sb: 1, bb: 2, ante: 0 }, 0), mulberry32(2))
    multi = applyAction(multi, { type: 'raise', to: 6 }) // V (botao) abre
    multi = applyAction(multi, { type: 'call' }) // W (SB) paga
    expect(multi.seats[multi.toAct].isHero).toBe(true)
    expect(icmCallInfo(multi, BUBBLE)).toBeNull()
    // com o SB fora, e heads-up e o numero existe
    let hu = startHand(createGame([
      { name: 'V', profile: 'tag', stack: 200 },
      { name: 'W', profile: 'tag', stack: 200 },
      { name: 'H', isHero: true, profile: 'tag', stack: 200 },
    ], { sb: 1, bb: 2, ante: 0 }, 0), mulberry32(2))
    hu = applyAction(hu, { type: 'raise', to: 6 })
    hu = applyAction(hu, { type: 'fold' })
    expect(icmCallInfo(hu, BUBBLE)).toBeTruthy()
  })

  it('todos os cenarios com premios geram numeros validos em 40 maos cada', () => {
    for (const sc of SCENARIOS.filter((s) => s.payouts)) {
      for (let seed = 1; seed <= 40; seed++) {
        const info = icmCallInfo(buildScenarioHand(sc, mulberry32(seed), 1), sc.payouts)!
        expect(info).toBeTruthy()
        expect(Number.isFinite(info.icmNeeded)).toBe(true)
        expect(info.icmNeeded).toBeGreaterThan(0)
        expect(info.icmNeeded).toBeLessThan(1)
      }
    }
  })
})
