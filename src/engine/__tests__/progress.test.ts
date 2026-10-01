import { describe, it, expect } from 'vitest'
import {
  creditForDecisions, summarizeSessions, buildFlashcardQueue, TABLE_XP_DAILY_CAP, type PlaySession,
} from '../progress'

describe('XP da mesa', () => {
  it('ótima 3, boa 2, imprecisão 1, erro 0; acertos = ótima + boa', () => {
    const c = creditForDecisions(['best', 'good', 'inaccuracy', 'mistake', 'blunder'], 0)
    expect(c).toEqual({ answered: 5, correct: 2, xp: 6 })
  })

  it('respeita o teto diário e nunca devolve XP negativo', () => {
    expect(creditForDecisions(['best', 'best'], TABLE_XP_DAILY_CAP - 4).xp).toBe(4)
    expect(creditForDecisions(['best'], TABLE_XP_DAILY_CAP).xp).toBe(0)
    expect(creditForDecisions(['best'], TABLE_XP_DAILY_CAP + 50).xp).toBe(0)
    // as decisões continuam contando na meta mesmo sem XP
    expect(creditForDecisions(['best'], TABLE_XP_DAILY_CAP).answered).toBe(1)
  })

  it('sem decisões não rende nada', () => {
    expect(creditForDecisions([], 0)).toEqual({ answered: 0, correct: 0, xp: 0 })
  })
})

describe('resumo das sessões de mesa', () => {
  const base = { id: 'x', endedAt: 0, modeId: 'm', label: 'L', hands: 10, decisions: 8, correct: 6, leaks: 2 }
  const list: PlaySession[] = [
    { ...base, netBB: 12 },
    { ...base, netBB: -5 },
    { ...base, place: 1, field: 9, prizeBuyIns: 5.85 },
    { ...base, place: 6, field: 9, prizeBuyIns: 0 },
  ]

  it('soma cash separado dos torneios e calcula ITM e ROI', () => {
    const s = summarizeSessions(list)
    expect(s.sessions).toBe(4)
    expect(s.hands).toBe(40)
    expect(s.cashNetBB).toBe(7)
    expect(s.cashSessions).toBe(2)
    expect(s.tournaments).toBe(2)
    expect(s.itm).toBe(1)
    // (5.85 + 0 - 2) / 2
    expect(s.roi).toBeCloseTo(1.925, 6)
    expect(s.accuracy).toBeCloseTo(24 / 32, 6)
  })

  it('lista vazia: tudo zerado e sem ROI nem precisão', () => {
    const s = summarizeSessions([])
    expect(s).toMatchObject({ sessions: 0, hands: 0, cashNetBB: 0, tournaments: 0, roi: null, accuracy: null })
  })
})

describe('fila de flashcards (SM-2)', () => {
  const ids = ['a', 'b', 'c', 'd', 'e']
  const sm2 = {
    a: { nextReview: '2026-09-28' }, // vencido
    b: { nextReview: '2026-10-05' }, // ainda não venceu: fica de fora
    c: { nextReview: '2026-10-01' }, // vence hoje
  }

  it('vencidos primeiro (mais atrasado antes), depois os novos; os não vencidos ficam de fora', () => {
    const q = buildFlashcardQueue(ids, sm2, '2026-10-01')
    expect(q.due).toEqual(['a', 'c'])
    expect(q.fresh).toEqual(['d', 'e'])
    expect(q.queue).toEqual(['a', 'c', 'd', 'e'])
    expect(q.queue).not.toContain('b')
  })

  it('limita os novos por sessão', () => {
    const many = Array.from({ length: 30 }, (_, i) => `n${i}`)
    expect(buildFlashcardQueue(many, {}, '2026-10-01', 10).fresh).toHaveLength(10)
  })

  it('tudo em dia e sem novos = fila vazia', () => {
    const q = buildFlashcardQueue(['b'], sm2, '2026-10-01')
    expect(q.queue).toEqual([])
  })
})
