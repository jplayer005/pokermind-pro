import { describe, it, expect } from 'vitest'
import {
  createGame, startHand, applyAction, legalActions, positionsBySeat, allInAction, potTotal,
} from '../game/reducer'
import { decideBot } from '../bots/policy'
import { pickProfiles } from '../bots/profiles'
import { mulberry32, parseCards } from '../cards'
import type { GameState, PlayerInit } from '../game/types'

const cfg = { sb: 1, bb: 2, ante: 0 }
const players = (stacks: number[]): PlayerInit[] =>
  stacks.map((stack, i) => ({ name: `P${i}`, profile: 'tag', stack, isHero: i === 0 }))

/** Forca as cartas e o baralho para uma mao deterministica. */
function rig(state: GameState, hole: string[], board: string): GameState {
  const s = { ...state, seats: state.seats.map((x) => ({ ...x })), deck: [...state.deck] }
  hole.forEach((h, i) => {
    if (h) s.seats[i].cards = parseCards(h) as [number, number]
  })
  // deck.pop() entrega do fim: coloca o board na ordem inversa
  s.deck = [...s.deck.filter((c) => !parseCards(board).includes(c)), ...parseCards(board).reverse()]
  return s
}

const act = (s: GameState, ...as: Parameters<typeof applyAction>[1][]) =>
  as.reduce((st, a) => applyAction(st, a), s)

describe('inicio de mao', () => {
  it('HU: o botao posta o SB e age primeiro no pre-flop', () => {
    const g = startHand(createGame(players([200, 200]), cfg, 0), mulberry32(1))
    const btn = g.button
    expect(g.seats[btn].bet).toBe(1)
    expect(g.seats[1 - btn].bet).toBe(2)
    expect(g.toAct).toBe(btn)
    expect(positionsBySeat(g)[btn]).toBe('BTN')
  })

  it('3+ jogadores: SB e BB a esquerda do botao, UTG age primeiro', () => {
    const g = startHand(createGame(players([200, 200, 200, 200]), cfg, 0), mulberry32(2))
    const b = g.button
    expect(g.seats[(b + 1) % 4].bet).toBe(1)
    expect(g.seats[(b + 2) % 4].bet).toBe(2)
    expect(g.toAct).toBe((b + 3) % 4)
  })

  it('o botao gira a cada mao', () => {
    let g = startHand(createGame(players([200, 200, 200]), cfg, 0), mulberry32(3))
    const b1 = g.button
    g = startHand(g, mulberry32(4))
    expect(g.button).toBe((b1 + 1) % 3)
  })

  it('ante entra no pote sem contar como aposta', () => {
    const g = startHand(createGame(players([200, 200, 200]), { sb: 1, bb: 2, ante: 1 }, 0), mulberry32(5))
    expect(potTotal(g)).toBe(3 + 3)
    expect(g.currentBet).toBe(2)
  })
})

describe('acoes legais', () => {
  it('raise minimo respeita o tamanho do ultimo aumento', () => {
    let g = startHand(createGame(players([200, 200, 200]), cfg, 0), mulberry32(6))
    expect(legalActions(g).minTo).toBe(4) // 2 + 2
    g = act(g, { type: 'raise', to: 10 }) // aumento de 8
    expect(legalActions(g).minTo).toBe(18) // 10 + 8
    expect(() => applyAction(g, { type: 'raise', to: 12 })).toThrow()
  })

  it('check com aposta a pagar e call sem nada a pagar sao ilegais', () => {
    const g = startHand(createGame(players([200, 200, 200]), cfg, 0), mulberry32(7))
    expect(() => applyAction(g, { type: 'check' })).toThrow()
    const g2 = act(g, { type: 'call' }, { type: 'call' }) // BB fica com a opcao
    expect(legalActions(g2).canCheck).toBe(true)
    expect(() => applyAction(g2, { type: 'call' })).toThrow()
  })

  it('all-in curto nao reabre a acao para quem ja agiu', () => {
    // 3 jogadores: A (200), B (200), C (short 15). Todos acima de C.
    let g = startHand(createGame(players([200, 200, 15]), cfg, 0), mulberry32(8))
    // leva a mao ate o flop com check-check para testar o bet
    const order: number[] = []
    // pre-flop: todos pagam 2
    while (g.street === 'preflop' && !g.over) {
      order.push(g.toAct)
      g = applyAction(g, legalActions(g).canCall ? { type: 'call' } : { type: 'check' })
    }
    expect(g.street).toBe('flop')
    const first = g.toAct
    g = applyAction(g, { type: 'raise', to: 10 }) // aposta de 10 (aumento cheio de 10)
    // jogador seguinte faz all-in curto: total 15 (aumento de 5 < 10)
    const second = g.toAct
    const shortStack = g.seats[second]
    if (shortStack.stack + shortStack.bet === 13) {
      g = applyAction(g, allInAction(g))
      // o primeiro (que ja apostou) nao pode reaumentar
      expect(g.seats[first].raiseLocked).toBe(true)
    }
    // invariante geral: raiseLocked nunca vem junto de canRaise
    if (!g.over && g.seats[g.toAct].raiseLocked) expect(legalActions(g).canRaise).toBe(false)
  })
})

