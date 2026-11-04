// ============================================================
// Manter a tela ligada enquanto se joga ou treina. Android: o plugin liga a flag nativa de tela
// acesa; navegador: usa a API de Wake Lock, que o sistema solta quando a aba fica oculta, entao
// o bloqueio e refeito ao voltar para o primeiro plano. Erros sao engolidos: nunca derrubam o jogo.
// ============================================================
import { KeepAwake } from '@capacitor-community/keep-awake'

export interface KeepAwakePlugin {
  isSupported(): Promise<{ isSupported: boolean }>
  keepAwake(): Promise<void>
  allowSleep(): Promise<void>
}

interface DocLike {
  visibilityState: string
  addEventListener(event: string, fn: () => void): void
  removeEventListener(event: string, fn: () => void): void
}

/** Telas em que a tela do aparelho fica ligada: mesa, treinos e o jogo de odds. */
export const KEEP_AWAKE_ROUTES = ['/play', '/odds', '/preflop', '/postflop', '/pushfold', '/ranges'] as const

export const shouldKeepAwake = (path: string): boolean =>
  KEEP_AWAKE_ROUTES.some((r) => path === r || path.startsWith(`${r}/`))

export function createKeepAwake(
  plugin: KeepAwakePlugin = KeepAwake as unknown as KeepAwakePlugin,
  doc: DocLike = document,
) {
  let on = false
  let held = false

  const acquire = async () => {
    if (!on) return
    try {
      const { isSupported } = await plugin.isSupported()
      if (!isSupported || !on) return
      await plugin.keepAwake()
      held = true
    } catch {
      // sem permissao ou sem suporte: a tela dorme normalmente
    }
  }
  const onVisibility = () => {
    if (doc.visibilityState === 'visible') void acquire()
  }

  return {
    start() {
      if (on) return
      on = true
      doc.addEventListener('visibilitychange', onVisibility)
      void acquire()
    },
    stop() {
      if (!on) return
      on = false
      doc.removeEventListener('visibilitychange', onVisibility)
      if (held) {
        held = false
        void plugin.allowSleep().catch(() => undefined)
      }
    },
  }
}
