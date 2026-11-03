import { describe, it, expect } from 'vitest'
import {
  assignPlaces, createField, rebalance, simulateTables, aliveCount, tableSizes, type Field,
} from '../game/field'
import { mttConfig, levelAt } from '../game/tournament'
import { mulberry32 } from '../cards'
import { profileOf } from '../bots/profiles'

const chips = (f: Field) => f.players.filter((p) => p.alive).reduce((a, p) => a + p.stack, 0)
const noPressure = () => 0

describe('createField: o campo do torneio', () => {
  it('MTT de 54: 54 jogadores unicos, 6 mesas de 9, heroi na mesa 0, estilos variados', () => {
    const f = createField(mttConfig(54), 'Você', mulberry32(1))
    expect(f.players).toHaveLength(54)
    expect(new Set(f.players.map((p) => p.name)).size).toBe(54)
    expect(f.players.filter((p) => p.isHero)).toHaveLength(1)
    expect(f.players.find((p) => p.isHero)!.table).toBe(0)
    expect(tableSizes(f)).toEqual({ 0: 9, 1: 9, 2: 9, 3: 9, 4: 9, 5: 9 })
    expect(f.players.every((p) => p.alive && p.stack === 1500)).toBe(true)
    const bases = new Set(f.players.filter((p) => !p.isHero).map((p) => profileOf(p.profile).id.split('~')[0]))
    expect(bases.size).toBeGreaterThanOrEqual(4)
  })

  it('campo que nao divide por 9 distribui as mesas com diferenca de no maximo 1', () => {
    const f = createField({ ...mttConfig(50), fieldSize: 50 }, 'Você', mulberry32(2))
    const sizes = Object.values(tableSizes(f))
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    expect(sizes.reduce((a, b) => a + b, 0)).toBe(50)
  })

  it('os nomes nao usam travessao', () => {
    const f = createField(mttConfig(54), 'Você', mulberry32(3))
    expect(f.players.every((p) => !/[–—]/.test(p.name))).toBe(true)
  })

  it('e deterministico para a mesma semente', () => {
    expect(createField(mttConfig(27), 'Você', mulberry32(9))).toEqual(createField(mttConfig(27), 'Você', mulberry32(9)))
  })
})

describe('simulateTables: as outras mesas jogam de verdade', () => {
  it('conserva as fichas e so quem fica com zero e eliminado, rodada apos rodada', () => {
    const rng = mulberry32(5)
    let f = createField(mttConfig(27), 'Você', rng)
    const total = chips(f)
    let bustedTotal = 0
    for (let r = 0; r < 60; r++) {
      const sim = simulateTables(f, levelAt(Math.floor(r / 4)), rng, noPressure)
      f = sim.field
      // os eliminados tem zero fichas; ninguem fora da lista tem zero
      for (const b of sim.busted) expect(f.players.find((p) => p.name === b.name)!.stack).toBe(0)
      const zeros = f.players.filter((p) => p.alive && p.stack <= 0).map((p) => p.name)
      expect(new Set(zeros)).toEqual(new Set(sim.busted.map((b) => b.name)))
      // tira os eliminados do jogo, como o torneio faz
      f = { ...f, players: f.players.map((p) => (p.stack <= 0 ? { ...p, alive: false } : p)) }
      bustedTotal += sim.busted.length
      expect(chips(f)).toBe(total)
    }
    expect(bustedTotal).toBeGreaterThan(0)
  }, 120_000)

  it('nao mexe na mesa do heroi (jogada na tela) nem em mesa com um jogador so', () => {
    const rng = mulberry32(6)
    const f = createField(mttConfig(27), 'Você', rng)
    const heroTable = f.players.filter((p) => p.table === 0).map((p) => p.stack)
    const sim = simulateTables(f, levelAt(0), rng, noPressure)
    expect(sim.field.players.filter((p) => p.table === 0).map((p) => p.stack)).toEqual(heroTable)
    const solo: Field = { ...f, players: f.players.map((p) => (p.table === 2 && p.name !== f.players.find((q) => q.table === 2)!.name ? { ...p, alive: false } : p)) }
    const before = solo.players.find((p) => p.table === 2 && p.alive)!.stack
    const sim2 = simulateTables(solo, levelAt(0), rng, noPressure)
    expect(sim2.field.players.find((p) => p.table === 2 && p.alive)!.stack).toBe(before)
  })

  it('e deterministico para a mesma semente', () => {
    const run = (seed: number) => {
      const rng = mulberry32(seed)
      const f = createField(mttConfig(27), 'Você', rng)
      return simulateTables(f, levelAt(0), rng, noPressure).field.players.map((p) => p.stack)
    }
    expect(run(11)).toEqual(run(11))
  })
})

