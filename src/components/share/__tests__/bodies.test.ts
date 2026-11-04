import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HandReviewShareBody, ReplayShareBody, StatsShareBody } from '../bodies'

describe('corpos dos cartoes de compartilhar', () => {
  it('revisao da mao: mostra cartas do motor, board e perda so quando relevante', () => {
    const html = renderToStaticMarkup(
      h(HandReviewShareBody, {
        hero: [48, 44],
        board: [0, 5, 10],
        decisions: [
          { street: 'flop', gradeLabel: 'Erro', lossBB: 3.24, took: 'Pagar', best: 'Largar' },
          { street: 'turn', gradeLabel: 'Boa', lossBB: 0.02, took: 'Apostar', best: 'Apostar' },
        ],
      }),
    )
    expect(html).toContain('A♠')
    expect(html).toContain('-3.2 bb')
    expect(html).toContain('ref.: Largar')
    expect(html).not.toContain('-0.0 bb')
  })

  it('replayer: aceita cartas como objeto e agrupa as acoes por rua', () => {
    const html = renderToStaticMarkup(
      h(ReplayShareBody, {
        hero: [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'clubs' }],
        board: [],
        resultLine: 'Pote 10.0 bb',
        actions: [
          { street: 'preflop', player: 'Hero', text: 'raise 2.5 bb' },
          { street: 'flop', player: 'Vilao', text: 'bet 3 bb' },
        ],
      }),
    )
    expect(html).toContain('A♥')
    expect(html).toContain('K♣')
    expect(html).toContain('Hero raise 2.5 bb')
    expect(html).toContain('Vilao bet 3 bb')
  })

  it('numeros: destaque e blocos aparecem, e sem dados nao quebra', () => {
    const html = renderToStaticMarkup(h(StatsShareBody, { big: '3º', bigLabel: 'de 27', tiles: [{ label: 'Mãos', value: '41' }] }))
    expect(html).toContain('3º')
    expect(html).toContain('41')
    expect(renderToStaticMarkup(h(StatsShareBody, {}))).not.toContain('NaN')
  })
})
