import { describe, it, expect } from 'vitest'
import { adaptProfile, MIN_HANDS_PRO, MIN_HANDS_REGULAR } from '../bots/adapt'
import { BOT_PROFILES, fieldProfile, profileOf } from '../bots/profiles'
import { emptyHud, updateHud, type HudStats } from '../bots/hud'
import { decideBot } from '../bots/policy'
import { applyAction, createGame, startHand } from '../game/reducer'
import { mulberry32 } from '../cards'

const hud = (o: Partial<HudStats>): HudStats => ({ ...emptyHud(), hands: 100, ...o })
const tight = hud({ vpip: 12, pfr: 9 })
const loose = hud({ vpip: 55, pfr: 40 })
const caller = hud({ vpip: 50, pfr: 6 })
const folder = hud({ facedBet: 40, foldToBet: 30 })
const stubborn = hud({ facedBet: 40, foldToBet: 6 })

const pro = profileOf('tag~1.00~1.00~2')
const regular = profileOf('tag~1.00~1.00~1')
const fixed = profileOf('tag~1.00~1.00~0')
const deep = { stackBB: 100 }

describe('perfis: nivel de adaptacao no id', () => {
  it('o quarto campo do id define se o bot se adapta', () => {
    expect(pro.adapt).toBe(2)
    expect(regular.adapt).toBe(1)
    expect(fixed.adapt).toBe(0)
    expect(profileOf('tag~1.00~1.00').adapt).toBe(0) // id antigo, sem o campo
    expect(BOT_PROFILES.lag.adapt).toBe(0)
  })

  it('o campo tem poucos profissionais, alguns regulares e a maioria fixa', () => {
    const rng = mulberry32(3)
    const ids = Array.from({ length: 4000 }, () => profileOf(fieldProfile(rng)).adapt)
    const share = (n: number) => ids.filter((x) => x === n).length / ids.length
    expect(share(2)).toBeGreaterThan(0.06)
    expect(share(2)).toBeLessThan(0.15)
    expect(share(1)).toBeGreaterThan(0.18)
    expect(share(1)).toBeLessThan(0.32)
    expect(share(0)).toBeGreaterThan(0.55)
  })
})

describe('adaptProfile: ajustes contra o heroi', () => {
  it('bot fixo nunca muda', () => {
    const p = adaptProfile(fixed, { hero: tight }, deep, true)
    expect(p).toMatchObject({ looseness: fixed.looseness, aggression: fixed.aggression, bluff: fixed.bluff, stickiness: fixed.stickiness })
  })

  it('contra quem aperta, o profissional rouba mais (mais frouxo e agressivo)', () => {
    const p = adaptProfile(pro, { hero: tight }, deep, true)
    expect(p.looseness).toBeGreaterThan(pro.looseness * 1.15)
    expect(p.aggression).toBeGreaterThan(pro.aggression)
  })

  it('contra quem joga solto e agride, paga mais fino e blefa menos', () => {
    const p = adaptProfile(pro, { hero: loose }, deep, true)
    expect(p.stickiness).toBeGreaterThan(pro.stickiness)
    expect(p.bluff).toBeLessThan(pro.bluff)
  })

  it('contra o pagador passivo, blefa bem menos e aposta mais por valor', () => {
    const p = adaptProfile(pro, { hero: caller }, deep, true)
    expect(p.bluff).toBeLessThan(pro.bluff * 0.6)
    expect(p.aggression).toBeGreaterThan(pro.aggression)
  })

  it('blefa mais contra quem foge de apostas e menos contra quem nao foge', () => {
    expect(adaptProfile(pro, { hero: folder }, deep, true).bluff).toBeGreaterThan(pro.bluff * 1.4)
    expect(adaptProfile(pro, { hero: stubborn }, deep, true).bluff).toBeLessThan(pro.bluff * 0.6)
  })

  it('o regular muda na mesma direcao, mas menos que o profissional', () => {
    const p = adaptProfile(pro, { hero: tight }, deep, true).looseness - pro.looseness
    const r = adaptProfile(regular, { hero: tight }, deep, true).looseness - regular.looseness
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThan(p)
  })

  it('so se adapta com amostra suficiente (o profissional precisa de menos maos)', () => {
    const few = (n: number) => hud({ vpip: Math.round(n * 0.1), pfr: Math.round(n * 0.08), hands: n })
    // sem informacao do heroi, so a marcha da situacao (aqui, fundo) vale: e a base de comparacao
    const baseP = adaptProfile(pro, {}, deep, true).looseness
    const baseR = adaptProfile(regular, {}, deep, true).looseness
    expect(adaptProfile(pro, { hero: few(MIN_HANDS_PRO - 1) }, deep, true).looseness).toBe(baseP)
    expect(adaptProfile(pro, { hero: few(MIN_HANDS_PRO) }, deep, true).looseness).toBeGreaterThan(baseP)
    expect(adaptProfile(regular, { hero: few(MIN_HANDS_REGULAR - 1) }, deep, true).looseness).toBe(baseR)
    expect(adaptProfile(regular, { hero: few(MIN_HANDS_REGULAR) }, deep, true).looseness).toBeGreaterThan(baseR)
    expect(MIN_HANDS_PRO).toBeLessThan(MIN_HANDS_REGULAR)
  })

  it('so reage ao heroi quando ele ainda esta na mao', () => {
    const base = adaptProfile(pro, {}, deep, false).looseness
    expect(adaptProfile(pro, { hero: tight }, deep, false).looseness).toBe(base)
    expect(adaptProfile(pro, { hero: tight }, deep, true).looseness).toBeGreaterThan(base)
  })

  it('os valores ficam dentro de limites sensatos mesmo no extremo', () => {
    const p = adaptProfile(profileOf('maniac~1.50~1.50~2'), { hero: tight, avgStackBB: 20 }, { stackBB: 200 }, true)
    expect(p.looseness).toBeLessThanOrEqual(2.5)
    expect(p.aggression).toBeLessThanOrEqual(2.5)
    expect(p.bluff).toBeLessThanOrEqual(0.7)
    expect(p.bluff).toBeGreaterThanOrEqual(0)
    expect(p.stickiness).toBeLessThanOrEqual(0.25)
  })
})

