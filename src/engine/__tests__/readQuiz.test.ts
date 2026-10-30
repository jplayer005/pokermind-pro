import { describe, it, expect } from 'vitest'
import { createGame, startHand, applyAction } from '../game/reducer'
import { bandOf, bandsOf, buildQuiz, isQuizSpot, scoreQuiz } from '../coach/readQuiz'
import { mulberry32, parseCards } from '../cards'
import type { GameState, PlayerInit } from '../game/types'

const cfg = { sb: 1, bb: 2, ante: 0 }
const mk = (n: number, stackBB = 100): PlayerInit[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, profile: 'tag', stack: stackBB * 2 }))
const raise = (to: number) => ({ type: 'raise', to }) as const
const call = { type: 'call' } as const
const check = { type: 'check' } as const

function rig(state: GameState, hole: Record<number, string>, board: string): GameState {
  const s = { ...state, seats: state.seats.map((x) => ({ ...x })), deck: [...state.deck] }
  for (const [i, h] of Object.entries(hole)) s.seats[Number(i)].cards = parseCards(h) as [number, number]
  const b = parseCards(board)
  s.deck = [...s.deck.filter((c) => !b.includes(c)), ...b.reverse()]
  return s
}

/** HU: heroi abre e paga; flop e turn com o heroi pagando/checando; vilao (BB) aposta o turn. */
function turnFacingBet(bet: number): GameState {
  let g = startHand(createGame(mk(2), cfg, 0), mulberry32(31))
  const hero = g.toAct
  g = rig(g, { [hero]: 'Ac Kh', [1 - hero]: 'Kd Qd' }, '2c 7d 9h Js 3c')
  g.seats[hero].isHero = true
  g = applyAction(g, raise(5))
  g = applyAction(g, call)
  g = applyAction(g, check) // vilao checa o flop
  g = applyAction(g, raise(4)) // heroi aposta
  g = applyAction(g, call) // vilao paga
  return applyAction(g, raise(bet)) // vilao aposta o turn
}

describe('readQuiz: quando a mesa pausa', () => {
  it('pausa diante de aposta grande no pos-flop', () => {
    const g = turnFacingBet(10)
    expect(g.street).toBe('turn')
    expect(isQuizSpot(g, 'all')).toBe(true)
  })

  it('nao pausa com aposta pequena, sem aposta ou no pre-flop', () => {
    expect(isQuizSpot(turnFacingBet(2), 'all')).toBe(false) // 2 num pote de 10: bem menos que meio pote
    let pre = startHand(createGame(mk(2), cfg, 0), mulberry32(31))
    pre = rig(pre, { [pre.toAct]: 'Ac Kh' }, '2c 7d 9h Js 3c')
    pre.seats[pre.toAct].isHero = true
    expect(isQuizSpot(pre, 'all')).toBe(false)
  })

  it('a frequencia "so river" ignora o turn', () => {
    const g = turnFacingBet(10)
    expect(isQuizSpot(g, 'river')).toBe(false)
  })
})

describe('readQuiz: faixas do range', () => {
  const board = parseCards('2c 7c 9h Js')
  const c = (s: string) => parseCards(s) as [number, number]

  it('classifica trinca, par, draw e ar', () => {
    expect(bandOf(c('9s 9d'), board)).toBe('strong') // trinca
    expect(bandOf(c('Jd Th'), board)).toBe('pair') // par de valetes
    expect(bandOf(c('Ac Kc'), board)).toBe('draw') // 4 paus
    expect(bandOf(c('Ad 4s'), board)).toBe('air')
  })

  it('par so do board nao conta como par da mao', () => {
    const paired = parseCards('2c 2d 9h Js')
    expect(bandOf(c('Ad 4s'), paired)).toBe('air')
  })

  it('as faixas somam 1', () => {
    const b = bandsOf([c('9s 9d'), c('Jd Th'), c('Ac Kc'), c('Ad 4s')], board)
    expect(b.strong + b.pair + b.draw + b.air).toBeCloseTo(1, 5)
    expect(b.strong).toBeCloseTo(0.25, 5)
  })
})

describe('readQuiz: montagem e nota', () => {
  it('monta o quiz com equity, pot odds necessarias e faixas', () => {
    const g = turnFacingBet(10)
    const q = buildQuiz(g, mulberry32(5))!
    expect(q).toBeTruthy()
    expect(q.equity).toBeGreaterThan(0)
    expect(q.equity).toBeLessThan(1)
    // pagar 10 num pote de 10 + 10 (aposta dele) + 4 + 4... : needed = call / (pote + call)
    expect(q.needed).toBeCloseTo(q.toCall / (q.pot + q.toCall), 6)
    const sum = q.bands.strong + q.bands.pair + q.bands.draw + q.bands.air
    expect(sum).toBeCloseTo(1, 5)
    expect(q.steps.join(' ')).toMatch(/slowplay|apostou/)
  })

  it('o palpite de equity vale por margem: ate 10 pontos e acerto cheio', () => {
    const q = buildQuiz(turnFacingBet(10), mulberry32(5))!
    const near = scoreQuiz(q, 'pair', q.equity + 0.06)
    expect(near.eqHit).toBe(true)
    expect(near.grade).toBe('best')
    // AK sem par contra um range de aposta no turn: a equity real e baixa
    expect(q.equity).toBeLessThan(0.5)
    const far = scoreQuiz(q, 'pair', 0.95)
    expect(far.eqHit).toBe(false)
    expect(['mistake', 'blunder']).toContain(far.grade)
    expect(far.tag).toBe('QUIZ_EQ_OVER')
    expect(far.error).toBeGreaterThan(0.4)
  })

  it('subestimar tambem e erro, com tag propria', () => {
    const q = buildQuiz(turnFacingBet(10), mulberry32(5))!
    expect(q.equity).toBeGreaterThan(0.15)
    const low = scoreQuiz(q, 'air', 0)
    expect(low.tag).toBe('QUIZ_EQ_UNDER')
    expect(low.eqHit).toBe(false)
  })

  it('o vazamento da leitura aparece com nome legivel e leva para a mesa', async () => {
    const { labelFor, drillTarget } = await import('../coach/leaks')
    expect(labelFor('QUIZ_EQ_TURN')).toMatch(/turn/)
    expect(drillTarget('QUIZ_EQ_RIVER').path).toBe('/play')
    expect(labelFor('ODDS_POTODDS')).toMatch(/pot odds/)
    expect(drillTarget('ODDS_OUTS').path).toBe('/odds')
  })

  it('acerta a faixa quando escolhe a mais provavel (ou perto dela)', () => {
    const q = buildQuiz(turnFacingBet(10), mulberry32(5))!
    const top = (Object.keys(q.bands) as (keyof typeof q.bands)[]).reduce((a, b) => (q.bands[b] > q.bands[a] ? b : a))
    expect(scoreQuiz(q, top, q.equity).bandHit).toBe(true)
  })
})
