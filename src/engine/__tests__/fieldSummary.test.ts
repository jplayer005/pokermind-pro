import { describe, it, expect } from 'vitest'
import { fieldSummary } from '../game/field'
import { mttConfig, startTournament, sngConfig, type TournamentState } from '../game/tournament'
import { mulberry32 } from '../cards'

const start = (seed = 1) => startTournament(mttConfig(54), 'Você', () => 'tag', mulberry32(seed)).tour

/** Muda as fichas de alguns jogadores mantendo o total (um passa fichas ao outro). */
function withStacks(t: TournamentState, deltas: Record<string, number>): TournamentState {
  return {
    ...t,
    field: { ...t.field!, players: t.field!.players.map((p) => (p.name in deltas ? { ...p, stack: p.stack + deltas[p.name] } : p)) },
  }
}

describe('fieldSummary: o painel do campo', () => {
  it('SNG nao tem campo separado', () => {
    const t = startTournament(sngConfig(6), 'Você', () => 'tag', mulberry32(1)).tour
    expect(fieldSummary(t, 20)).toBeNull()
  })

  it('no inicio: todos com o mesmo stack, 6 mesas, paga 8, faltam 46 para o dinheiro', () => {
    const t = start()
    const s = fieldSummary(t, 20)!
    expect(s.remaining).toBe(54)
    expect(s.fieldSize).toBe(54)
    expect(s.tables).toBe(6)
    expect(s.paid).toBe(8)
    expect(s.toMoney).toBe(46)
    expect(s.inMoney).toBe(false)
    expect(s.avgStackBB).toBeCloseTo(1500 / 20, 9)
    expect(s.heroStackBB).toBeCloseTo(75, 9)
  })

  it('posicao do heroi e lideres seguem as fichas', () => {
    let t = start(2)
    const [a, b] = t.field!.players.filter((p) => !p.isHero)
    t = withStacks(t, { [a.name]: 3000, [b.name]: -1000 })
    const s = fieldSummary(t, 20)!
    expect(s.leaders[0].name).toBe(a.name)
    expect(s.leaders[0].stackBB).toBeCloseTo((1500 + 3000) / 20, 9)
    expect(s.leaders.length).toBe(5)
    // o heroi tem o mesmo stack que quase todo mundo: fica atras so do lider
    expect(s.heroRank).toBeGreaterThanOrEqual(2)
    expect(s.leaders.map((l) => l.stackBB)).toEqual([...s.leaders.map((l) => l.stackBB)].sort((x, y) => y - x))
  })

  it('a sua mesa lista os 9 jogadores, com estilo e marcando o heroi', () => {
    const s = fieldSummary(start(3), 20)!
    expect(s.heroTable).toHaveLength(9)
    expect(s.heroTable.filter((p) => p.isHero)).toHaveLength(1)
    expect(s.heroTable.filter((p) => !p.isHero).every((p) => /^[\p{L} ]+[+-]?$/u.test(p.style))).toBe(true)
  })

  it('tabela das mesas: jogadores e lider de cada uma', () => {
    const s = fieldSummary(start(4), 20)!
    expect(s.tableRows).toHaveLength(6)
    expect(s.tableRows.reduce((a, r) => a + r.players, 0)).toBe(54)
    expect(s.tableRows.filter((r) => r.isHeroTable)).toHaveLength(1)
    for (const r of s.tableRows) expect(r.leaderBB).toBeGreaterThan(0)
  })

  it('no dinheiro: faltam 0 e inMoney verdadeiro', () => {
    const t = start(5)
    const alive = t.field!.players
    const cut = alive.filter((p) => !p.isHero).slice(0, 47).map((p) => p.name) // sobram 7 vivos
    const t2: TournamentState = {
      ...t,
      remaining: 7,
      field: { ...t.field!, players: alive.map((p) => (cut.includes(p.name) ? { ...p, alive: false, stack: 0 } : p)) },
    }
    const s = fieldSummary(t2, 20)!
    expect(s.inMoney).toBe(true)
    expect(s.toMoney).toBe(0)
  })

  it('os textos de estilo nao usam travessao', () => {
    const s = fieldSummary(start(6), 20)!
    for (const p of s.heroTable) expect(p.style).not.toMatch(/[–—]/)
  })
})
