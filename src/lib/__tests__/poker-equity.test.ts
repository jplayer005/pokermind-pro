import { describe, it, expect } from 'vitest'
import { runMonteCarloEquity, runMonteCarloEquityPostflop, randomHand } from '../poker'
import type { Card } from '@/types'

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit })

describe('poker.ts religado ao motor real', () => {
  it('AA vs KK pre-flop perto de 82,6%', () => {
    const r = runMonteCarloEquity([c('A', 'spades'), c('A', 'hearts')], ['KK'], 40_000)
    expect(r.equity).toBeGreaterThan(0.81)
    expect(r.equity).toBeLessThan(0.84)
  })

  it('river: AK vence AQ por kicker (antes dava empate)', () => {
    const board = [c('2', 'clubs'), c('7', 'diamonds'), c('9', 'hearts'), c('J', 'spades'), c('3', 'clubs')]
    const r = runMonteCarloEquityPostflop([c('A', 'spades'), c('K', 'diamonds')], board, ['AQo'], 500)
    // AQo tem combos que compartilham cartas; o que sobra perde sempre para AK
    expect(r.totalRuns).toBeGreaterThan(0)
    expect(r.equity).toBe(1)
    expect(r.tiePct).toBe(0)
  })

  it('range vazio devolve 50% sem rodadas', () => {
    const r = runMonteCarloEquity([c('A', 'spades'), c('A', 'hearts')], [], 100)
    expect(r.totalRuns).toBe(0)
    expect(r.equity).toBe(0.5)
  })

  it('randomHand pondera por combos: pares saem ~5,9% das vezes, nao 7,7%', () => {
    let pairs = 0
    const n = 60_000
    for (let i = 0; i < n; i++) {
      const h = randomHand()
      if (h[0] === h[1]) pairs++
    }
    expect(pairs / n).toBeGreaterThan(0.05)
    expect(pairs / n).toBeLessThan(0.068)
  })
})
