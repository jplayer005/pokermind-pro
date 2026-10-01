import { describe, it, expect, beforeEach } from 'vitest'
import { MERGERS } from '@/engine/syncMerge'

const mods = async () => {
  const stores = await import('@/store')
  const docs = await import('../localDocs')
  return { ...stores, ...docs }
}

const hand = (id: string, date: number) => ({
  id, title: id, date, heroCards: [], board: [], players: [], actions: [], pot: 0, result: 0, notes: '', tags: ['manual'],
})

describe('ponte store <-> documento da nuvem', () => {
  beforeEach(async () => {
    const m = await mods()
    m.useHandsStore.setState({ savedHands: [], deleted: {} })
    m.useNotesStore.setState({ notes: [], deleted: {} })
  })

  it('apagar mão e anotação deixa lápide; mão apagada não volta quando a nuvem ainda a tem', async () => {
    const m = await mods()
    m.useHandsStore.setState({ savedHands: [hand('h1', 1), hand('h2', 2)] as never })
    m.useHandsStore.getState().deleteHand('h1')
    expect(m.useHandsStore.getState().deleted.h1).toBeGreaterThan(0)

    // a nuvem (outro aparelho) ainda tem h1 e h2
    const cloud = { savedHands: [hand('h1', 1), hand('h2', 2)], deleted: {} }
    const merged = MERGERS.hands(m.getLocalDoc('hands') as never, cloud)
    expect((merged.savedHands as { id: string }[]).map((h) => h.id)).toEqual(['h2'])
  })

  it('applyMergedDoc só aplica quando mudou (devolve false se igual: sem laço de envio)', async () => {
    const m = await mods()
    m.useNotesStore.getState().addNote('t', 'corpo')
    const local = m.getLocalDoc('notes') as never
    expect(m.applyMergedDoc('notes', MERGERS.notes(local, null))).toBe(false)

    const other = { notes: [{ id: 'z', title: 'z', body: 'veio da nuvem', createdAt: 1, updatedAt: 99999999999999 }], deleted: {} }
    expect(m.applyMergedDoc('notes', MERGERS.notes(local, other))).toBe(true)
    expect(m.useNotesStore.getState().notes.map((n) => n.id)).toContain('z')
    expect(m.useNotesStore.getState().notes).toHaveLength(2)
    // aplicar de novo o mesmo resultado nao muda nada
    expect(m.applyMergedDoc('notes', MERGERS.notes(m.getLocalDoc('notes') as never, other))).toBe(false)
  })

  it('documento desconhecido é ignorado', async () => {
    const m = await mods()
    expect(m.getLocalDoc('nada')).toBeNull()
    expect(m.applyMergedDoc('nada', {})).toBe(false)
  })
})
