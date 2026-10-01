import { describe, it, expect, beforeEach } from 'vitest'

// o store usa localStorage (persist); em node ele cai no storage em memoria do zustand
const load = async () => (await import('@/store')).useNotesStore

describe('anotacoes de estudo', () => {
  beforeEach(async () => {
    (await load()).setState({ notes: [] })
  })

  it('nota vazia nao e salva', async () => {
    const s = await load()
    expect(s.getState().addNote('', '   ')).toBeNull()
    expect(s.getState().notes).toHaveLength(0)
  })

  it('salva, usa a 1a linha como titulo e a nova fica no topo', async () => {
    const s = await load()
    const a = s.getState().addNote('', 'BTN vs BB 3bet\nusar A5s como bluff')
    const b = s.getState().addNote('ICM', 'bolha: apertar')
    expect(a && b).toBeTruthy()
    const { notes } = s.getState()
    expect(notes.map((n) => n.title)).toEqual(['ICM', 'BTN vs BB 3bet'])
    expect(notes[1].body).toContain('A5s')
  })

  it('edita sem mudar a data de criacao e exclui', async () => {
    const s = await load()
    const id = s.getState().addNote('t', 'corpo') as string
    const created = s.getState().notes[0].createdAt
    s.getState().updateNote(id, 'novo titulo', 'corpo novo')
    const n = s.getState().notes[0]
    expect(n.title).toBe('novo titulo')
    expect(n.body).toBe('corpo novo')
    expect(n.createdAt).toBe(created)
    expect(n.updatedAt).toBeGreaterThanOrEqual(created)
    s.getState().deleteNote(id)
    expect(s.getState().notes).toHaveLength(0)
  })

  it('titulo longo da primeira linha e cortado', async () => {
    const s = await load()
    s.getState().addNote('', 'x'.repeat(100))
    expect(s.getState().notes[0].title.length).toBeLessThanOrEqual(51)
  })
})
