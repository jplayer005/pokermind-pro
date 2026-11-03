// ============================================================
// Compartilhar imagem. Android (Capacitor): grava o PNG no cache e abre o menu nativo de
// compartilhar com o arquivo. Computador/navegador: compartilhamento do sistema quando aceita
// arquivos; senao baixa o PNG e copia a imagem para a area de transferencia.
// As partes de plataforma entram por `ShareDeps`, para testar os dois caminhos sem aparelho.
// ============================================================
import { Capacitor } from '@capacitor/core'

export type ShareStatus = 'shared' | 'cancelled' | 'downloaded' | 'error'

export interface ShareResult {
  status: ShareStatus
  /** So no download: a imagem tambem foi copiada para a area de transferencia. */
  copied: boolean
  /** Texto curto para o aviso na tela (vazio quando o usuario so fechou o menu). */
  message: string
}

export interface ShareOptions {
  title: string
  text?: string
  filename: string
}

export interface ShareDeps {
  isNative: () => boolean
  /** Grava o arquivo no cache do app e devolve o URI que o menu nativo aceita. */
  writeCache: (name: string, base64: string) => Promise<string>
  shareNative: (a: { title: string; text?: string; files: string[]; dialogTitle: string }) => Promise<void>
  /** `navigator.share`, quando existe. */
  share: ((data: ShareData) => Promise<void>) | undefined
  canShareFiles: (file: File) => boolean
  download: (blob: Blob, filename: string) => void
  copyImage: (blob: Blob) => Promise<boolean>
}

/** Nome de arquivo simples a partir do titulo: sem acento, sem simbolos, tamanho limitado. */
export function fileNameFor(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '')
  return slug ? `pokermind-${slug}.png` : 'pokermind.png'
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  return btoa(bin)
}

const isCancel = (e: unknown) =>
  (e instanceof Error && (e.name === 'AbortError' || /cancel/i.test(e.message))) ||
  (typeof e === 'object' && e !== null && /cancel/i.test(String((e as { message?: unknown }).message ?? '')))

/** Quanto esperar a area de transferencia antes de seguir so com o download. */
export const COPY_TIMEOUT_MS = 2500

const FAIL: ShareResult = { status: 'error', copied: false, message: 'Não foi possível compartilhar a imagem neste aparelho.' }

export async function shareImage(blob: Blob, opts: ShareOptions, deps: ShareDeps = defaultDeps()): Promise<ShareResult> {
  // Android: menu nativo com o arquivo
  if (deps.isNative()) {
    try {
      const uri = await deps.writeCache(opts.filename, await blobToBase64(blob))
      await deps.shareNative({ title: opts.title, text: opts.text, files: [uri], dialogTitle: 'Compartilhar' })
      return { status: 'shared', copied: false, message: 'Imagem compartilhada.' }
    } catch (e) {
      return isCancel(e) ? { status: 'cancelled', copied: false, message: '' } : FAIL
    }
  }

  // Computador/navegador: compartilhamento do sistema com arquivo, se houver
  const file = new File([blob], opts.filename, { type: 'image/png' })
  if (deps.share && deps.canShareFiles(file)) {
    try {
      await deps.share({ files: [file], title: opts.title, text: opts.text })
      return { status: 'shared', copied: false, message: 'Imagem compartilhada.' }
    } catch (e) {
      if (isCancel(e)) return { status: 'cancelled', copied: false, message: '' }
      // erro inesperado: cai para o download em vez de perder a imagem
    }
  }

  // Fallback: baixa o PNG e tenta copiar a imagem para colar em qualquer lugar
  try {
    deps.download(blob, opts.filename)
  } catch {
    return FAIL
  }
  // clipboard.write pode nunca responder (pagina sem foco, permissao pendente): sem limite o botao ficaria preso
  let timer: ReturnType<typeof setTimeout> | undefined
  const copied = await Promise.race([
    deps.copyImage(blob).catch(() => false),
    new Promise<boolean>((resolve) => { timer = setTimeout(() => resolve(false), COPY_TIMEOUT_MS) }),
  ])
  clearTimeout(timer)
  return {
    status: 'downloaded',
    copied,
    message: copied ? 'Imagem baixada e copiada: é só colar.' : 'Imagem baixada.',
  }
}

/** Implementacao real das partes de plataforma (os plugins nativos so sao carregados quando usados). */
export function defaultDeps(): ShareDeps {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  return {
    isNative: () => Capacitor.isNativePlatform(),
    writeCache: async (name, data) => {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const r = await Filesystem.writeFile({ path: `share/${name}`, data, directory: Directory.Cache, recursive: true })
      return r.uri
    },
    shareNative: async (a) => {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title: a.title, text: a.text, files: a.files, dialogTitle: a.dialogTitle })
    },
    share: nav && typeof nav.share === 'function' ? (d) => nav.share(d) : undefined,
    canShareFiles: (file) => !!nav && typeof nav.canShare === 'function' && nav.canShare({ files: [file] }),
    download: (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
    copyImage: async (blob) => {
      if (!nav?.clipboard?.write || typeof ClipboardItem === 'undefined') return false
      try {
        await nav.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        return true
      } catch {
        return false
      }
    },
  }
}
