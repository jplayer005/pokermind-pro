import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createGame, startHand, applyAction } from '../game/reducer'
import { gradeDecision } from '../coach/grade'
import { loadSpots } from '../spots'
import { mulberry32, parseCards } from '../cards'
import { decideBot } from '../bots/policy'
import { pickProfiles } from '../bots/profiles'
import { emptyHud, updateHud, pctOf, hudLine, type HudStats } from '../bots/hud'
import { toSavedHand } from '../game/replay'
import type { GameState, PlayerInit } from '../game/types'

const cfg = { sb: 1, bb: 2, ante: 0 }
const mk = (n: number, stackBB = 100): PlayerInit[] =>
  Array.from({ length: n }, (_, i) => ({ name: `P${i}`, profile: 'tag', stack: stackBB * 2 }))

/** Coloca cartas e baralho conhecidos. */
function rig(state: GameState, hole: Record<number, string>, board = '2c 7d 9h Js 3c'): GameState {
  const s = { ...state, seats: state.seats.map((x) => ({ ...x })), deck: [...state.deck] }
  for (const [i, h] of Object.entries(hole)) s.seats[Number(i)].cards = parseCards(h) as [number, number]
  const b = parseCards(board)
  s.deck = [...s.deck.filter((c) => !b.includes(c)), ...b.reverse()]
  return s
}

/** Mao em que o assento que age primeiro (UTG) e o heroi, com as cartas dadas. */
function heroFirstToAct(n: number, hero: string, stackBB = 100): GameState {
  let g = startHand(createGame(mk(n, stackBB), cfg, 0), mulberry32(11))
  const id = g.toAct
  g = rig(g, { [id]: hero })
  g.seats[id].isHero = true
  return g
}

const raise = (to: number) => ({ type: 'raise', to }) as const

beforeAll(async () => {
  await loadSpots()
})

describe('coach: pre-flop por ranges (stack normal)', () => {
  it('foldar 72o no UTG e certo', () => {
    const d = gradeDecision(heroFirstToAct(6, '7s 2d'), { type: 'fold' })
    expect(d.best).toBe('fold')
    expect(d.grade).toBe('best')
    expect(d.tag).toBe('')
  })

  it('abrir 72o no UTG e vazamento (largo demais)', () => {
    const d = gradeDecision(heroFirstToAct(6, '7s 2d'), raise(5))
    expect(['inaccuracy', 'mistake']).toContain(d.grade)
    expect(d.tag).toBe('PF_OPEN_UTG_TOO_LOOSE')
    expect(d.approx).toBe(false)
    expect(d.evLossBB).toBeNull()
  })

  it('foldar AA no UTG e erro grave (apertado demais)', () => {
    const d = gradeDecision(heroFirstToAct(6, 'As Ah'), { type: 'fold' })
    expect(d.grade).toBe('blunder')
    expect(d.tag).toBe('PF_OPEN_UTG_TOO_TIGHT')
  })

  it('abrir AA no UTG e a jogada de referencia', () => {
    const d = gradeDecision(heroFirstToAct(6, 'As Ah'), raise(5))
    expect(d.grade).toBe('best')
  })

  it('a explicacao cita a mao e a posicao', () => {
    const d = gradeDecision(heroFirstToAct(6, '7s 2d'), { type: 'fold' })
    expect(d.explain.join(' ')).toContain('72o')
    expect(d.explain.join(' ')).toContain('UTG')
  })
})

describe('coach: stack curto usa os spots push/fold', () => {
  it('shove 72o no UTG com 10bb e erro; AA e correto', () => {
    const bad = gradeDecision(heroFirstToAct(6, '7s 2d', 10), raise(20))
    expect(['mistake', 'blunder']).toContain(bad.grade)
    expect(bad.tag).toBe('PF_PUSH_UTG_10BB')
    const good = gradeDecision(heroFirstToAct(6, 'As Ah', 10), raise(20))
    expect(good.grade).toBe('best')
    expect(good.tag).toBe('')
  })

  it('fold com AA e 10bb e erro grave e a explicacao vem do solver', () => {
    const d = gradeDecision(heroFirstToAct(6, 'As Ah', 10), { type: 'fold' })
    expect(d.grade).toBe('blunder')
    expect(d.explain.join(' ')).toContain('Jogada correta: ALL-IN')
  })
})

