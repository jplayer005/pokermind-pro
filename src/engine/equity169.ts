// Tabela de equity pre-flop mao contra mao (169 x 169), do treinador-poker.
// Vem de Monte Carlo simetrizado: erro tipico de ~0,3 ponto percentual. Serve para EV
// aproximado de push/fold, nao para decisoes exatas. Chunk separado (carrega sob demanda).

const N = 169

interface Packed {
  v: number
  hands: string[]
  q: string
}

export interface EquityTable {
  /** Equity (0..1) da mao `a` contra a mao `b`. Maos desconhecidas valem 0,5. */
  eq: (a: string, b: string) => number
  hands: readonly string[]
}

function decode(p: Packed): EquityTable {
  const bin = atob(p.q)
  const values = new Float32Array(N * N)
  for (let i = 0; i < N * N; i++) {
    const lo = bin.charCodeAt(i * 2)
    const hi = bin.charCodeAt(i * 2 + 1)
    values[i] = (lo | (hi << 8)) / 10000
  }
  const index: Record<string, number> = {}
  p.hands.forEach((h, i) => (index[h] = i))
  return {
    hands: p.hands,
    eq: (a, b) => {
      const i = index[a]
      const j = index[b]
      return i === undefined || j === undefined ? 0.5 : values[i * N + j]
    },
  }
}

let cache: Promise<EquityTable> | null = null
let loaded: EquityTable | null = null

export function loadEquity169(): Promise<EquityTable> {
  if (!cache) {
    cache = import('@/data/spots/equity169.json').then((m) => {
      loaded = decode(m.default as unknown as Packed)
      return loaded
    })
    cache.catch(() => {
      cache = null
    })
  }
  return cache
}

/** A tabela ja carregada, ou null (uso sincrono no coach apos loadEquity169). */
export function peekEquity169(): EquityTable | null {
  return loaded
}

export { decode as decodeEquity169 }
export type { Packed as PackedEquity169 }
