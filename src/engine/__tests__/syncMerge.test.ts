import { describe, it, expect } from 'vitest'
import {
  mergeHands, mergeTraining, mergeSm2, mergeLeaks, mergeNotes, mergePlay, mergeProfile, mergeTombstones,
  capPlayedHands, sameData, MAX_PLAYED_HANDS, MAX_TOMBSTONES,
} from '../syncMerge'

const hand = (id: string, date: number, tags: string[] = ['jogada']) => ({ id, date, tags, title: id })

describe('mãos: dois aparelhos, mesma conta', () => {
  it('união: cada aparelho mantém o que o outro jogou (antes a nuvem sobrescrevia)', () => {
    const a = { savedHands: [hand('a1', 3), hand('a2', 1)], deleted: {} }
    const b = { savedHands: [hand('b1', 4), hand('b2', 2)], deleted: {} }
    const m = mergeHands(a, b)
    expect(m.savedHands.map((h: any) => h.id)).toEqual(['b1', 'a1', 'b2', 'a2'])
    // simétrico: o outro lado chega ao mesmo conjunto
    expect(mergeHands(b, a).savedHands.map((h: any) => h.id).sort()).toEqual(m.savedHands.map((h: any) => h.id).sort())
  })

  it('contagens iguais com conteúdo diferente não perdem nada (o caso do teto de 40)', () => {
    const a = { savedHands: Array.from({ length: 5 }, (_, i) => hand(`a${i}`, 100 + i)) }
    const b = { savedHands: Array.from({ length: 5 }, (_, i) => hand(`b${i}`, 200 + i)) }
    expect(mergeHands(a, b).savedHands).toHaveLength(10)
  })

  it('mão apagada num aparelho não volta do outro (lápide)', () => {
    const a = { savedHands: [hand('x', 10, ['manual'])], deleted: { y: 999 } }
    const b = { savedHands: [hand('y', 20, ['manual']), hand('x', 10, ['manual'])], deleted: {} }
    const m = mergeHands(a, b)
    expect(m.savedHands.map((h: any) => h.id)).toEqual(['x'])
    expect(m.deleted.y).toBe(999)
  })

  it('respeita o teto das mãos jogadas e preserva as marcadas e as manuais', () => {
    const many = Array.from({ length: MAX_PLAYED_HANDS + 10 }, (_, i) => hand(`p${i}`, 1000 - i))
    const keep = [hand('rev', 1, ['jogada', 'revisar']), hand('man', 2, ['manual'])]
    const out = capPlayedHands([...many, ...keep])
    expect(out.filter((h) => h.tags.includes('jogada') && !h.tags.includes('revisar'))).toHaveLength(MAX_PLAYED_HANDS)
    expect(out.map((h) => h.id)).toContain('rev')
    expect(out.map((h) => h.id)).toContain('man')
  })

  it('local vazio ou nuvem vazia: devolve o que existe', () => {
    expect(mergeHands(null, { savedHands: [hand('c', 1)] }).savedHands).toHaveLength(1)
    expect(mergeHands({ savedHands: [hand('l', 1)] }, null).savedHands).toHaveLength(1)
    expect(mergeHands(null, null).savedHands).toEqual([])
  })
})

describe('treino, revisão espaçada e vazamentos', () => {
  it('sessões de drill: união por id, mais novas primeiro', () => {
    const m = mergeTraining(
      { sessionHistory: [{ id: 's1', startedAt: 1 }], totalQuestionsToday: 5, lastResetDate: '2026-10-01', competitionHighScores: [] },
      { sessionHistory: [{ id: 's2', startedAt: 2 }, { id: 's1', startedAt: 1 }], totalQuestionsToday: 9, lastResetDate: '2026-10-01', competitionHighScores: [] },
    )
    expect(m.sessionHistory.map((s: any) => s.id)).toEqual(['s2', 's1'])
    expect(m.totalQuestionsToday).toBe(9)
  })

  it('contador do dia: o dia mais novo vence, mesmo com número menor', () => {
    const m = mergeTraining(
      { sessionHistory: [], totalQuestionsToday: 40, lastResetDate: '2026-09-30', competitionHighScores: [] },
      { sessionHistory: [], totalQuestionsToday: 3, lastResetDate: '2026-10-01', competitionHighScores: [] },
    )
    expect(m).toMatchObject({ totalQuestionsToday: 3, lastResetDate: '2026-10-01' })
  })

  it('SM-2: por cartão fica quem tem mais tentativas', () => {
    const m = mergeSm2(
      { sm2Data: { q1: { totalAttempts: 5, lastSeen: '2026-10-01' }, q2: { totalAttempts: 1, lastSeen: '2026-10-01' } } },
      { sm2Data: { q1: { totalAttempts: 3, lastSeen: '2026-10-02' }, q3: { totalAttempts: 2, lastSeen: '2026-09-01' } } },
    )
    expect(Object.keys(m.sm2Data).sort()).toEqual(['q1', 'q2', 'q3'])
    expect(m.sm2Data.q1.totalAttempts).toBe(5)
  })

  it('vazamentos: por contexto fica o que tem mais decisões; o total nunca cai abaixo da soma', () => {
    const stat = (n: number, lastSeen = 1) => ({ ctx: 'x', n, leaks: 0, evLossBB: 0, lastSeen, lastTag: '', recent: '', interval: 0, nextReview: '' })
    const m = mergeLeaks(
      { stats: { A: stat(10), B: stat(2) }, decisions: 12 },
      { stats: { A: stat(4), C: stat(7) }, decisions: 11 },
    )
    expect(m.stats.A.n).toBe(10)
    expect(Object.keys(m.stats).sort()).toEqual(['A', 'B', 'C'])
    expect(m.decisions).toBeGreaterThanOrEqual(19)
  })
})

