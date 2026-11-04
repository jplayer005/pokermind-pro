import { describe, it, expect } from 'vitest'
import { coverOf } from '../game/cover'
import type { Seat } from '../game/types'

const seat = (o: Partial<Seat>): Seat => ({
  id: 0, name: 'x', isHero: false, profile: 'tag', stack: 100, bet: 0, total: 0, startStack: 100,
  folded: false, out: false, allIn: false, acted: false, raiseLocked: false, cards: [0, 1], lastAction: '', ...o,
})

describe('coverOf: quem cobre quem no inicio da mao', () => {
  const hero = seat({ id: 0, isHero: true, startStack: 100 })

  it('o heroi cobre quem tem menos e e coberto por quem tem mais', () => {
    expect(coverOf(hero, seat({ id: 1, startStack: 60 }))).toBe('hero')
    expect(coverOf(hero, seat({ id: 2, startStack: 180 }))).toBe('villain')
  })

  it('stacks quase iguais (menos de 3% de diferenca) nao ganham selo', () => {
    expect(coverOf(hero, seat({ id: 1, startStack: 102 }))).toBeNull()
    expect(coverOf(hero, seat({ id: 1, startStack: 98 }))).toBeNull()
  })

  it('nao ha selo para o proprio heroi, quem largou, quem esta fora ou se o heroi esta fora', () => {
    expect(coverOf(hero, hero)).toBeNull()
    expect(coverOf(hero, seat({ id: 1, startStack: 10, folded: true }))).toBeNull()
    expect(coverOf(hero, seat({ id: 1, startStack: 10, out: true }))).toBeNull()
    expect(coverOf(seat({ id: 0, isHero: true, out: true }), seat({ id: 1, startStack: 10 }))).toBeNull()
  })
})
