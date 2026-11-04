import { describe, it, expect } from 'vitest'
import {
  OPEN_AVERAGE_TARGET, OPEN_RANKING, OPEN_TARGETS_6MAX, OPEN_TARGETS_9MAX, rangeByCoverage,
} from '@/data/openRanking'
import { DRILL_QUESTIONS, THREE_BET_RANGES, getOpenRaiseRange } from '@/data/ranges'
import { comboCount } from '../ranges/painter'
import { meanOpenCoverage, openCoverageRows } from '../ranges/coverage'
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

describe('meta do app: a media das aberturas de todas as posicoes fica entre 20% e 25%', () => {
  for (const format of ['6max', '9max'] as const) {
    it(`${format}: media entre 20% e 25%, com o BB contando zero`, () => {
      const mean = meanOpenCoverage(format)
      expect(mean).toBeGreaterThanOrEqual(OPEN_AVERAGE_TARGET.min)
      expect(mean).toBeLessThanOrEqual(OPEN_AVERAGE_TARGET.max)
      const rows = openCoverageRows(format)
      expect(rows[rows.length - 1]).toEqual({ position: 'BB', coverage: 0 })
    })

    it(`${format}: o UTG e a posicao que menos abre; o botao e o SB sao as que mais abrem`, () => {
      const open = openCoverageRows(format).filter((r) => r.position !== 'BB')
      const sorted = [...open].sort((a, b) => a.coverage - b.coverage)
      expect(sorted[0].position).toBe('UTG')
      expect(sorted.slice(-2).map((r) => r.position).sort()).toEqual(['BTN', 'SB'])
    })

    it(`${format}: da primeira posicao ao botao a abertura so cresce`, () => {
      const open = openCoverageRows(format).filter((r) => r.position !== 'BB' && r.position !== 'SB')
      for (let i = 1; i < open.length; i++) expect(open[i].coverage).toBeGreaterThanOrEqual(open[i - 1].coverage)
    })
  }

  it('cada posicao abre a cobertura-alvo configurada', () => {
    for (const [p, t] of Object.entries(OPEN_TARGETS_6MAX)) {
      expect(Math.abs(cov(getOpenRaiseRange('6max', p as Position)) - (t as number))).toBeLessThan(0.02)
    }
    for (const [p, t] of Object.entries(OPEN_TARGETS_9MAX)) {
      expect(Math.abs(cov(getOpenRaiseRange('9max', p as Position)) - (t as number))).toBeLessThan(0.02)
    }
  })
})

describe('ranges de abertura por posicao', () => {
  const order: Position[] = ['UTG', 'HJ', 'CO', 'BTN']

  it('posicao mais tardia abre tudo que a anterior abre e mais (ranges aninhados)', () => {
    for (let i = 1; i < order.length; i++) {
      const early = new Set(getOpenRaiseRange('6max', order[i - 1]))
      const late = new Set(getOpenRaiseRange('6max', order[i]))
      for (const h of early) expect(late.has(h)).toBe(true)
      expect(late.size).toBeGreaterThan(early.size)
    }
  })

  it('o UTG abre os pares altos e os suited fortes e nao abre lixo', () => {
    const utg = new Set(getOpenRaiseRange('6max', 'UTG'))
    for (const h of ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AKo', 'KQs']) expect(utg.has(h)).toBe(true)
    expect(utg.has('72o')).toBe(false)
  })

  it('na mesa de 9 o UTG e mais apertado que na de 6', () => {
    expect(cov(getOpenRaiseRange('9max', 'UTG'))).toBeLessThan(cov(getOpenRaiseRange('6max', 'UTG')))
    expect(cov(getOpenRaiseRange('9max', 'UTG'))).toBeLessThan(cov(getOpenRaiseRange('9max', 'LJ')))
  })
})

describe('3-bet: nao foi alterado pela calibracao', () => {
  it('continua apertado: do UTG ao BB entre 2% e 8% das maos, sempre com as premium', () => {
    for (const p of ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as Position[]) {
      const r = THREE_BET_RANGES[p]
      expect(cov(r)).toBeGreaterThan(0.02)
      expect(cov(r)).toBeLessThan(0.08)
      for (const h of ['AA', 'KK', 'QQ', 'AKs', 'AKo']) expect(r).toContain(h)
    }
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

  it('as explicacoes geradas nas respostas trocadas nao usam travessao', () => {
    const generated = DRILL_QUESTIONS.filter((q) => q.explanation.includes('deste app'))
    for (const q of generated) expect(q.explanation).not.toMatch(/[–—]/)
  })
})
