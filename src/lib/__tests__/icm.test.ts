import { describe, it, expect } from 'vitest'
import { calculateICM } from '../poker'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('calculateICM', () => {
  it('stacks iguais dividem o premio igualmente', () => {
    const v = calculateICM([100, 100, 100], [0.5, 0.3, 0.2])
    for (const x of v) expect(x).toBeCloseTo(1 / 3, 9)
  })

  it('o valor de todos soma o total dos premios', () => {
    expect(sum(calculateICM([90, 54, 12], [0.65, 0.35, 0]))).toBeCloseTo(1, 9)
  })

  it('stack zero nao gera NaN: o jogador fica em ultimo e leva o premio da ultima colocacao', () => {
    const v = calculateICM([0, 100, 100], [0.5, 0.3, 0.2])
    expect(v.every(Number.isFinite)).toBe(true)
    expect(v[0]).toBeCloseTo(0.2, 9) // sempre ultimo
    expect(v[1]).toBeCloseTo(0.4, 9)
    expect(v[2]).toBeCloseTo(0.4, 9)
    expect(sum(v)).toBeCloseTo(1, 9)
  })

  it('stack zero com premio zero na ultima colocacao vale zero', () => {
    const v = calculateICM([0, 218, 72], [0.65, 0.35, 0])
    expect(v[0]).toBe(0)
    expect(sum(v)).toBeCloseTo(1, 9)
  })

  it('dois jogadores zerados dividem os premios que sobram', () => {
    const v = calculateICM([0, 0, 100], [0.5, 0.3, 0.2])
    expect(v[2]).toBeCloseTo(0.5, 9)
    expect(v[0]).toBeCloseTo(0.25, 9)
    expect(v[1]).toBeCloseTo(0.25, 9)
  })
})
