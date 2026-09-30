import { describe, it, expect } from 'vitest'
import { createGame, startHand, applyAction } from '../game/reducer'
import { decideBot } from '../bots/policy'
import { pickProfiles } from '../bots/profiles'
import { mulberry32 } from '../cards'
import {
  levelAt, mttPayouts, sngConfig, mttConfig, startTournament, advanceAfterHand, bustProbability,
  inTheMoney, isBubble, isHandForHand, prizeInBuyIns, paidPlaces, type TournamentState, type TournamentConfig,
} from '../game/tournament'
import type { GameState } from '../game/types'

describe('estrutura de blinds e premios', () => {
  it('blinds so sobem, sb = bb/2 e tudo e inteiro', () => {
    let prev = 0
    for (let i = 0; i < 40; i++) {
      const l = levelAt(i)
      expect(l.bb).toBeGreaterThan(prev)
      expect(l.sb * 2).toBe(l.bb)
      expect(Number.isInteger(l.sb) && Number.isInteger(l.ante)).toBe(true)
      prev = l.bb
    }
    expect(levelAt(0).ante).toBe(0)
    expect(levelAt(5).ante).toBeGreaterThan(0)
  })

  it('premios do MTT somam 1, decrescem e pagam ~15% do campo', () => {
    for (const field of [27, 54, 90]) {
      const p = mttPayouts(field)
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10)
      for (let i = 1; i < p.length; i++) expect(p[i]).toBeLessThan(p[i - 1])
      expect(p.length).toBe(Math.max(3, Math.round(field * 0.15)))
    }
    expect(sngConfig(6).payouts).toEqual([0.65, 0.35])
  })

  it('premio em buy-ins: campeao de SNG 6-max leva 3,9', () => {
    expect(prizeInBuyIns(sngConfig(6), 1)).toBeCloseTo(3.9, 10)
    expect(prizeInBuyIns(sngConfig(6), 3)).toBe(0)
  })

  it('a probabilidade de eliminacao cresce quando o stack medio encolhe', () => {
    expect(bustProbability(5)).toBeGreaterThan(bustProbability(20))
    expect(bustProbability(20)).toBeGreaterThan(bustProbability(70))
  })

  it('bolha e dinheiro dependem so de quantos premios ha', () => {
    const t = { config: sngConfig(6), remaining: 3 } as TournamentState
    expect(isBubble(t)).toBe(true)
    expect(inTheMoney(t)).toBe(false)
    expect(inTheMoney({ ...t, remaining: 2 })).toBe(true)
    expect(paidPlaces(t)).toBe(2)
  })
})

describe('inicio de torneio', () => {
  it('SNG: mesa cheia, campo == assentos', () => {
    const s = startTournament(sngConfig(9), 'Você', () => 'tag', mulberry32(1))
    expect(s.players).toHaveLength(9)
    expect(s.players.filter((p) => p.isHero)).toHaveLength(1)
    expect(s.tour.offTable).toBe(0)
    expect(s.tour.remaining).toBe(9)
    expect(s.players.every((p) => p.stack === 1500)).toBe(true)
  })

  it('MTT: so 9 sentam, o resto fica simulado', () => {
    const s = startTournament(mttConfig(54), 'Você', () => 'tag', mulberry32(2))
    expect(s.players).toHaveLength(9)
    expect(s.tour.offTable).toBe(45)
    expect(s.tour.totalChips).toBe(54 * 1500)
  })
})

interface Outcome {
  tour: TournamentState
  hands: number
  maxLevel: number
}

/** Joga um torneio inteiro com todos os assentos controlados por bots (o heroi tambem). */
function simulate(config: TournamentConfig, seed: number): Outcome {
  const rng = mulberry32(seed)
  const start = startTournament(config, 'Herói', () => pickProfiles(1, rng)[0], rng)
  let tour: TournamentState = start.tour
  let g: GameState = createGame(start.players, start.cfg, 0)
  let hands = 0
  while (!tour.done && hands < 2500) {
    g = startHand(g, rng)
    let guard = 0
    while (!g.over) {
      g = applyAction(g, decideBot(g, rng))
      if (++guard > 300) throw new Error('mao nao termina')
    }
    hands++
    const out = advanceAfterHand(tour, g, rng, () => pickProfiles(1, rng)[0])
    tour = out.tour
    g = out.game

    const onTable = g.seats.reduce((a, s) => a + s.stack, 0)
    // com o campo todo na mesa, as fichas conferem EXATAMENTE (antes, blinds e antes inclusos)
    if (tour.offTable === 0) expect(onTable).toBe(tour.totalChips)
    expect(onTable).toBeLessThanOrEqual(tour.totalChips)
  }
  return { tour, hands, maxLevel: tour.levelIdx }
}

