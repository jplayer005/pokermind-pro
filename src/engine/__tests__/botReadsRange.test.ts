import { describe, it, expect } from 'vitest'
import { applyAction, createGame, legalActions, potTotal, startHand } from '../game/reducer'
import { decideBot } from '../bots/policy'
import { buildVillainRange } from '../coach/range'
import { mulberry32 } from '../cards'
import type { AdaptContext } from '../bots/adapt'
import type { GameState } from '../game/types'

const PRO = 'tag~1.00~1.00~2'
const REGULAR = 'tag~1.00~1.00~1'
const FIXED = 'tag~1.00~1.00~0'
const read: AdaptContext = { heroRangeOf: (g, id) => buildVillainRange(g, id)?.combos ?? null }

/** Mao HU: o heroi (assento 0, botao) segue o roteiro de apostas; o bot passa e paga ate a ultima decisao dele. */
function spot(line: 'strong' | 'weak', botProfile: string, seed: number): GameState | null {
  const rng = mulberry32(seed)
  let g = startHand(createGame([
    { name: 'Hero', isHero: true, profile: 'tag', stack: 400 },
    { name: 'Bot', profile: botProfile, stack: 400 },
  ], { sb: 1, bb: 2, ante: 0 }, 0), rng)
  const bet = (frac: number) => {
    const la = legalActions(g)
    return applyAction(g, { type: 'raise', to: Math.min(la.maxTo, Math.max(la.minTo, Math.round(g.currentBet + frac * potTotal(g)))) })
  }
  const passOrCall = () => applyAction(g, legalActions(g).canCheck ? { type: 'check' } : { type: 'call' })
  try {
    if (line === 'strong') {
      g = applyAction(g, { type: 'raise', to: 6 }); g = passOrCall() // abre e e pago
      for (const frac of [0.66, 0.66]) { g = passOrCall(); g = bet(frac); g = passOrCall() } // flop e turn: o bot passa, ele aposta, o bot paga
      g = passOrCall(); g = bet(1) // river: o bot passa e ele aposta o pote
    } else {
      g = applyAction(g, { type: 'call' }); g = passOrCall() // completa, o bot passa
      for (let i = 0; i < 2; i++) { g = passOrCall(); g = passOrCall() } // flop e turn: passa passa
      g = passOrCall(); g = bet(0.25) // river: o bot passa e ele aposta pouco
    }
  } catch { return null }
  return !g.over && g.street === 'river' && g.seats[g.toAct].name === 'Bot' && legalActions(g).canCall ? g : null
}

function foldRate(line: 'strong' | 'weak', profile: string, ctx: AdaptContext, n = 260): { rate: number; n: number } {
  let folds = 0
  let total = 0
  for (let seed = 1; seed <= n; seed++) {
    const g = spot(line, profile, seed)
    if (!g) continue
    total++
    if (decideBot(g, mulberry32(seed + 9000), 0, 120, ctx).type === 'fold') folds++
  }
  return { rate: folds / total, n: total }
}

describe('bots que se adaptam leem o range do heroi no pos-flop', () => {
  it('o profissional larga bem mais diante de uma linha forte (3 apostas) do que de uma aposta pequena depois de passar passar', () => {
    const strong = foldRate('strong', PRO, read)
    const weak = foldRate('weak', PRO, read)
    expect(strong.n).toBeGreaterThan(150)
    expect(weak.n).toBeGreaterThan(150)
    expect(strong.rate).toBeGreaterThan(weak.rate + 0.2)
  })

  it('lendo o range, o profissional larga mais diante da linha forte do que sem ler', () => {
    const withRead = foldRate('strong', PRO, read)
    const without = foldRate('strong', PRO, {})
    expect(withRead.rate).toBeGreaterThan(without.rate + 0.05)
  })

  it('o regular tambem le; o bot fixo nao: o mesmo estado e o mesmo sorteio dao a mesma acao com ou sem leitura', () => {
    expect(foldRate('strong', REGULAR, read).rate).toBeGreaterThan(foldRate('strong', REGULAR, {}).rate)
    for (let seed = 1; seed <= 120; seed++) {
      const g = spot('strong', FIXED, seed)
      if (!g) continue
      expect(decideBot(g, mulberry32(seed), 0, 120, read)).toEqual(decideBot(g, mulberry32(seed), 0, 120, {}))
    }
  })

  it('sem leitura utilizavel (null ou range curto demais) o bot joga como antes', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const g = spot('strong', PRO, seed)
      if (!g) continue
      const base = decideBot(g, mulberry32(seed), 0, 120, {})
      expect(decideBot(g, mulberry32(seed), 0, 120, { heroRangeOf: () => null })).toEqual(base)
      expect(decideBot(g, mulberry32(seed), 0, 120, { heroRangeOf: () => [[0, 1]] })).toEqual(base)
    }
  })

  it('custa pouco: 200 decisoes lendo o range cabem em poucos segundos', () => {
    const t0 = Date.now()
    let n = 0
    for (let seed = 1; seed <= 400 && n < 200; seed++) {
      const g = spot('strong', PRO, seed)
      if (!g) continue
      decideBot(g, mulberry32(seed), 0, 220, read)
      n++
    }
    const ms = Date.now() - t0
    expect(n).toBeGreaterThan(100)
    expect(ms / n).toBeLessThan(60) // por decisao, com 220 amostras como na mesa
  })
})
