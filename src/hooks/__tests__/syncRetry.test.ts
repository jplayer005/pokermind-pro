import { describe, it, expect, vi } from 'vitest'

vi.mock('@capacitor/app', () => ({ App: { addListener: async () => ({ remove: () => {} }) } }))
vi.mock('@/firebase/sync', () => ({ SYNC_DOCS: [], DOC_SIZE_LIMIT: 1, uploadUserData: async () => ({}) }))

describe('nova tentativa de envio', () => {
  it('a espera cresce a cada falha e para em 5 minutos', async () => {
    const { retryDelay } = await import('../useSyncTrigger')
    expect([0, 1, 2, 3, 4, 10].map(retryDelay)).toEqual([5_000, 15_000, 60_000, 300_000, 300_000, 300_000])
    expect(retryDelay(-3)).toBe(5_000)
  })

  it('documento grande demais não fica tentando; falha de rede sim', async () => {
    const { isPermanentFailure } = await import('../useSyncTrigger')
    expect(isPermanentFailure('Error: documento grande demais')).toBe(true)
    expect(isPermanentFailure('unavailable')).toBe(false)
    expect(isPermanentFailure('permission-denied')).toBe(false)
  })
})
