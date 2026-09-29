// ============================================================
// Sons e vibracao da mesa. Sons sao sintetizados (WebAudio), sem arquivos.
// Respeita a opcao "Som" das configuracoes. Tudo protegido: sem suporte, nao faz nada.
// A vibracao usa navigator.vibrate; em alguns WebViews Android ela pode nao existir.
// ============================================================
import { useUIStore } from '@/store'

export type Sfx = 'deal' | 'chip' | 'turn' | 'win' | 'lose' | 'fold'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(a: AudioContext, freq: number, dur: number, at: number, type: OscillatorType = 'sine', gain = 0.05) {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.value = freq
  const t0 = a.currentTime + at
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(a.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

const PATTERNS: Record<Sfx, (a: AudioContext) => void> = {
  deal: (a) => tone(a, 520, 0.05, 0, 'triangle', 0.035),
  chip: (a) => {
    tone(a, 1400, 0.04, 0, 'square', 0.02)
    tone(a, 1900, 0.05, 0.03, 'square', 0.015)
  },
  fold: (a) => tone(a, 200, 0.08, 0, 'sine', 0.04),
  turn: (a) => {
    tone(a, 660, 0.09, 0, 'sine', 0.05)
    tone(a, 880, 0.12, 0.09, 'sine', 0.05)
  },
  win: (a) => {
    tone(a, 523, 0.1, 0, 'triangle', 0.05)
    tone(a, 659, 0.1, 0.1, 'triangle', 0.05)
    tone(a, 784, 0.18, 0.2, 'triangle', 0.05)
  },
  lose: (a) => {
    tone(a, 330, 0.12, 0, 'sine', 0.04)
    tone(a, 262, 0.2, 0.12, 'sine', 0.04)
  },
}

const VIBRATION: Partial<Record<Sfx, number | number[]>> = {
  turn: 25,
  win: [30, 40, 30],
  lose: 60,
}

export function playSfx(kind: Sfx): void {
  if (!useUIStore.getState().soundEnabled) return
  const a = audio()
  if (a) {
    try {
      PATTERNS[kind](a)
    } catch {
      /* som e opcional */
    }
  }
  const v = VIBRATION[kind]
  if (v !== undefined) {
    try {
      navigator.vibrate?.(v)
    } catch {
      /* vibracao e opcional */
    }
  }
}