describe('adaptProfile: marcha por situacao (sem olhar o heroi)', () => {
  it('com stack curto joga mais solto e agressivo do que fundo', () => {
    const short = adaptProfile(pro, {}, { stackBB: 18 }, false)
    const big = adaptProfile(pro, {}, { stackBB: 120 }, false)
    expect(short.looseness).toBeGreaterThan(big.looseness)
    expect(short.aggression).toBeGreaterThan(big.aggression)
  })

  it('o chip leader pressiona: mais agressivo que o stack medio', () => {
    const leader = adaptProfile(pro, { avgStackBB: 40 }, { stackBB: 90 }, false)
    const mid = adaptProfile(pro, { avgStackBB: 40 }, { stackBB: 40 }, false)
    expect(leader.aggression).toBeGreaterThan(mid.aggression)
  })
})

describe('hud: fold para aposta pos-flop', () => {
  it('conta quantas vezes o jogador enfrentou aposta e quantas vezes largou', () => {
    const rng = mulberry32(8)
    let h: Record<string, HudStats> = {}
    for (let i = 0; i < 80; i++) {
      let g = startHand(createGame([{ name: 'A', profile: 'tag', stack: 400 }, { name: 'B', profile: 'tag', stack: 400 }], { sb: 1, bb: 2, ante: 0 }, 0), rng)
      let guard = 0
      while (!g.over) { g = applyAction(g, decideBot(g, rng, 0, 40)); if (++guard > 200) throw new Error('x') }
      h = updateHud(h, g)
    }
    for (const n of ['A', 'B']) {
      expect(h[n].facedBet).toBeGreaterThan(0)
      expect(h[n].foldToBet).toBeGreaterThan(0)
      expect(h[n].foldToBet).toBeLessThanOrEqual(h[n].facedBet)
    }
  })
})

describe('comportamento: o profissional realmente joga diferente contra cada heroi', () => {
  /** Frequencia de abrir o pote do UTG de uma mesa de 6, com o heroi sentado no BB. */
  const openRate = (id: string, hero: HudStats | undefined) => {
    const rng = mulberry32(77)
    let raises = 0
    for (let h = 0; h < 600; h++) {
      const g = startHand(
        createGame(
          [{ name: 'Bot', profile: id, stack: 200 }, ...Array.from({ length: 4 }, (_, i) => ({ name: `F${i}`, profile: 'tag', stack: 200 })), { name: 'Hero', isHero: true, profile: 'tag', stack: 200 }],
          { sb: 1, bb: 2, ante: 0 }, 0,
        ),
        rng,
      )
      // o primeiro a agir (UTG) e o assento 3: troca o perfil dele pelo do teste
      const utg = g.toAct
      const seats = g.seats.map((s) => (s.id === utg ? { ...s, profile: id } : s))
      const a = decideBot({ ...g, seats }, rng, 0, 40, { hero, avgStackBB: 100 })
      if (a.type === 'raise') raises++
    }
    return raises
  }

  it('abre mais maos contra quem aperta, e o bot fixo nao muda nada', () => {
    const adaptive = 'lag~1.00~1.00~2'
    expect(openRate(adaptive, tight)).toBeGreaterThan(openRate(adaptive, undefined) + 8)
    expect(openRate('lag~1.00~1.00~0', tight)).toBe(openRate('lag~1.00~1.00~0', undefined))
  })

  const postflopBetRate = (id: string, hero: HudStats | undefined) => {
    const rng = mulberry32(55)
    let bets = 0
    let n = 0
    for (let h = 0; h < 700; h++) {
      let g = startHand(
        createGame([{ name: 'Hero', isHero: true, profile: 'tag', stack: 400 }, { name: 'Bot', profile: id, stack: 400 }], { sb: 1, bb: 2, ante: 0 }, 0),
        rng,
      )
      g = applyAction(g, { type: 'call' }) // heroi (SB) completa
      // o bot (BB) tem a opcao: passa a vez e vai ao flop, onde ele age primeiro
      g = applyAction(g, { type: 'check' })
      if (g.street !== 'flop' || g.toAct < 0 || g.seats[g.toAct].isHero) continue
      n++
      const a = decideBot(g, rng, 0, 40, { hero, avgStackBB: 100 })
      if (a.type === 'raise') bets++
    }
    expect(n).toBeGreaterThan(500)
    return bets
  }

  it('aposta mais no flop contra quem foge de apostas do que contra quem nao foge', () => {
    const adaptive = 'lag~1.00~1.00~2'
    expect(postflopBetRate(adaptive, folder)).toBeGreaterThan(postflopBetRate(adaptive, stubborn) + 25)
  })
})
