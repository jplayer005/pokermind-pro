import { describe, it, expect, vi, beforeEach } from 'vitest'

// Firestore falso em memoria: so o que o sync usa (doc, runTransaction, getDoc, deleteDoc).
const cloud = new Map<string, Record<string, unknown>>()
let failTransactionFor: string | null = null

vi.mock('../config', () => ({ db: {} }))
vi.mock('firebase/firestore', () => {
  class Timestamp { toMillis() { return 0 } }
  return {
    Timestamp,
    serverTimestamp: () => 'SERVER_TS',
    doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    getDoc: async (ref: { path: string }) => ({
      exists: () => cloud.has(ref.path),
      data: () => cloud.get(ref.path),
    }),
    deleteDoc: async (ref: { path: string }) => { cloud.delete(ref.path) },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
      const staged = new Map<string, Record<string, unknown>>()
      let path = ''
      const tx = {
        get: async (ref: { path: string }) => {
          path = ref.path
          if (failTransactionFor && ref.path.endsWith(failTransactionFor)) throw new Error('permission-denied')
          return { exists: () => cloud.has(ref.path), data: () => cloud.get(ref.path) }
        },
        set: (ref: { path: string }, value: Record<string, unknown>) => { staged.set(ref.path, value) },
      }
      await fn(tx)
      for (const [k, v] of staged) cloud.set(k, v)
      void path
    },
  }
})

const sync = async () => import('../sync')
const hand = (id: string, date: number) => ({ id, date, tags: ['manual'], title: id })
const docPath = (name: string) => `users/u1/data/${name}`

describe('envio com transação (dois aparelhos)', () => {
  beforeEach(() => { cloud.clear(); failTransactionFor = null })

  it('o segundo aparelho não apaga o que o primeiro enviou: a nuvem guarda a união', async () => {
    const { uploadUserData } = await sync()
    await uploadUserData('u1', { hands: { savedHands: [hand('a1', 2)], deleted: {} } })
    const b = await uploadUserData('u1', { hands: { savedHands: [hand('b1', 3)], deleted: {} } })

    const stored = cloud.get(docPath('hands')) as { savedHands: { id: string }[] }
    expect(stored.savedHands.map((h) => h.id).sort()).toEqual(['a1', 'b1'])
    // e o aparelho B recebe de volta o resultado para aplicar localmente
    expect((b.merged.hands.savedHands as { id: string }[]).map((h) => h.id).sort()).toEqual(['a1', 'b1'])
    expect(stored).toHaveProperty('updatedAt', 'SERVER_TS')
  })

  it('envios repetidos do mesmo estado não mudam a nuvem (sem laço)', async () => {
    const { uploadUserData } = await sync()
    const payload = { notes: { notes: [{ id: 'n1', title: 't', body: 'b', createdAt: 1, updatedAt: 5 }], deleted: {} } }
    await uploadUserData('u1', payload)
    const first = JSON.stringify(cloud.get(docPath('notes')))
    const again = await uploadUserData('u1', payload)
    expect(JSON.stringify(cloud.get(docPath('notes')))).toBe(first)
    expect(again.failed).toEqual({})
  })

  it('apagar num aparelho vale na nuvem: a lápide impede a mão de voltar', async () => {
    const { uploadUserData } = await sync()
    await uploadUserData('u1', { hands: { savedHands: [hand('x', 1), hand('y', 2)], deleted: {} } })
    // aparelho A apagou "y"; o aparelho B ainda tem as duas
    await uploadUserData('u1', { hands: { savedHands: [hand('x', 1)], deleted: { y: 999 } } })
    const b = await uploadUserData('u1', { hands: { savedHands: [hand('x', 1), hand('y', 2)], deleted: {} } })
    expect((b.merged.hands.savedHands as { id: string }[]).map((h) => h.id)).toEqual(['x'])
  })

  it('falha em um documento não derruba os outros', async () => {
    const { uploadUserData } = await sync()
    failTransactionFor = '/notes'
    const r = await uploadUserData('u1', {
      notes: { notes: [], deleted: {} },
      play: { sessions: [], xpDay: '', xpToday: 0 },
    })
    expect(Object.keys(r.failed)).toEqual(['notes'])
    expect(cloud.has(docPath('play'))).toBe(true)
  })

  it('documentos marcados como não seguros não são gravados', async () => {
    const { uploadUserData } = await sync()
    const r = await uploadUserData('u1', { hands: { savedHands: [hand('a', 1)], deleted: {} } }, ['hands'])
    expect(cloud.has(docPath('hands'))).toBe(false)
    expect(r.merged).toEqual({})
  })

  it('apagar a nuvem remove só os documentos pedidos', async () => {
    const { uploadUserData, clearUserCloudData } = await sync()
    await uploadUserData('u1', {
      hands: { savedHands: [hand('a', 1)], deleted: {} },
      play: { sessions: [], xpDay: '', xpToday: 0 },
    })
    await clearUserCloudData('u1', ['play'])
    expect(cloud.has(docPath('play'))).toBe(false)
    expect(cloud.has(docPath('hands'))).toBe(true)
    await clearUserCloudData('u1')
    expect(cloud.size).toBe(0)
  })
})
