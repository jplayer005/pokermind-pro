// Carrega e decodifica os spots push/fold empacotados (src/data/spots/pushfold.json).
// O JSON (~500 KB) vira um chunk separado: so baixa quando o drill e aberto.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const DECODE: Record<string, number> = {}
for (let i = 0; i < ALPHABET.length; i++) DECODE[ALPHABET[i]] = i

interface PackedFile {
  v: number
  hands: string[]
  spots: Record<string, [string, number, string]>
}

export interface Spot {
  id: string
  acao: 'push' | 'call'
  /** % de maos no range (do solver). */
  pct: number
  /** Frequencia (0..1) da acao agressiva para a mao. Mao desconhecida = 0. */
  freq: (hand: string) => number
}

export interface SpotBank {
  size: number
  get: (id: string) => Spot | undefined
  ids: () => string[]
}

export function buildBank(file: PackedFile): SpotBank {
  const index: Record<string, number> = {}
  file.hands.forEach((h, i) => (index[h] = i))

  return {
    size: Object.keys(file.spots).length,
    ids: () => Object.keys(file.spots),
    get(id) {
      const s = file.spots[id]
      if (!s) return undefined
      const [a, pct, enc] = s
      return {
        id,
        acao: a === 'p' ? 'push' : 'call',
        pct,
        freq: (hand) => {
          const i = index[hand]
          return i === undefined ? 0 : DECODE[enc[i]] / 63
        },
      }
    },
  }
}

let cache: Promise<SpotBank> | null = null

/** Carrega o banco uma unica vez (chunk separado). */
export function loadSpots(): Promise<SpotBank> {
  if (!cache) {
    cache = import('@/data/spots/pushfold.json').then((m) => buildBank(m.default as unknown as PackedFile))
    cache.catch(() => {
      cache = null // permite tentar de novo se o chunk falhar (offline)
    })
  }
  return cache
}