describe('assignPlaces: colocacao por fichas no inicio da mao', () => {
  it('quem comecou a mao com menos fichas fica na pior colocacao', () => {
    const placed = assignPlaces(
      [{ name: 'A', startStack: 3000, isHero: false }, { name: 'B', startStack: 800, isHero: false }, { name: 'C', startStack: 1500, isHero: true }],
      10,
    )
    expect(placed.map((p) => [p.name, p.place])).toEqual([['B', 10], ['C', 9], ['A', 8]])
    expect(placed.find((p) => p.name === 'C')!.isHero).toBe(true)
  })

  it('sem eliminados nao devolve nada', () => {
    expect(assignPlaces([], 5)).toEqual([])
  })
})

describe('rebalance: quebra de mesas e mesa final', () => {
  const kill = (f: Field, n: number, rng = mulberry32(1)): Field => {
    // tira n jogadores que nao sao o heroi, espalhados pelas mesas
    const others = f.players.filter((p) => !p.isHero && p.alive).sort(() => rng() - 0.5).slice(0, n).map((p) => p.name)
    return { ...f, players: f.players.map((p) => (others.includes(p.name) ? { ...p, alive: false, stack: 0 } : p)) }
  }

  it('nunca passa de 9 por mesa e mantem as mesas equilibradas (diferenca de no maximo 1)', () => {
    let f = createField(mttConfig(54), 'Você', mulberry32(4))
    const rng = mulberry32(4)
    for (const k of [6, 6, 8, 8, 8, 6]) {
      f = kill(f, k, rng)
      f = rebalance(f, 9, rng).field
      const sizes = Object.values(tableSizes(f))
      expect(Math.max(...sizes)).toBeLessThanOrEqual(9)
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(aliveCount(f))
    }
  })

  it('o numero de mesas acompanha o campo: ceil(vivos / 9)', () => {
    let f = createField(mttConfig(54), 'Você', mulberry32(7))
    f = kill(f, 20)
    f = rebalance(f, 9, mulberry32(7)).field
    expect(Object.keys(tableSizes(f)).length).toBe(Math.ceil(aliveCount(f) / 9))
  })

  it('a mesa do heroi cheia demais cede jogadores, mas o heroi nunca se move', () => {
    let f = createField(mttConfig(54), 'Você', mulberry32(12))
    // as outras mesas encolhem para 7 e a do heroi segue com 9
    const trim = f.players.filter((p) => p.table !== 0 && (p.table === 1 || p.table === 2)).slice(0, 4).map((p) => p.name)
    f = { ...f, players: f.players.map((p) => (trim.includes(p.name) ? { ...p, alive: false, stack: 0 } : p)) }
    const r = rebalance(f, 9, mulberry32(12))
    const sizes = Object.values(tableSizes(r.field))
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
    expect(r.field.players.find((p) => p.isHero)!.table).toBe(0)
    expect(r.fromHeroTable).not.toContain('Você')
  })

  it('a mesa do heroi nunca e quebrada: vagas dela sao preenchidas por jogadores de outras mesas', () => {
    let f = createField(mttConfig(54), 'Você', mulberry32(8))
    // esvazia metade da mesa do heroi
    const victims = f.players.filter((p) => p.table === 0 && !p.isHero).slice(0, 4).map((p) => p.name)
    f = { ...f, players: f.players.map((p) => (victims.includes(p.name) ? { ...p, alive: false, stack: 0 } : p)) }
    const r = rebalance(f, 9, mulberry32(8))
    expect(r.field.players.find((p) => p.isHero)!.table).toBe(0)
    expect(r.toHeroTable.length).toBeGreaterThan(0)
    expect(tableSizes(r.field)[0]).toBeGreaterThanOrEqual(Math.max(...Object.values(tableSizes(r.field))) - 1)
    // quem chegou a mesa do heroi esta na lista e na mesa 0
    for (const p of r.toHeroTable) expect(r.field.players.find((q) => q.name === p.name)!.table).toBe(0)
  })

  it('mesa final: com 9 ou menos vivos, todos sentam na mesa do heroi', () => {
    let f = createField(mttConfig(27), 'Você', mulberry32(9))
    f = kill(f, 19) // sobram 8
    const r = rebalance(f, 9, mulberry32(9))
    expect(aliveCount(r.field)).toBe(8)
    expect(r.field.players.filter((p) => p.alive).every((p) => p.table === 0)).toBe(true)
    expect(r.toHeroTable.length).toBe(r.field.players.filter((p) => p.alive && p.table === 0).length - f.players.filter((p) => p.alive && p.table === 0).length)
  })

  it('as fichas dos jogadores movidos acompanham eles', () => {
    let f = createField(mttConfig(54), 'Você', mulberry32(10))
    f = { ...f, players: f.players.map((p, i) => (p.alive && i % 5 === 0 ? { ...p, stack: 2200 } : p)) }
    f = kill(f, 15)
    const before = new Map(f.players.map((p) => [p.name, p.stack]))
    const r = rebalance(f, 9, mulberry32(10))
    for (const p of r.field.players) expect(p.stack).toBe(before.get(p.name))
  })
})