describe('torneios simulados ponta a ponta', () => {
  it('SNG 6-max: fichas conservadas em toda mao, colocacoes unicas e coerentes', () => {
    let finished = 0
    for (const seed of [2, 3, 4, 5, 6]) {
      const { tour, hands } = simulate(sngConfig(6), seed)
      expect(tour.done).toBe(true)
      expect(hands).toBeLessThan(2500)
      const places = tour.finishes.map((f) => f.place)
      expect(new Set(places).size).toBe(places.length)
      expect(places.every((p) => p >= 1 && p <= 6)).toBe(true)
      expect(tour.finishes.filter((f) => f.isHero)).toHaveLength(1)
      expect(tour.finishes.find((f) => f.isHero)?.place).toBe(tour.heroPlace)
      finished++
    }
    expect(finished).toBe(5)
  }, 300_000)

  it('SNG: os blinds realmente sobem durante o torneio', () => {
    const { maxLevel } = simulate(sngConfig(6), 3)
    expect(maxLevel).toBeGreaterThanOrEqual(5)
  }, 120_000)

  it('MTT de 27: campo simulado quebra, mesa final se forma e as fichas conferem', () => {
    // sementes em que o heroi sobrevive por muito tempo, para exercitar balanceamento e mesa final
    for (const seed of [1, 3, 5]) {
      const { tour, hands } = simulate(mttConfig(27), seed)
      expect(tour.done).toBe(true)
      expect(hands).toBeGreaterThan(50) // sobreviveu ate o campo encolher
      expect(tour.remaining).toBeLessThan(27)
      // houve eliminacoes fora da mesa: mais colocacoes registradas do que assentos da mesa
      expect(tour.finishes.length).toBeGreaterThan(9)
      const places = tour.finishes.map((f) => f.place)
      expect(places.every((p) => p >= 1 && p <= 27)).toBe(true)
    }
  }, 400_000)
})

describe('bolha mao a mao (MTT)', () => {
  const start = () => {
    const cfg = mttConfig(27)
    const s = startTournament(cfg, 'Voce', () => 'tag', mulberry32(5))
    const game = startHand(createGame(s.players, s.cfg, 0), mulberry32(6))
    return { s, game }
  }

  it('so vale no MTT, na bolha, com campo fora da mesa', () => {
    const { s } = start()
    const bubbleT = { ...s.tour, remaining: paidPlaces(s.tour) + 1 }
    expect(isHandForHand(bubbleT)).toBe(true)
    expect(isHandForHand({ ...bubbleT, remaining: paidPlaces(s.tour) + 2 })).toBe(false)
    expect(isHandForHand({ ...bubbleT, offTable: 0 })).toBe(false)
    expect(isHandForHand({ ...bubbleT, config: sngConfig(6) })).toBe(false)
  })

  it('no maximo uma eliminacao por mao no campo; ninguem perde duas maos sem quebrar', () => {
    const { s, game } = start()
    const rng = mulberry32(99)
    let tour: TournamentState = { ...s.tour, remaining: paidPlaces(s.tour) + 1 }
    let drops = 0
    for (let i = 0; i < 400 && isHandForHand(tour); i++) {
      const before = tour.remaining
      const r = advanceAfterHand(tour, { ...game, seats: game.seats.map((x) => ({ ...x })) }, rng)
      expect(before - r.tour.remaining).toBeLessThanOrEqual(1)
      if (r.tour.remaining < before) drops++
      tour = r.tour
    }
    expect(drops).toBeGreaterThan(0)
    expect(isBubble(tour)).toBe(false)
    expect(new Set(tour.finishes.map((f) => f.place)).size).toBe(tour.finishes.length)
  })
})
