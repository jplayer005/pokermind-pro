import { describe, it, expect } from 'vitest'
import {
  OPEN_RANKING, OPEN_TARGETS_6MAX, OPEN_TARGETS_9MAX, THREEBET_TARGETS, rangeByCoverage, threeBetByCoverage,
} from '@/data/openRanking'
import { DRILL_QUESTIONS, THREE_BET_RANGES, getOpenRaiseRange } from '@/data/ranges'
import { comboCount } from '../ranges/painter'
import { generateHandGrid } from '@/lib/poker'
import type { Position } from '@/types'

const GRID = new Set(generateHandGrid().flat())
const cov = (hs: readonly string[]) => hs.reduce((a, h) => a + comboCount(h), 0) / 1326

describe('ranking de abertura', () => {
  it('tem as 169 maos, sem repeticao, todas validas', () => {
    expect(OPEN_RANKING).toHaveLength(169)
    expect(new Set(OPEN_RANKING).size).toBe(169)
    for (const h of OPEN_RANKING) expect(GRID.has(h)).toBe(true)
  })

  it('as melhores maos vem primeiro e as piores por ultimo', () => {
    expect(OPEN_RANKING.slice(0, 3)).toEqual(['AA', 'KK', 'QQ'])
    expect(OPEN_RANKING.indexOf('AKs')).toBeLessThan(OPEN_RANKING.indexOf('76s'))
    expect(OPEN_RANKING.indexOf('76s')).toBeLessThan(OPEN_RANKING.indexOf('72o'))
    expect(OPEN_RANKING.indexOf('72o')).toBeGreaterThan(150)
  })

  it('a cobertura gerada fica a meia mao do alvo e cresce com ele', () => {
    for (const t of [0.05, 0.1, 0.25, 0.5]) expect(Math.abs(cov(rangeByCoverage(t)) - t)).toBeLessThan(0.02)
    expect(rangeByCoverage(0.1).length).toBeLessThan(rangeByCoverage(0.3).length)
    expect(rangeByCoverage(0)).toEqual([])
  })
})

describe('ranges de abertura por posicao', () => {
  const order: Position[] = ['UTG', 'HJ', 'CO', 'BTN']

  it('cada posicao abre a cobertura-alvo', () => {
    for (const [p, t] of Object.entries(OPEN_TARGETS_6MAX)) {
      expect(Math.abs(cov(getOpenRaiseRange('6max', p as Position)) - (t as number))).toBeLessThan(0.02)
    }
    for (const [p, t] of Object.entries(OPEN_TARGETS_9MAX)) {
      expect(Math.abs(cov(getOpenRaiseRange('9max', p as Position)) - (t as number))).toBeLessThan(0.02)
    }
  })

  it('posicao mais tardia abre tudo que a anterior abre e mais (ranges aninhados)', () => {
    for (let i = 1; i < order.length; i++) {
      const early = new Set(getOpenRaiseRange('6max', order[i - 1]))
      const late = new Set(getOpenRaiseRange('6max', order[i]))
      for (const h of early) expect(late.has(h)).toBe(true)
      expect(late.size).toBeGreaterThan(early.size)
    }
  })

  it('o UTG abre todos os pares altos e os suited fortes', () => {
    const utg = new Set(getOpenRaiseRange('6max', 'UTG'))
    for (const h of ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo', 'KQs']) expect(utg.has(h)).toBe(true)
    expect(utg.has('72o')).toBe(false)
  })

  it('na mesa de 9 as posicoes iniciais sao mais apertadas que na de 6', () => {
    expect(cov(getOpenRaiseRange('9max', 'UTG'))).toBeLessThan(cov(getOpenRaiseRange('6max', 'UTG')))
    expect(cov(getOpenRaiseRange('9max', 'UTG'))).toBeLessThan(cov(getOpenRaiseRange('9max', 'LJ')))
  })
})

describe('ranges de 3-bet', () => {
  it('cada posicao da 3-bet na cobertura-alvo e sempre com as maos premium', () => {
    for (const [p, t] of Object.entries(THREEBET_TARGETS)) {
      const r = THREE_BET_RANGES[p as Position]
      expect(Math.abs(cov(r) - (t as number))).toBeLessThan(0.02)
      for (const h of ['AA', 'KK', 'QQ', 'AKs', 'AKo']) expect(r).toContain(h)
    }
  })

  it('o 3-bet e mais largo no botao e nos blinds que no UTG, e inclui blefes com suited', () => {
    expect(cov(THREE_BET_RANGES.BTN)).toBeGreaterThan(cov(THREE_BET_RANGES.UTG))
    expect(cov(THREE_BET_RANGES.BB)).toBeGreaterThan(cov(THREE_BET_RANGES.CO))
    expect(THREE_BET_RANGES.BTN).toContain('A5s')
    expect(threeBetByCoverage(0.06).includes('A5s')).toBe(true)
  })
})

describe('perguntas de treino coerentes com os ranges', () => {
  it('as perguntas de abertura seguem o range da posicao', () => {
    const qs = DRILL_QUESTIONS.filter((q) => q.scenario === 'open_raise' && q.position !== 'BB' && q.heroStack >= 80)
    expect(qs.length).toBeGreaterThan(10)
    for (const q of qs) {
      const inRange = getOpenRaiseRange('6max', q.position).includes(q.hand)
      expect(q.correctAction).toBe(inRange ? 'raise' : 'fold')
    }
  })

  it('as perguntas de 3-bet seguem o range de 3-bet da posicao', () => {
    const qs = DRILL_QUESTIONS.filter((q) => q.scenario === '3bet' && q.heroStack >= 80)
    expect(qs.length).toBeGreaterThan(5)
    for (const q of qs) {
      const inRange = (THREE_BET_RANGES[q.position] ?? []).includes(q.hand)
      expect(q.correctAction === '3bet').toBe(inRange)
    }
  })

  it('as explicacoes geradas nas respostas trocadas nao usam travessao', () => {
    const generated = DRILL_QUESTIONS.filter((q) => q.explanation.includes('deste app'))
    expect(generated.length).toBeGreaterThan(0)
    for (const q of generated) expect(q.explanation).not.toMatch(/[–—]/)
  })
})
