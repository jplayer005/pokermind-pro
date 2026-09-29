// ============================================================
// ENGINE: avaliador real de 5 a 7 cartas
// Devolve um unico inteiro comparavel: categoria << 20 | 5 kickers (4 bits cada)
// ============================================================
import { RANK_CHARS } from './cards'

export const HAND_CATEGORY = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  TRIPS: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  QUADS: 7,
  STRAIGHT_FLUSH: 8,
} as const

const WHEEL = 0b1000000001111 // A 5 4 3 2

/** Maior carta do straight em um mask de ranks (0..12), ou -1. A-5 devolve 3. */
function straightHigh(mask: number): number {
  for (let h = 12; h >= 4; h--) {
    if (((mask >> (h - 4)) & 31) === 31) return h
  }
  return (mask & WHEEL) === WHEEL ? 3 : -1
}

/** Empacota os `n` maiores ranks do mask (ignorando os bits de `skip`). */
function topKickers(mask: number, skip: number, n: number): number {
  let out = 0
  let taken = 0
  for (let r = 12; r >= 0 && taken < n; r--) {
    if ((mask >> r) & 1 && !((skip >> r) & 1)) {
      out = (out << 4) | r
      taken++
    }
  }
  while (taken < n) {
    out <<= 4
    taken++
  }
  return out
}

const pack = (cat: number, kickers: number, kickerCount: number) =>
  (cat << 20) | (kickers << ((5 - kickerCount) * 4))

export function evaluate(cards: ArrayLike<number>): number {
  const counts = new Int8Array(13)
  const suitMask = [0, 0, 0, 0]
  const suitCount = [0, 0, 0, 0]
  let rankMask = 0

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i]
    const r = c >> 2
    const s = c & 3
    counts[r]++
    suitMask[s] |= 1 << r
    suitCount[s]++
    rankMask |= 1 << r
  }

  // Flush / straight flush
  let flushMask = 0
  for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushMask = suitMask[s]
  if (flushMask) {
    const sf = straightHigh(flushMask)
    if (sf >= 0) return pack(HAND_CATEGORY.STRAIGHT_FLUSH, sf, 1)
  }

  let quad = -1
  let trip = -1
  let pair1 = -1
  let pair2 = -1
  for (let r = 12; r >= 0; r--) {
    const n = counts[r]
    if (n === 4 && quad < 0) quad = r
    else if (n === 3) {
      if (trip < 0) trip = r
      else if (pair1 < 0) pair1 = r // segunda trinca serve de par no full house
    } else if (n === 2) {
      if (pair1 < 0) pair1 = r
      else if (pair2 < 0) pair2 = r
    }
  }

  if (quad >= 0) {
    const k = topKickers(rankMask, 1 << quad, 1)
    return pack(HAND_CATEGORY.QUADS, (quad << 4) | k, 2)
  }
  if (trip >= 0 && pair1 >= 0) {
    return pack(HAND_CATEGORY.FULL_HOUSE, (trip << 4) | pair1, 2)
  }
  if (flushMask) {
    return pack(HAND_CATEGORY.FLUSH, topKickers(flushMask, 0, 5), 5)
  }
  const st = straightHigh(rankMask)
  if (st >= 0) return pack(HAND_CATEGORY.STRAIGHT, st, 1)

  if (trip >= 0) {
    const k = topKickers(rankMask, 1 << trip, 2)
    return pack(HAND_CATEGORY.TRIPS, (trip << 8) | k, 3)
  }
  if (pair1 >= 0 && pair2 >= 0) {
    // Tres pares: o terceiro par entra como candidato a kicker
    const k = topKickers(rankMask, (1 << pair1) | (1 << pair2), 1)
    return pack(HAND_CATEGORY.TWO_PAIR, (pair1 << 8) | (pair2 << 4) | k, 3)
  }
  if (pair1 >= 0) {
    const k = topKickers(rankMask, 1 << pair1, 3)
    return pack(HAND_CATEGORY.PAIR, (pair1 << 12) | k, 4)
  }
  return pack(HAND_CATEGORY.HIGH_CARD, topKickers(rankMask, 0, 5), 5)
}

export const categoryOf = (score: number) => score >> 20

const NAMES_PT = [
  'Carta alta', 'Par', 'Dois pares', 'Trinca', 'Sequencia',
  'Flush', 'Full house', 'Quadra', 'Straight flush',
]

const rc = (nibble: number) => RANK_CHARS[nibble]

/** Descricao curta em pt-BR, ex.: "Dois pares, K e 7, kicker Q". */
export function describe(score: number): string {
  const cat = score >> 20
  const k = [(score >> 16) & 15, (score >> 12) & 15, (score >> 8) & 15, (score >> 4) & 15, score & 15]
  switch (cat) {
    case HAND_CATEGORY.STRAIGHT_FLUSH:
      return k[0] === 12 ? 'Royal flush' : `Straight flush ate ${rc(k[0])}`
    case HAND_CATEGORY.QUADS:
      return `Quadra de ${rc(k[0])}, kicker ${rc(k[1])}`
    case HAND_CATEGORY.FULL_HOUSE:
      return `Full house, ${rc(k[0])} cheio de ${rc(k[1])}`
    case HAND_CATEGORY.FLUSH:
      return `Flush, ${rc(k[0])} alto`
    case HAND_CATEGORY.STRAIGHT:
      return `Sequencia ate ${rc(k[0])}`
    case HAND_CATEGORY.TRIPS:
      return `Trinca de ${rc(k[0])}, kickers ${rc(k[1])} ${rc(k[2])}`
    case HAND_CATEGORY.TWO_PAIR:
      return `Dois pares, ${rc(k[0])} e ${rc(k[1])}, kicker ${rc(k[2])}`
    case HAND_CATEGORY.PAIR:
      return `Par de ${rc(k[0])}, kickers ${rc(k[1])} ${rc(k[2])} ${rc(k[3])}`
    default:
      return `${NAMES_PT[0]} ${rc(k[0])}, ${rc(k[1])} ${rc(k[2])} ${rc(k[3])} ${rc(k[4])}`
  }
}
