import { describe, it, expect } from 'vitest'
import { handToText } from '../handText'
import type { SavedHand } from '@/types'

const hand: SavedHand = {
  id: 'h1', title: 'BTN vs BB', date: new Date('2026-09-01T12:00:00').getTime(),
  heroCards: [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'diamonds' }],
  board: [{ rank: 'Q', suit: 'spades' }, { rank: 'J', suit: 'clubs' }, { rank: '2', suit: 'hearts' }],
  players: [{ name: 'Você', position: 'BTN', stack: 100, isHero: true }, { name: 'Lia', position: 'BB', stack: 100, isHero: false }],
  actions: [
    { player: 'Você', action: 'raise', amount: 2.5, street: 'preflop', timestamp: 0 },
    { player: 'Lia', action: 'call', amount: 2.5, street: 'preflop', timestamp: 1 },
    { player: 'Lia', action: 'check', street: 'flop', timestamp: 2 },
  ],
  pot: 5.5, result: 2.5, notes: 'bom blefe', tags: ['blefe'], mode: 'Cash 6-max',
  decisions: [{ street: 'flop', took: 'check', best: 'raise', grade: 'mistake', evLossBB: 1.2, approx: true, tag: 'X', explain: [] }],
}

describe('texto da mao', () => {
  it('traz cartas, board, acoes por rua, avaliacao e anotacoes', () => {
    const t = handToText(hand)
    expect(t).toContain('Herói: Ah Kd')
    expect(t).toContain('Board: Qs Jc 2h')
    expect(t).toContain('Pote: 5.5 bb | Resultado: +2.5 bb')
    expect(t).toMatch(/Pré-flop\n {2}Você: raise 2\.5 bb/)
    expect(t).toMatch(/Flop\n {2}Lia: check/)
    expect(t).toContain('Erro, perda de 1.2 bb [estimativa]')
    expect(t).toContain('Anotações: bom blefe')
    expect(t).toContain('#blefe')
  })

  it('mao sem decisoes nem notas nao inventa secoes', () => {
    const t = handToText({ ...hand, decisions: undefined, notes: '', tags: [], mode: undefined })
    expect(t).not.toContain('Avaliação do coach')
    expect(t).not.toContain('Anotações')
    expect(t).not.toContain('Modo:')
  })
})
