import { describe, it, expect } from 'vitest'
import { DRAW_KINDS, QUESTION_TYPES, makeQuestion, type Level, type QType } from '../odds/questions'
import { categoryAny, countOuts } from '../odds/outs'
import { mulberry32 } from '../cards'

const SEEDS = Array.from({ length: 60 }, (_, i) => i + 1)
const LEVELS: Level[] = [1, 2, 3]
const TYPES = QUESTION_TYPES.map((t) => t.id) as QType[]

describe('perguntas de odds: estrutura', () => {
  for (const type of TYPES) {
    for (const level of LEVELS) {
      it(`${type} nivel ${level}: opcoes distintas, uma correta, textos sem travessao`, () => {
        for (const seed of SEEDS) {
          const q = makeQuestion(type, level, mulberry32(seed))
          expect(q.type).toBe(type)
          expect(q.level).toBe(level)
          expect(q.options.length).toBeGreaterThanOrEqual(2)
          expect(new Set(q.options).size).toBe(q.options.length)
          expect(q.correct).toBeGreaterThanOrEqual(0)
          expect(q.correct).toBeLessThan(q.options.length)
          const text = [q.prompt, ...q.facts, ...q.options, q.explain].join(' ')
          expect(text).not.toMatch(/[–—]/)
          expect(q.explain.length).toBeGreaterThan(10)
        }
      })
    }
  }

  it('a mesma semente gera a mesma pergunta', () => {
    for (const type of TYPES) {
      expect(makeQuestion(type, 2, mulberry32(7))).toEqual(makeQuestion(type, 2, mulberry32(7)))
    }
  })

  it('as respostas certas nao ficam sempre na mesma posicao', () => {
    const idx = new Set(SEEDS.map((s) => makeQuestion('outs', 1, mulberry32(s)).correct))
    expect(idx.size).toBeGreaterThan(1)
  })
})

describe('perguntas de outs: a resposta e contada, nao decorada', () => {
  it('cada tipo de draw bate com o numero de livro, contado carta a carta', () => {
    for (const kind of DRAW_KINDS) {
      for (const seed of SEEDS) {
        const spot = kind.spot('flop', mulberry32(seed))
        expect(countOuts(spot.hole, spot.board, kind.minCat)).toBe(kind.outs)
        expect(categoryAny([...spot.hole, ...spot.board])).toBe(kind.baseCat)
        expect(spot.board.length).toBe(3)
        const cards = [...spot.hole, ...spot.board]
        expect(new Set(cards).size).toBe(cards.length)
      }
    }
  })

  it('no turn o draw continua valendo o mesmo numero de outs', () => {
    for (const kind of DRAW_KINDS) {
      for (const seed of SEEDS) {
        const spot = kind.spot('turn', mulberry32(seed))
        expect(spot.board.length).toBe(4)
        expect(countOuts(spot.hole, spot.board, kind.minCat)).toBe(kind.outs)
      }
    }
  })

  it('o numero de outs da pergunta e a opcao correta', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const q = makeQuestion('outs', level, mulberry32(seed))
        expect(Number(q.options[q.correct])).toBe(q.meta.outs)
        expect(q.hole && q.board).toBeTruthy()
      }
    }
  })

  it('o nivel 1 so usa os draws basicos no flop; o nivel 3 traz combos e turn', () => {
    const l1 = SEEDS.map((s) => makeQuestion('outs', 1, mulberry32(s)))
    expect(l1.every((q) => q.meta.street === 'flop')).toBe(true)
    expect(l1.every((q) => [9, 8, 6].includes(q.meta.outs))).toBe(true)
    const l3 = SEEDS.map((s) => makeQuestion('outs', 3, mulberry32(s)))
    expect(l3.some((q) => q.meta.outs === 15 || q.meta.outs === 12)).toBe(true)
    expect(l3.some((q) => q.meta.street === 'turn')).toBe(true)
  })
})

describe('perguntas de regra do 2 e 4', () => {
  it('flop vale 4% por out e turn vale 2%', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const q = makeQuestion('rule', level, mulberry32(seed))
        const mult = q.meta.street === 'flop' ? 4 : 2
        expect(Number(q.options[q.correct].replace('%', ''))).toBe(q.meta.outs * mult)
        expect(q.options.every((o) => /^\d+%$/.test(o))).toBe(true)
      }
    }
  })
})

describe('perguntas de pot odds', () => {
  it('a equity necessaria e aposta / (pote + aposta + aposta), arredondada', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const q = makeQuestion('potodds', level, mulberry32(seed))
        const { pot, bet } = q.meta
        expect(Number(q.options[q.correct].replace('%', ''))).toBe(Math.round((bet! / (pot! + 2 * bet!)) * 100))
        expect(q.options.every((o) => /^\d+%$/.test(o))).toBe(true)
      }
    }
  })

  it('o nivel 1 usa meio pote e pote cheio (25% e 33%)', () => {
    for (const seed of SEEDS) {
      const q = makeQuestion('potodds', 1, mulberry32(seed))
      expect(['25%', '33%']).toContain(q.options[q.correct])
    }
  })
})

describe('perguntas de decisao', () => {
  it('paga quando a equity bate a necessaria, com folga de pelo menos 4 pontos', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const q = makeQuestion('decision', level, mulberry32(seed))
        const { outs, street, pot, bet } = q.meta
        const rule = outs * (street === 'flop' ? 4 : 2)
        const needed = (bet! / (pot! + 2 * bet!)) * 100
        const pays = rule >= needed
        expect(q.options[q.correct]).toBe(pays ? 'Pagar' : 'Largar')
        expect(Math.abs(rule - needed)).toBeGreaterThanOrEqual(4)
        expect(q.options).toEqual(['Pagar', 'Largar'])
      }
    }
  })

  it('os dois resultados aparecem (nao e sempre pagar nem sempre largar)', () => {
    const answers = new Set(SEEDS.map((s) => {
      const q = makeQuestion('decision', 2, mulberry32(s))
      return q.options[q.correct]
    }))
    expect(answers.size).toBe(2)
  })
})
