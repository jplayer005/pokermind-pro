import { describe, it, expect, vi } from 'vitest'
import { COPY_TIMEOUT_MS, fileNameFor, shareImage, type ShareDeps } from '../share'

const png = () => new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], { type: 'image/png' })
const opts = { title: 'Open Raise, BTN', text: 'Range do PokerMind', filename: 'pokermind-open-raise-btn.png' }

function deps(over: Partial<ShareDeps> = {}): ShareDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    isNative: () => false,
    writeCache: vi.fn(async (name: string) => { calls.push(`write:${name}`); return `file:///cache/share/${name}` }),
    shareNative: vi.fn(async () => { calls.push('shareNative') }),
    share: undefined,
    canShareFiles: () => false,
    download: vi.fn(() => { calls.push('download') }),
    copyImage: vi.fn(async () => true),
    ...over,
  }
}

describe('fileNameFor', () => {
  it('vira um nome de arquivo simples, sem acento nem simbolo', () => {
    expect(fileNameFor('Open Raise • BTN • 100 bb')).toBe('pokermind-open-raise-btn-100-bb.png')
    expect(fileNameFor('Pós-Flop: Dois pares!')).toBe('pokermind-pos-flop-dois-pares.png')
  })
  it('limita o tamanho e tem um nome padrao para titulo vazio', () => {
    const name = fileNameFor('a'.repeat(200))
    expect(name.length).toBeLessThanOrEqual('pokermind-'.length + 50 + '.png'.length)
    expect(fileNameFor('   ')).toBe('pokermind.png')
    expect(fileNameFor('')).toBe('pokermind.png')
  })
})

describe('shareImage: Android (nativo)', () => {
  it('grava o PNG no cache e abre o menu nativo com o arquivo', async () => {
    const d = deps({ isNative: () => true })
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('shared')
    expect(d.calls).toEqual([`write:${opts.filename}`, 'shareNative'])
    // o conteudo gravado e o PNG, em base64
    const base64 = (d.writeCache as ReturnType<typeof vi.fn>).mock.calls[0][1] as string
    expect(Array.from(atob(base64), (c) => c.charCodeAt(0)).slice(0, 4)).toEqual([137, 80, 78, 71])
    const args = (d.shareNative as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(args.files).toEqual([`file:///cache/share/${opts.filename}`])
    expect(args.title).toBe(opts.title)
  })

  it('fechar o menu nativo nao e erro', async () => {
    const d = deps({ isNative: () => true, shareNative: vi.fn(async () => { throw new Error('Share canceled') }) })
    expect((await shareImage(png(), opts, d)).status).toBe('cancelled')
  })

  it('falha ao gravar ou compartilhar vira erro com mensagem clara', async () => {
    const d = deps({ isNative: () => true, writeCache: vi.fn(async () => { throw new Error('disco cheio') }) })
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('error')
    expect(r.message).toMatch(/Não foi possível/)
  })
})

describe('shareImage: computador e navegador', () => {
  it('usa o compartilhamento do sistema quando aceita arquivos', async () => {
    const share = vi.fn(async (_data: ShareData) => undefined)
    const d = deps({ share, canShareFiles: () => true })
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('shared')
    const arg = share.mock.calls[0][0] as { files: File[]; title: string }
    expect(arg.files[0].name).toBe(opts.filename)
    expect(arg.files[0].type).toBe('image/png')
    expect(d.download).not.toHaveBeenCalled()
  })

  it('fechar a janela de compartilhar nao baixa nada', async () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' })
    const d = deps({ share: vi.fn(async () => { throw abort }), canShareFiles: () => true })
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('cancelled')
    expect(d.download).not.toHaveBeenCalled()
  })

  it('sem compartilhamento de arquivo, baixa o PNG e copia a imagem', async () => {
    const d = deps()
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('downloaded')
    expect(r.copied).toBe(true)
    expect(r.message).toMatch(/copiada/)
    expect(d.download).toHaveBeenCalledOnce()
  })

  it('se a area de transferencia falhar, ainda baixa e avisa so do download', async () => {
    const d = deps({ copyImage: vi.fn(async () => false) })
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('downloaded')
    expect(r.copied).toBe(false)
    expect(r.message).not.toMatch(/copiada/)
  })

  it('area de transferencia que nunca responde nao trava: segue so com o download', async () => {
    vi.useFakeTimers()
    try {
      const d = deps({ copyImage: vi.fn(() => new Promise<boolean>(() => undefined)) })
      const pending = shareImage(png(), opts, d)
      await vi.advanceTimersByTimeAsync(COPY_TIMEOUT_MS + 50)
      const r = await pending
      expect(r.status).toBe('downloaded')
      expect(r.copied).toBe(false)
      expect(d.download).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('erro inesperado no compartilhamento do sistema cai para o download', async () => {
    const d = deps({ share: vi.fn(async () => { throw new Error('boom') }), canShareFiles: () => true })
    const r = await shareImage(png(), opts, d)
    expect(r.status).toBe('downloaded')
    expect(d.download).toHaveBeenCalledOnce()
  })

  it('as mensagens nao usam travessao', async () => {
    const msgs = [
      (await shareImage(png(), opts, deps())).message,
      (await shareImage(png(), opts, deps({ copyImage: vi.fn(async () => false) }))).message,
      (await shareImage(png(), opts, deps({ isNative: () => true, writeCache: vi.fn(async () => { throw new Error('x') }) }))).message,
    ]
    for (const m of msgs) expect(m).not.toMatch(/[–—]/)
  })
})
