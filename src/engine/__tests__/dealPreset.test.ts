import { describe, it, expect } from 'vitest'
import { createGame, startHand, applyAction } from '../game/reducer'
import { mulberry32, parseCards } from '../cards'
import type { GameState, PlayerInit } from '../game/types'

const cfg = { sb: 1, bb: 2, ante: 0 }
const mk = (n: number): PlayerInit[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, profile: 'tag', stack: 200, isHero: i === 0 }))
const fresh = (n = 2) => createGame(mk(n), cfg, 0)
const two = (s: string) => parseCards(s) as [number, number]

describe('startHand com preset de cartas', () => {
  it('fixa as cartas do heroi e deixa as dos outros assentos sairem do baralho', () => {
    const g = startHand(fresh(3), mulberry32(5), { holes: { 0: two('As Ks') } })
    expect(g.seats[0].cards).toEqual(two('As Ks'))
    const all = g.seats.flatMap((s) => s.cards ?? [])
    expect(new Set(all).size).toBe(all.length) // nenhuma carta repetida
    expect(g.deck.some((c) => all.includes(c))).toBe(false) // e nenhuma ficou no baralho
  })

  it('o board fixo sai nas ruas certas e o resto continua aleatorio', () => {
    let g = startHand(fresh(2), mulberry32(5), { holes: { 0: two('Ac Kc') }, board: parseCards('Kd 7h 2s') })
    // HU: o botao (assento 0) paga, o BB checa; o flop sai
    g = applyAction(g, { type: 'call' })
    g = applyAction(g, { type: 'check' })
    expect(g.street).toBe('flop')
    expect(g.board).toEqual(parseCards('Kd 7h 2s'))
    // turn e river vem do baralho e nao repetem nenhuma carta fixa
    g = applyAction(g, { type: 'check' })
    g = applyAction(g, { type: 'check' })
    expect(g.board.length).toBe(4)
    const seen = [...g.board, ...g.seats.flatMap((s) => s.cards ?? [])]
    expect(new Set(seen).size).toBe(seen.length)
  })

  it('cartas fixas do vilao tambem valem e o resto do baralho nao as repete', () => {
    const g = startHand(fresh(2), mulberry32(9), { holes: { 0: two('Ac Kc'), 1: two('7d 7s') }, board: parseCards('7h 2c 9d 4s 3h') })
    expect(g.seats[1].cards).toEqual(two('7d 7s'))
    const fixed = [...two('Ac Kc'), ...two('7d 7s'), ...parseCards('7h 2c 9d 4s 3h')]
    expect(g.deck.some((c) => fixed.includes(c))).toBe(true) // o board esta no fim do baralho, para sair em ordem
    expect(g.deck.filter((c) => fixed.includes(c)).length).toBe(5) // so o board, nenhuma carta de mao
  })

  it('sem preset (ou preset vazio) o resultado e o mesmo de sempre', () => {
    const a = startHand(fresh(3), mulberry32(11))
    const b = startHand(fresh(3), mulberry32(11), {})
    const c = startHand(fresh(3), mulberry32(11), undefined)
    expect(b.seats.map((s) => s.cards)).toEqual(a.seats.map((s) => s.cards))
    expect(c.deck).toEqual(a.deck)
    expect(b.deck).toEqual(a.deck)
  })

  it('cartas repetidas no preset sao erro de quem monta o cenario', () => {
    expect(() => startHand(fresh(2), mulberry32(1), { holes: { 0: two('As Ks') }, board: parseCards('As 7h 2s') })).toThrow(/repetid/i)
    expect(() => startHand(fresh(2), mulberry32(1), { holes: { 0: two('As Ks'), 1: two('Ks Qd') } })).toThrow(/repetid/i)
  })
})

describe('preset nao altera o estado de quem so le', () => {
  it('startHand nao muda o estado anterior', () => {
    const prev: GameState = fresh(2)
    const snap = JSON.stringify(prev)
    startHand(prev, mulberry32(3), { holes: { 0: two('As Ks') } })
    expect(JSON.stringify(prev)).toBe(snap)
  })
})
