import { describe as suite, it, expect } from 'vitest'
import { evaluate, categoryOf, HAND_CATEGORY as H, describe as describeHand } from '../evaluator'
import { parseCards, mulberry32, drawCards } from '../cards'

const ev = (s: string) => evaluate(parseCards(s))

suite('evaluator: ordenacao de categorias', () => {
  it('cada categoria vence a inferior', () => {
    const hands = [
      '2c 4d 6h 8s Tc Kd 3h',          // carta alta
      'Ac Ad 4h 8s Tc Kd 3h',          // par
      'Ac Ad 4h 4s Tc Kd 3h',          // dois pares
      'Ac Ad Ah 8s Tc Kd 3h',          // trinca
      '5c 6d 7h 8s 9c Kd 2h',          // sequencia
      '2c 5c 9c Jc Kc 3d 4h',          // flush
      'Ac Ad Ah Ks Kc 2d 3h',          // full house
      'Ac Ad Ah As Kc 2d 3h',          // quadra
      '5c 6c 7c 8c 9c Kd 2h',          // straight flush
    ].map(ev)
    hands.forEach((h, i) => expect(categoryOf(h)).toBe(i))
    for (let i = 1; i < hands.length; i++) expect(hands[i]).toBeGreaterThan(hands[i - 1])
  })

  it('wheel A-5 e a menor sequencia e perde para 6 alto', () => {
    const wheel = ev('Ac 2d 3h 4s 5c Kd 9h')
    const six = ev('2c 3d 4h 5s 6c Kd 9h')
    expect(categoryOf(wheel)).toBe(H.STRAIGHT)
    expect(six).toBeGreaterThan(wheel)
  })

  it('steel wheel e royal flush', () => {
    expect(categoryOf(ev('Ac 2c 3c 4c 5c Kd 9h'))).toBe(H.STRAIGHT_FLUSH)
    expect(describeHand(ev('Ac Kc Qc Jc Tc 2d 3h'))).toBe('Royal flush')
  })
})

suite('evaluator: kickers (o bug do app antigo)', () => {
  it('AK vs AQ em board seco: kicker decide', () => {
    const board = '2c 7d 9h Js 3c'
    expect(ev(`As Kd ${board}`)).toBeGreaterThan(ev(`Ah Qd ${board}`))
  })

  it('carta alta: K alto vence Q alto mesmo sem par', () => {
    const board = '2c 5d 8h Js 3c'
    expect(ev(`Kd 9s ${board}`)).toBeGreaterThan(ev(`Qd 9h ${board}`))
  })

  it('dois pares: kicker do board e o terceiro par', () => {
    // pares KK 77 33: o kicker e o maior entre A... aqui Q
    const a = ev('Kc Kd 7h 7s 3c 3d Qh')
    const b = ev('Kc Kd 7h 7s 3c 3d 2h')
    expect(a).toBeGreaterThan(b)
  })

  it('board joga: empate exato', () => {
    const board = 'Ac Kd Qh Js Tc' // sequencia no board
    expect(ev(`2c 3d ${board}`)).toBe(ev(`4h 5s ${board}`))
  })

  it('full house: trinca maior vence; segunda trinca serve de par', () => {
    expect(ev('Ac Ad Ah 2s 2c 5d 7h')).toBeGreaterThan(ev('Kc Kd Kh As Ac 5d 7h'))
    expect(describeHand(ev('Kc Kd Kh 9s 9c 9d 2h'))).toBe('Full house, K cheio de 9')
  })
})

suite('evaluator: contagem das 2.598.960 maos de 5 cartas', () => {
  it('bate com as frequencias classicas', () => {
    const counts = new Array(9).fill(0)
    for (let a = 0; a < 48; a++)
      for (let b = a + 1; b < 49; b++)
        for (let c = b + 1; c < 50; c++)
          for (let d = c + 1; d < 51; d++)
            for (let e = d + 1; e < 52; e++)
              counts[evaluate([a, b, c, d, e]) >> 20]++
    expect(counts).toEqual([1302540, 1098240, 123552, 54912, 10200, 5108, 3744, 624, 40])
  }, 120_000)
})

/** Forca bruta: melhor mao de 5 dentre 7. */
function bruteBest(cards: number[]): number {
  let best = -1
  for (let i = 0; i < 7; i++)
    for (let j = i + 1; j < 7; j++) {
      const five = cards.filter((_, k) => k !== i && k !== j)
      best = Math.max(best, evaluate(five))
    }
  return best
}

suite('evaluator: fuzz 7 cartas vs forca bruta', () => {
  it('100k maos aleatorias', () => {
    const rng = mulberry32(12345)
    for (let n = 0; n < 100_000; n++) {
      const cards = drawCards(7, [], rng)
      expect(evaluate(cards)).toBe(bruteBest(cards))
    }
  }, 120_000)
})
