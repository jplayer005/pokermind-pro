import { describe, it, expect } from 'vitest'
import { buildScenarioHand, scenarioConfig, scenarioPlayers, scenarioSeats } from '../lab/scenarios'
import { positionsBySeat } from '../game/reducer'
import { recordDescription, scenarioFromRecord, validateRecord, type HandRecord } from '../lab/myHand'
import { mulberry32, RANK_CHARS } from '../cards'
import { buildVillainRange } from '../coach/range'

const c = (rank: string, suit: number) => RANK_CHARS.indexOf(rank) * 4 + suit

/** BTN abre 2,5, o SB (vilao) paga, flop K72, check do vilao, aposta de 3 do heroi, raise do vilao para 12. */
const base: HandRecord = {
  id: 'h1', title: 'Top par contra check-raise', createdAt: 1, updatedAt: 1,
  tableSize: 6, heroPos: 'BTN', villainPos: 'SB',
  heroStackBB: 90, villainStackBB: 54, anteBB: 0,
  heroCards: [c('K', 0), c('Q', 0)],
  board: [c('K', 1), c('7', 2), c('2', 3)],
  steps: [
    { who: 'hero', type: 'raise', bb: 2.5 },
    { who: 'villain', type: 'call' },
    { who: 'villain', type: 'check' },
    { who: 'hero', type: 'raise', bb: 3 },
    { who: 'villain', type: 'raise', bb: 12 },
  ],
}

describe('recriar minha mao: registro vira cenario jogavel', () => {
  it('monta a mesa com as posicoes escolhidas e chega a decisao do heroi', () => {
    const v = validateRecord(base)
    expect(v.ok).toBe(true)
    const sc = scenarioFromRecord(base)
    expect(sc.decisionStreet).toBe('flop')
    expect(scenarioSeats(sc)).toBe(6)
    const g = buildScenarioHand(sc, mulberry32(1), 4)
    expect(g.handNumber).toBe(4)
    expect(g.seats[g.toAct].isHero).toBe(true)
    const pos = positionsBySeat(g)
    expect(pos[0]).toBe('BTN')
    const villain = g.seats.find((s) => s.name === 'Rafa')!
    expect(pos[villain.id]).toBe('SB')
    // cartas do heroi e do board exatamente como registrados
    expect(g.seats[0].cards).toEqual(base.heroCards)
    expect(g.board).toEqual(base.board)
  })

  it('os stacks registrados valem no inicio da mao (em bb) e as fichas se conservam', () => {
    const g = buildScenarioHand(scenarioFromRecord(base), mulberry32(2))
    const bb = g.cfg.bb
    expect(g.seats[0].startStack).toBe(90 * bb)
    expect(g.seats.find((s) => s.name === 'Rafa')!.startStack).toBe(54 * bb)
    expect(g.seats.every((s) => s.stack + s.total === s.startStack)).toBe(true)
  })

  it('sem cartas do vilao ele e sorteado do range coerente; com cartas, ficam como registradas', () => {
    const sc = scenarioFromRecord(base)
    const key = (x: readonly number[]) => [...x].sort((a, b) => a - b).join('-')
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = buildScenarioHand(sc, mulberry32(seed))
      const v = g.seats.find((s) => s.name === 'Rafa')!
      expect(new Set(buildVillainRange(g)!.combos.map(key)).has(key(v.cards!))).toBe(true)
    }
    const fixed = scenarioFromRecord({ ...base, villainCards: [c('7', 0), c('7', 1)] })
    const g = buildScenarioHand(fixed, mulberry32(9))
    expect(g.seats.find((s) => s.name === 'Rafa')!.cards).toEqual([c('7', 0), c('7', 1)])
  })

  it('mesa de 9 e ante: o ante entra no pote e cada jogador comeca com o stack cheio', () => {
    const rec: HandRecord = { ...base, tableSize: 9, heroPos: 'CO', villainPos: 'BB', anteBB: 0.5, steps: [
      { who: 'hero', type: 'raise', bb: 2.5 }, { who: 'villain', type: 'call' }, { who: 'villain', type: 'check' },
      { who: 'hero', type: 'raise', bb: 3 }, { who: 'villain', type: 'raise', bb: 12 },
    ] }
    expect(validateRecord(rec).ok).toBe(true)
    const sc = scenarioFromRecord(rec)
    expect(scenarioPlayers(sc)).toHaveLength(9)
    expect(scenarioConfig(sc).ante).toBe(1)
    const g = buildScenarioHand(sc, mulberry32(1))
    expect(positionsBySeat(g)[0]).toBe('CO')
  })

  it('mostra a rua de cada acao, para o formulario', () => {
    const v = validateRecord(base)
    expect(v.ok && v.stepStreets).toEqual(['preflop', 'preflop', 'flop', 'flop', 'flop'])
  })

  it('descreve a mao em linhas para a abertura do cenario', () => {
    const lines = recordDescription(base)
    expect(lines.join(' ')).toContain('BTN')
    expect(lines.join(' ')).toContain('90 bb')
  })
})

