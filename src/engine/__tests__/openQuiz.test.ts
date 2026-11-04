import { describe, it, expect } from 'vitest'
import { applyAction, createGame, legalActions, startHand } from '../game/reducer'
import { buildOpenQuiz, isOpenQuizSpot, scoreOpenQuiz, shouldAskOpenQuiz } from '../coach/openQuiz'
import { mulberry32, RANK_CHARS } from '../cards'
import { getOpenRaiseRange } from '@/data/ranges'
import type { GameState } from '../game/types'

const card = (rank: string, suit: number) => RANK_CHARS.indexOf(rank) * 4 + suit

/** Mesa de 6 com o heroi (assento 0) e o botao escolhido; o heroi recebe as cartas dadas. */
function table(button: number, hero: [number, number], stack = 200): GameState {
  const players = ['Hero', 'B1', 'B2', 'B3', 'B4', 'B5'].map((n, i) => ({ name: n, isHero: i === 0, profile: 'tag', stack }))
  return startHand(createGame(players, { sb: 1, bb: 2, ante: 0 }, button), mulberry32(3), { holes: { 0: hero } })
}

/** Os assentos antes do heroi agem (fold, ou a acao dada ao primeiro) ate chegar a vez dele. */
function untilHero(g: GameState, first: 'fold' | 'raise' | 'call' = 'fold'): GameState {
  let i = 0
  while (!g.over && !g.seats[g.toAct].isHero) {
    const la = legalActions(g)
    const act = i++ === 0 && first === 'raise' ? { type: 'raise' as const, to: la.minTo } : i === 1 && first === 'call' ? { type: 'call' as const } : la.canCheck ? { type: 'check' as const } : { type: 'fold' as const }
    g = applyAction(g, act)
  }
  return g
}

const AKS: [number, number] = [card('A', 0), card('K', 0)]
const SEVEN_TWO: [number, number] = [card('7', 0), card('2', 1)]

describe('isOpenQuizSpot', () => {
  it('dispara no primeiro a agir, sem aumento antes, com stack fundo', () => {
    expect(isOpenQuizSpot(table(3, AKS))).toBe(true) // heroi e o UTG
  })

  it('nao dispara com aumento antes (a decisao e outra: defesa ou 3-bet)', () => {
    // botao 5: o heroi e o CO... o UTG (assento 3) aumenta antes dele
    const g = untilHero(table(0, AKS), 'raise')
    expect(g.toAct).toBe(0)
    expect(isOpenQuizSpot(g)).toBe(false)
  })

  it('nao dispara na opcao do BB (nao ha o que pagar)', () => {
    const g = untilHero(table(4, AKS), 'call') // heroi e o BB e um limper entrou
    expect(g.seats[g.toAct].isHero).toBe(true)
    expect(legalActions(g).canCall).toBe(false)
    expect(isOpenQuizSpot(g)).toBe(false)
  })

  it('nao dispara com 12bb ou menos (e spot de push ou fold)', () => {
    expect(isOpenQuizSpot(table(3, AKS, 24))).toBe(false) // 12bb
    expect(isOpenQuizSpot(table(3, AKS, 30))).toBe(true) // 15bb
  })

  it('nao dispara fora do pre-flop nem quando nao e a vez do heroi', () => {
    const g = table(0, AKS) // o UTG e o assento 3, nao o heroi
    expect(isOpenQuizSpot(g)).toBe(false)
  })
})

describe('buildOpenQuiz e scoreOpenQuiz', () => {
  it('o gabarito vem do range de abertura da posicao', () => {
    const inQ = buildOpenQuiz(table(3, AKS))!
    expect(inQ).toMatchObject({ hand: 'AKs', pos: 'UTG', format: '6max', inRange: true, key: 'open:6max:UTG:AKs' })
    expect(inQ.range).toEqual(getOpenRaiseRange('6max', 'UTG'))
    const outQ = buildOpenQuiz(table(3, SEVEN_TWO))!
    expect(outQ).toMatchObject({ hand: '72o', inRange: false })
  })

  it('acerta quando a resposta bate com o range e erra nos dois sentidos com etiqueta propria', () => {
    const q = buildOpenQuiz(table(3, AKS))!
    expect(scoreOpenQuiz(q, true)).toMatchObject({ correct: true, grade: 'best', tag: '' })
    expect(scoreOpenQuiz(q, false)).toMatchObject({ correct: false, grade: 'mistake', tag: 'OPEN_TOO_TIGHT' })
    const bad = buildOpenQuiz(table(3, SEVEN_TWO))!
    expect(scoreOpenQuiz(bad, true)).toMatchObject({ correct: false, tag: 'OPEN_TOO_WIDE' })
    expect(scoreOpenQuiz(bad, false)).toMatchObject({ correct: true })
  })
})

describe('shouldAskOpenQuiz: frequencia', () => {
  const g = table(3, AKS)
  const none = new Set<string>()

  it('desligado nunca pergunta e sempre pergunta sempre', () => {
    expect(shouldAskOpenQuiz(g, 'off', none)).toBe(false)
    expect(shouldAskOpenQuiz(g, 'all', none)).toBe(true)
  })

  it('as vezes: mao vencida no SM2 e sempre perguntada; as outras, em maos alternadas', () => {
    expect(shouldAskOpenQuiz(g, 'some', new Set(['open:6max:UTG:AKs']))).toBe(true)
    const odd = { ...g, handNumber: 1 }
    const even = { ...g, handNumber: 2 }
    expect(shouldAskOpenQuiz(odd, 'some', none)).toBe(false)
    expect(shouldAskOpenQuiz(even, 'some', none)).toBe(true)
  })
})