describe('showdown e potes', () => {
  it('heads-up all-in: vencedor leva tudo e devolve a aposta nao paga', () => {
    let g = startHand(createGame(players([300, 100]), cfg, 0), mulberry32(9))
    g = rig(g, ['As Ah', 'Kd Kc'], '2c 7d 9h Js 3c')
    // hero=0 (300), vilao=1 (100); ambos all-in
    while (!g.over) {
      const la = legalActions(g)
      g = applyAction(g, la.canRaise ? allInAction(g) : la.canCall ? { type: 'call' } : { type: 'check' })
    }
    expect(g.result!.showdown).toBe(true)
    expect(g.result!.refund).toEqual({ seat: 0, amount: 200 })
    expect(g.seats[0].stack).toBe(400)
    expect(g.seats[1].stack).toBe(0)
    expect(g.result!.winners[0].handName).toContain('Par de A')
    expect(g.board).toHaveLength(5)
  })

  it('fold ate o fim: sem showdown e vencedor leva o pote', () => {
    let g = startHand(createGame(players([200, 200, 200]), cfg, 0), mulberry32(10))
    while (!g.over) g = applyAction(g, { type: 'fold' })
    expect(g.result!.showdown).toBe(false)
    expect(g.result!.net.reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('tres all-ins de stacks diferentes: side pots corretos', () => {
    let g = startHand(createGame(players([100, 300, 600]), cfg, 0), mulberry32(11))
    // seat0 melhor mao, seat1 segunda, seat2 pior
    g = rig(g, ['As Ah', 'Kd Kc', 'Qd Qc'], '2c 7d 9h Js 3c')
    while (!g.over) {
      const la = legalActions(g)
      g = applyAction(g, la.canRaise ? allInAction(g) : la.canCall ? { type: 'call' } : { type: 'check' })
    }
    // 0 ganha o principal (300), 1 ganha o side de 400, 2 recebe de volta 300 (nao pago)
    expect(g.seats.map((x) => x.stack)).toEqual([300, 400, 300])
  })

  it('empate: pote dividido', () => {
    let g = startHand(createGame(players([100, 100]), cfg, 0), mulberry32(12))
    g = rig(g, ['2c 3d', '4h 5s'], 'Ac Kd Qh Js Tc') // sequencia no board
    while (!g.over) {
      const la = legalActions(g)
      g = applyAction(g, la.canRaise ? allInAction(g) : la.canCall ? { type: 'call' } : { type: 'check' })
    }
    expect(g.seats.map((x) => x.stack)).toEqual([100, 100])
  })
})

describe('bots: soak', () => {
  it('500 maos bot x bot em 6-max: fichas conservadas e nenhuma acao ilegal', () => {
    const rng = mulberry32(2024)
    const profiles = pickProfiles(6, rng)
    let g = createGame(
      profiles.map((p, i) => ({ name: `B${i}`, profile: p, stack: 200 })),
      cfg,
      0,
    )
    const total = 6 * 200
    for (let h = 0; h < 500; h++) {
      // recompra estilo cash
      g = { ...g, seats: g.seats.map((s) => ({ ...s, stack: s.stack < cfg.bb ? 200 : s.stack })) }
      const before = g.seats.reduce((a, s) => a + s.stack, 0)
      g = startHand(g, rng)
      let guard = 0
      while (!g.over) {
        g = applyAction(g, decideBot(g, rng))
        if (++guard > 200) throw new Error('mao nao termina')
      }
      expect(g.seats.reduce((a, s) => a + s.stack, 0)).toBe(before)
      expect(g.result!.net.reduce((a, b) => a + b, 0)).toBe(0)
    }
    expect(total).toBeGreaterThan(0)
  }, 120_000)

  it('9-max, HU e 3-max tambem terminam sem erro', () => {
    for (const n of [2, 3, 9]) {
      const rng = mulberry32(n * 77)
      let g = createGame(
        pickProfiles(n, rng).map((p, i) => ({ name: `B${i}`, profile: p, stack: 200 })),
        { sb: 1, bb: 2, ante: n === 9 ? 1 : 0 },
        0,
      )
      for (let h = 0; h < 120; h++) {
        g = { ...g, seats: g.seats.map((s) => ({ ...s, stack: s.stack < 2 ? 200 : s.stack })) }
        g = startHand(g, rng)
        let guard = 0
        while (!g.over) {
          g = applyAction(g, decideBot(g, rng))
          if (++guard > 300) throw new Error('mao nao termina')
        }
      }
    }
  }, 120_000)
})
