import { describe, it, expect } from 'vitest'
import { countOuts, categoryAny } from '../odds/outs'
import { HAND_CATEGORY } from '../evaluator'
import { parseCards } from '../cards'

const hand = (s: string) => parseCards(s) as [number, number]
const board = (s: string) => parseCards(s)
const { PAIR, TRIPS, STRAIGHT, FLUSH } = HAND_CATEGORY

describe('categoryAny: categoria com 4 cartas ou mais', () => {
  it('reconhece par, dois pares, trinca e quadra com poucas cartas', () => {
    expect(categoryAny(parseCards('As Kd'))).toBe(0)
    expect(categoryAny(parseCards('As Ad'))).toBe(PAIR)
    expect(categoryAny(parseCards('As Ad Kc Kd'))).toBe(HAND_CATEGORY.TWO_PAIR)
    expect(categoryAny(parseCards('As Ad Ac 2d'))).toBe(TRIPS)
    expect(categoryAny(parseCards('As Ad Ac Ah'))).toBe(HAND_CATEGORY.QUADS)
  })
  it('com 5 ou mais cartas usa o avaliador', () => {
    expect(categoryAny(parseCards('9s 8s 7s 6s 5s'))).toBe(HAND_CATEGORY.STRAIGHT_FLUSH)
  })
})

describe('countOuts: os numeros de livro', () => {
  it('flush draw: 9 outs', () => {
    expect(countOuts(hand('As Ks'), board('2s 7s 9h'), FLUSH)).toBe(9)
  })
  it('sequencia aberta (OESD): 8 outs', () => {
    expect(countOuts(hand('Jd 9c'), board('8h Ts 2c'), STRAIGHT)).toBe(8)
  })
  it('gutshot: 4 outs', () => {
    expect(countOuts(hand('Jd 8c'), board('9h 7s 2c'), STRAIGHT)).toBe(4)
  })
  it('duas overcards: 6 outs para o par', () => {
    expect(countOuts(hand('As Kd'), board('9h 5c 2d'), PAIR)).toBe(6)
  })
  it('par de mao para a trinca: 2 outs', () => {
    expect(countOuts(hand('9s 9d'), board('Kc 5h 2d'), TRIPS)).toBe(2)
  })
  it('flush draw + sequencia aberta: 15 outs', () => {
    expect(countOuts(hand('Qh Jh'), board('Th 9h 2c'), STRAIGHT)).toBe(15)
  })
  it('flush draw + gutshot: 12 outs', () => {
    // gutshot: so a dama (4); flush: 9 copas, e a dama de copas ja esta nos dois grupos
    expect(countOuts(hand('Kh Jh'), board('Th 9h 2c'), STRAIGHT)).toBe(12)
  })
})

describe('countOuts: nao conta o que so melhora o board', () => {
  it('carta que so forma o par do board nao e out', () => {
    // heroi A K; board 9 5 5: um 9 faz dois pares para o heroi E para qualquer um (so o board)
    const withNine = countOuts(hand('As Kd'), board('9h 5c 5d'), HAND_CATEGORY.TWO_PAIR)
    // so A (3) e K (3) melhoram a mao do heroi para dois pares
    expect(withNine).toBe(6)
  })
  it('no river nao ha outs', () => {
    expect(countOuts(hand('As Ks'), board('2s 7s 9h Jc 3d'), FLUSH)).toBe(0)
  })
})