describe('anotações e sessões de mesa', () => {
  const note = (id: string, updatedAt: number, body = id) => ({ id, title: id, body, createdAt: 1, updatedAt })

  it('união por id; a edição mais recente vence', () => {
    const m = mergeNotes(
      { notes: [note('n1', 5, 'local'), note('n2', 1)], deleted: {} },
      { notes: [note('n1', 9, 'nuvem'), note('n3', 3)], deleted: {} },
    )
    expect(m.notes.map((n: any) => n.id).sort()).toEqual(['n1', 'n2', 'n3'])
    expect(m.notes.find((n: any) => n.id === 'n1').body).toBe('nuvem')
  })

  it('apagar vale; mas uma edição POSTERIOR à lápide ressuscita a nota', () => {
    const m = mergeNotes(
      { notes: [], deleted: { n1: 100 } },
      { notes: [note('n1', 50), note('n2', 200)], deleted: {} },
    )
    expect(m.notes.map((n: any) => n.id)).toEqual(['n2'])
    const m2 = mergeNotes({ notes: [], deleted: { n1: 100 } }, { notes: [note('n1', 150)], deleted: {} })
    expect(m2.notes.map((n: any) => n.id)).toEqual(['n1'])
  })

  it('sessões de mesa: união, no máximo 50, e o XP do dia segue o dia mais novo', () => {
    const s = (i: number) => ({ id: `s${i}`, endedAt: i })
    const a = { sessions: Array.from({ length: 30 }, (_, i) => s(i)), xpDay: '2026-10-01', xpToday: 40 }
    const b = { sessions: Array.from({ length: 30 }, (_, i) => s(100 + i)), xpDay: '2026-10-02', xpToday: 10 }
    const m = mergePlay(a, b)
    expect(m.sessions).toHaveLength(50)
    expect(m.sessions[0].id).toBe('s129')
    expect(m).toMatchObject({ xpDay: '2026-10-02', xpToday: 10 })
  })
})

describe('perfil e utilidades', () => {
  const prof = (xp: number, at = 0) => ({ id: 'u', name: 'n', stats: { xp }, updatedAt: at })

  it('nuvem vazia (XP 0) não sobrescreve progresso local', () => {
    expect(mergeProfile(prof(500), prof(0, 9999)).stats.xp).toBe(500)
  })
  it('nuvem com mais XP vence e mantém o id local', () => {
    const m = mergeProfile({ ...prof(100), id: 'local' }, prof(900))
    expect(m.stats.xp).toBe(900)
    expect(m.id).toBe('local')
  })
  it('sem nuvem, fica o local', () => {
    expect(mergeProfile(prof(5), null).stats.xp).toBe(5)
  })

  it('lápides: limita o tamanho e guarda as mais recentes', () => {
    const big = Object.fromEntries(Array.from({ length: MAX_TOMBSTONES + 20 }, (_, i) => [`k${i}`, i]))
    const out = mergeTombstones(big, {})
    expect(Object.keys(out)).toHaveLength(MAX_TOMBSTONES)
    expect(out[`k${MAX_TOMBSTONES + 19}`]).toBeDefined()
    expect(out.k0).toBeUndefined()
  })

  it('sameData ignora a ordem das chaves', () => {
    expect(sameData({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true)
    expect(sameData({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('fusão é idempotente: aplicar de novo não muda o resultado (evita laço de envio)', () => {
    const a = { savedHands: [hand('a1', 3)], deleted: { z: 5 } }
    const b = { savedHands: [hand('b1', 4)], deleted: {} }
    const once = mergeHands(a, b)
    expect(sameData(mergeHands(once, b), once)).toBe(true)
    expect(sameData(mergeHands(once, once), once)).toBe(true)
  })
})
