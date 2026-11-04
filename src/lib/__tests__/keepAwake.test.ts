import { describe, it, expect, vi } from 'vitest'
import { createKeepAwake, KEEP_AWAKE_ROUTES, shouldKeepAwake, type KeepAwakePlugin } from '../keepAwake'

function fakePlugin(over: Partial<KeepAwakePlugin> = {}): KeepAwakePlugin & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    isSupported: vi.fn(async () => ({ isSupported: true })),
    keepAwake: vi.fn(async () => { calls.push('keep') }),
    allowSleep: vi.fn(async () => { calls.push('sleep') }),
    ...over,
  }
}

/** Documento falso so com o que o controlador usa. */
function fakeDoc() {
  const listeners: Record<string, (() => void)[]> = {}
  return {
    visibilityState: 'visible' as 'visible' | 'hidden',
    addEventListener: vi.fn((ev: string, fn: () => void) => { (listeners[ev] ??= []).push(fn) }),
    removeEventListener: vi.fn((ev: string, fn: () => void) => { listeners[ev] = (listeners[ev] ?? []).filter((f) => f !== fn) }),
    fire: (ev: string) => (listeners[ev] ?? []).forEach((f) => f()),
    count: (ev: string) => (listeners[ev] ?? []).length,
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('createKeepAwake: manter a tela ligada', () => {
  it('start liga a tela e stop libera', async () => {
    const p = fakePlugin()
    const k = createKeepAwake(p, fakeDoc())
    k.start()
    await flush()
    expect(p.calls).toEqual(['keep'])
    k.stop()
    await flush()
    expect(p.calls).toEqual(['keep', 'sleep'])
  })

  it('ao voltar para o primeiro plano liga de novo (o sistema solta o bloqueio ao ocultar)', async () => {
    const p = fakePlugin()
    const d = fakeDoc()
    const k = createKeepAwake(p, d)
    k.start()
    await flush()
    d.visibilityState = 'hidden'
    d.fire('visibilitychange')
    await flush()
    expect(p.calls).toEqual(['keep']) // oculto: nada a fazer
    d.visibilityState = 'visible'
    d.fire('visibilitychange')
    await flush()
    expect(p.calls).toEqual(['keep', 'keep'])
    k.stop()
  })

  it('stop remove o ouvinte, e depois de parar nada liga a tela', async () => {
    const p = fakePlugin()
    const d = fakeDoc()
    const k = createKeepAwake(p, d)
    k.start()
    await flush()
    expect(d.count('visibilitychange')).toBe(1)
    k.stop()
    await flush()
    expect(d.count('visibilitychange')).toBe(0)
    d.fire('visibilitychange')
    await flush()
    expect(p.calls.filter((c) => c === 'keep')).toHaveLength(1)
  })

  it('sem suporte nao chama o plugin e nao quebra', async () => {
    const p = fakePlugin({ isSupported: vi.fn(async () => ({ isSupported: false })) })
    const k = createKeepAwake(p, fakeDoc())
    k.start()
    await flush()
    expect(p.calls).toEqual([])
    k.stop()
    await flush()
    expect(p.calls).toEqual([])
  })

  it('erros do plugin sao engolidos: a tela ligada nunca derruba o jogo', async () => {
    const p = fakePlugin({ keepAwake: vi.fn(async () => { throw new Error('negado') }), allowSleep: vi.fn(async () => { throw new Error('x') }) })
    const k = createKeepAwake(p, fakeDoc())
    expect(() => k.start()).not.toThrow()
    await flush()
    expect(() => k.stop()).not.toThrow()
    await flush()
  })

  it('start duas vezes nao duplica o ouvinte', async () => {
    const d = fakeDoc()
    const k = createKeepAwake(fakePlugin(), d)
    k.start()
    k.start()
    await flush()
    expect(d.count('visibilitychange')).toBe(1)
    k.stop()
  })
})

describe('shouldKeepAwake: em quais telas a tela fica ligada', () => {
  it('mesa, treinos e jogo de odds mantem a tela ligada', () => {
    for (const r of KEEP_AWAKE_ROUTES) expect(shouldKeepAwake(r)).toBe(true)
    for (const path of ['/play', '/odds', '/preflop', '/postflop', '/pushfold', '/ranges']) expect(shouldKeepAwake(path)).toBe(true)
  })

  it('dashboard, configuracoes e perfil deixam a tela dormir normalmente', () => {
    for (const path of ['/dashboard', '/settings', '/profile', '/study', '/replayer', '/']) expect(shouldKeepAwake(path)).toBe(false)
  })

  it('aceita subcaminhos', () => {
    expect(shouldKeepAwake('/play/qualquer')).toBe(true)
  })
})