describe('validateRecord: erros em portugues, sem derrubar o app', () => {
  it('mesma posicao para voce e para o vilao', () => {
    const v = validateRecord({ ...base, villainPos: 'BTN' })
    expect(v.ok).toBe(false)
    expect(!v.ok && v.error).toMatch(/posições diferentes/)
  })

  it('posicao que nao existe na mesa de 6', () => {
    const v = validateRecord({ ...base, villainPos: 'LJ' })
    expect(!v.ok && v.error).toMatch(/mesa de 6/)
  })

  it('cartas repetidas entre voce, vilao e board', () => {
    const v = validateRecord({ ...base, board: [c('K', 0), c('7', 2), c('2', 3)] })
    expect(!v.ok && v.error).toMatch(/repetidas/)
  })

  it('acao fora de ordem', () => {
    const v = validateRecord({ ...base, steps: [{ who: 'villain', type: 'call' }] })
    expect(!v.ok && v.error).toMatch(/ação 1/)
  })

  it('acoes que nao terminam na sua vez', () => {
    const v = validateRecord({ ...base, steps: base.steps.slice(0, 4) })
    expect(!v.ok && v.error).toMatch(/sua vez/)
  })

  it('board curto demais para a rua alcancada', () => {
    const v = validateRecord({ ...base, board: [], steps: base.steps })
    expect(!v.ok && v.error).toMatch(/board/i)
  })

  it('stack ou ante invalido', () => {
    expect(validateRecord({ ...base, heroStackBB: 0 }).ok).toBe(false)
    expect(validateRecord({ ...base, anteBB: -1 }).ok).toBe(false)
  })
})

describe('todas as combinacoes de posicao caem onde o jogador pediu', () => {
  const TABLES: [6 | 9, string[]][] = [[6, ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']], [9, ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']]]
  for (const [size, labels] of TABLES) {
    it(`mesa de ${size}: heroi e vilao ficam na posicao escolhida (qualquer par)`, () => {
      let tested = 0
      for (const heroPos of labels) {
        for (const villainPos of labels) {
          if (heroPos === villainPos) continue
          // roteiro minimo valido: o vilao age, depois o heroi decide (testa so o que fecha)
          const villainFirst = labels.indexOf(villainPos) < labels.indexOf(heroPos)
          const rec = { ...base, tableSize: size as 6 | 9, heroPos: heroPos as any, villainPos: villainPos as any, steps: villainFirst ? [{ who: 'villain' as const, type: 'fold' as const }] : [], board: [] }
          const sc = (() => { try { return scenarioFromRecord(rec) } catch { return null } })()
          if (sc) {
            const g = buildScenarioHand(sc, mulberry32(1))
            const pos = positionsBySeat(g)
            const vSeat = g.seats.find((s) => s.name === 'Rafa')!.id
            expect(pos[0]).toBe(heroPos)
            expect(pos[vSeat]).toBe(villainPos)
            tested++
          }
        }
      }
      // quase todos os pares fecham; so nao fecham os que acabam a mao antes (ex.: heroi no BB com todos largando)
      expect(tested).toBeGreaterThanOrEqual(size === 6 ? 20 : 60)
    })
  }

  it('posicao do heroi em qualquer lugar: o setup monta sem erro estrutural (so o roteiro vazio e que pode nao fechar)', () => {
    for (const heroPos of ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const) {
      const v = validateRecord({ ...base, heroPos, villainPos: heroPos === 'BB' ? 'SB' : 'BB', steps: [], board: [] })
      if (!v.ok) expect(v.error).not.toMatch(/não existe|diferentes|Informe/)
    }
  })
})

describe('registro corrompido nao derruba nada', () => {
  it('campos faltando viram erro de validacao, sem excecao', () => {
    const broken = { id: 'x', title: 'x' } as unknown as HandRecord
    const v = validateRecord(broken)
    expect(v.ok).toBe(false)
    expect(!v.ok && v.error).toMatch(/incompleta/)
    expect(validateRecord({ ...base, steps: undefined } as unknown as HandRecord).ok).toBe(false)
    expect(() => scenarioFromRecord(broken)).toThrow()
  })
})
