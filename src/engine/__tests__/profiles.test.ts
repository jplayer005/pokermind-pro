import { describe, it, expect } from 'vitest'
import { BOT_PROFILES, fieldProfile, profileOf } from '../bots/profiles'
import { mulberry32 } from '../cards'

describe('profileOf: perfis individuais', () => {
  it('os perfis base continuam iguais', () => {
    expect(profileOf('lag')).toBe(BOT_PROFILES.lag)
    expect(profileOf('nao-existe')).toBe(BOT_PROFILES.tag)
  })

  it('um id com tracos vira o perfil base ajustado, com rotulo e cache', () => {
    const p = profileOf('lag~1.10~1.20')
    expect(p.looseness).toBeCloseTo(BOT_PROFILES.lag.looseness * 1.1, 9)
    expect(p.aggression).toBeCloseTo(BOT_PROFILES.lag.aggression * 1.2, 9)
    expect(p.bluff).toBe(BOT_PROFILES.lag.bluff)
    expect(p.stickiness).toBe(BOT_PROFILES.lag.stickiness)
    expect(p.label).toBe('LAG+') // mais agressivo que o LAG padrao
    expect(profileOf('lag~1.10~1.20')).toBe(p)
  })

  it('marca quem e menos agressivo e deixa o normal sem marca', () => {
    expect(profileOf('tag~1.00~0.80').label).toBe('TAG-')
    expect(profileOf('tag~1.00~1.00').label).toBe('TAG')
  })

  it('id quebrado ou base desconhecida cai no TAG, e os tracos sao limitados', () => {
    expect(profileOf('xyz~1~1')).toBe(BOT_PROFILES.tag)
    expect(profileOf('lag~abc~1')).toBe(BOT_PROFILES.tag)
    const extreme = profileOf('nit~9.00~0.01')
    expect(extreme.looseness).toBeCloseTo(BOT_PROFILES.nit.looseness * 1.5, 9)
    expect(extreme.aggression).toBeCloseTo(BOT_PROFILES.nit.aggression * 0.5, 9)
  })

  it('os rotulos nao usam travessao nem emoji', () => {
    for (const id of ['tag~1.00~1.30', 'nit~1.00~0.70']) expect(profileOf(id).label).not.toMatch(/[–—]/)
  })
})

describe('fieldProfile: sorteio do campo', () => {
  const draw = (n: number, seed = 1) => {
    const rng = mulberry32(seed)
    return Array.from({ length: n }, () => fieldProfile(rng))
  }

  it('devolve ids validos, ja com tracos individuais', () => {
    for (const id of draw(200)) {
      expect(id).toMatch(/^[a-z]+~\d\.\d\d~\d\.\d\d~[012]$/)
      expect(profileOf(id).id).toBe(id) // o id foi entendido (nao caiu no TAG padrao)
    }
  })

  it('o campo mistura todos os estilos, com mais TAGs que maniacos', () => {
    const ids = draw(3000)
    const count = (b: string) => ids.filter((i) => i.startsWith(`${b}~`)).length
    for (const b of Object.keys(BOT_PROFILES)) expect(count(b)).toBeGreaterThan(0)
    expect(count('tag')).toBeGreaterThan(count('maniac') * 2)
  })

  it('cada jogador e diferente: a agressividade varia dentro do mesmo estilo', () => {
    const tags = draw(3000).filter((i) => i.startsWith('tag~')).map((i) => profileOf(i).aggression)
    const min = Math.min(...tags)
    const max = Math.max(...tags)
    expect(max - min).toBeGreaterThan(0.3)
    expect(min).toBeGreaterThanOrEqual(0.7)
    expect(max).toBeLessThanOrEqual(1.35)
  })

  it('e deterministico para a mesma semente', () => {
    expect(draw(50, 7)).toEqual(draw(50, 7))
  })
})
