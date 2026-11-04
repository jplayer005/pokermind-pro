import { describe, it, expect } from 'vitest'
import { emptyHud, statRows, PFR_TARGET, type HudStats } from '../bots/hud'

const h = (o: Partial<HudStats>): HudStats => ({ ...emptyHud(), ...o })

describe('statRows: as linhas da tela de estatisticas', () => {
  const hud: Record<string, HudStats> = {
    Você: h({ hands: 50, vpip: 12, pfr: 10, threeBet: 2, aggr: 8, calls: 4, facedBet: 20, foldToBet: 5 }),
    Ana: h({ hands: 80, vpip: 20, pfr: 8, threeBet: 4, aggr: 3, calls: 12, facedBet: 30, foldToBet: 21 }),
    Beto: h({ hands: 10, vpip: 6, pfr: 1, aggr: 0, calls: 3, facedBet: 3, foldToBet: 1 }),
    Caio: h({ hands: 80, vpip: 50, pfr: 30, aggr: 10, calls: 0 }),
  }
  const rows = statRows(hud, 'Você')

  it('o heroi vem primeiro; os outros por numero de maos e depois por nome', () => {
    expect(rows.map((r) => r.name)).toEqual(['Você', 'Ana', 'Caio', 'Beto'])
    expect(rows[0].isHero).toBe(true)
    expect(rows.filter((r) => r.isHero)).toHaveLength(1)
  })

  it('VPIP, PFR e 3-bet saem em porcentagem das maos', () => {
    expect(rows[0]).toMatchObject({ hands: 50, vpip: 24, pfr: 20, threeBet: 4 })
    expect(rows[1]).toMatchObject({ vpip: 25, pfr: 10 })
  })

  it('AF e fold para aposta; sem amostra o fold para aposta fica vazio', () => {
    expect(rows[0].af).toBe('2.0')
    expect(rows[0].foldToBet).toBe(25)
    expect(rows[1].foldToBet).toBe(70)
    expect(rows[2].af).toBe('∞') // apostou sem nunca pagar
    expect(rows[3].foldToBet).toBeNull() // so 3 apostas enfrentadas
  })

  it('sem heroi na lista as linhas continuam validas', () => {
    expect(statRows(hud, 'Outro').some((r) => r.isHero)).toBe(false)
    expect(statRows({}, 'Você')).toEqual([])
  })

  it('o alvo de PFR e de 20% a 25%', () => {
    expect(PFR_TARGET).toEqual({ min: 20, max: 25 })
  })
})