describe('coach: pos-flop (estimativa)', () => {
  /** HU: heroi (botao/SB) limpa, vilao da check, flop; vilao aposta `bet` fichas. */
  function facingBet(heroHole: string, bet: number): GameState {
    let g = startHand(createGame(mk(2), cfg, 0), mulberry32(21))
    const hero = g.toAct // botao/SB age primeiro
    g = rig(g, { [hero]: heroHole, [1 - hero]: 'Kd Qd' }, '2c 7d 9h Js 3c')
    g.seats[hero].isHero = true
    g = applyAction(g, { type: 'call' })
    g = applyAction(g, { type: 'check' })
    expect(g.street).toBe('flop')
    g = applyAction(g, raise(bet)) // vilao (BB) aposta
    expect(g.toAct).toBe(hero)
    return g
  }

  it('pagar uma aposta enorme com ar e erro grave, marcado como aproximacao', () => {
    const d = gradeDecision(facingBet('Jc 3s', 20), { type: 'call' }, mulberry32(1))
    expect(d.approx).toBe(true)
    expect(d.best).toBe('fold')
    expect(d.grade).toBe('blunder')
    expect(d.tag).toBe('POST_FLOP_CALL_LIGHT')
    expect(d.evLossBB).toBeGreaterThan(2)
    expect(d.equity).toBeLessThan(d.needed as number)
  })

  it('foldar um set diante de aposta e erro grave', () => {
    const d = gradeDecision(facingBet('7c 7h', 6), { type: 'fold' }, mulberry32(2))
    expect(['mistake', 'blunder']).toContain(d.grade)
    expect(d.tag).toBe('POST_FLOP_FOLD_TOO_MUCH')
  })

  it('pagar com um set e a jogada de referencia (ou raise), sem vazamento', () => {
    const d = gradeDecision(facingBet('7c 7h', 6), { type: 'call' }, mulberry32(3))
    expect(['best', 'good']).toContain(d.grade)
    expect(d.tag).toBe('')
  })

  it('a equity estimada fica entre 0 e 1 e as linhas explicam o calculo', () => {
    const d = gradeDecision(facingBet('Ac Kh', 6), { type: 'call' }, mulberry32(4))
    expect(d.equity).toBeGreaterThan(0)
    expect(d.equity).toBeLessThan(1)
    expect(d.explain.join(' ')).toContain('Equity estimada')
  })
})

describe('HUD e perfis', () => {
  it('nit joga menos maos que maniaco (VPIP)', () => {
    const rng = mulberry32(99)
    const players: PlayerInit[] = ['nit', 'nit', 'nit', 'maniac', 'maniac', 'maniac'].map((p, i) => ({
      name: `B${i}`, profile: p, stack: 200,
    }))
    let g = createGame(players, cfg, 0)
    let hud: Record<number, HudStats> = {}
    for (let h = 0; h < 200; h++) {
      g = { ...g, seats: g.seats.map((s) => ({ ...s, stack: s.stack < 2 ? 200 : s.stack })) }
      g = startHand(g, rng)
      let guard = 0
      while (!g.over) {
        g = applyAction(g, decideBot(g, rng))
        if (++guard > 200) throw new Error('mao nao termina')
      }
      hud = updateHud(hud, g)
    }
    const avg = (ids: number[]) =>
      ids.reduce((a, i) => a + pctOf(hud[i].vpip, hud[i].hands), 0) / ids.length
    expect(avg([3, 4, 5])).toBeGreaterThan(avg([0, 1, 2]) + 8)
    expect(hudLine(hud[0])).toMatch(/^V\d+ P\d+ AF/)
    expect(hudLine(emptyHud())).toBe('')
  }, 120_000)
})

describe('replay: mao jogada vira SavedHand', () => {
  it('converte acoes, posicoes e resultado', () => {
    let g = startHand(createGame(mk(3), cfg, 0), mulberry32(5))
    g = rig(g, {}, '2c 7d 9h Js 3c')
    g.seats[g.toAct].isHero = true
    while (!g.over) g = applyAction(g, g.seats[g.toAct].isHero ? raise(6) : { type: 'fold' })
    const saved = toSavedHand(g, [], 'cash6', 'Cash 6-max')
    expect(saved.tags).toContain('jogada')
    expect(saved.players).toHaveLength(3)
    expect(saved.actions.some((a) => a.action === 'raise')).toBe(true)
    expect(saved.actions.every((a, i) => a.timestamp === i)).toBe(true)
    expect(saved.result).toBeGreaterThan(0)
    expect(saved.players.filter((p) => p.isHero)).toHaveLength(1)
  })
})

describe('store: teto de maos jogadas', () => {
  it('mantem no maximo 40 automaticas, preserva as marcadas e as manuais', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null, setItem: () => {}, removeItem: () => {},
    })
    const { useHandsStore, MAX_PLAYED_HANDS } = await import('@/store')
    const mkHand = (id: string, tags: string[]) => ({
      id, title: id, date: 0, heroCards: [], board: [], players: [], actions: [], pot: 0, result: 0, notes: '', tags,
    })
    useHandsStore.setState({ savedHands: [mkHand('manual', [])] })
    for (let i = 0; i < 60; i++) {
      useHandsStore.getState().savePlayedHand(mkHand(`p${i}`, i === 3 ? ['jogada', 'revisar'] : ['jogada']))
    }
    const all = useHandsStore.getState().savedHands
    expect(all.filter((h) => h.tags.includes('jogada') && !h.tags.includes('revisar'))).toHaveLength(MAX_PLAYED_HANDS)
    expect(all.find((h) => h.id === 'p3')).toBeDefined() // marcada: nunca descartada
    expect(all.find((h) => h.id === 'manual')).toBeDefined() // manual: intocada
    expect(all[0].id).toBe('p59') // mais recente primeiro
    vi.unstubAllGlobals()
  })
})
