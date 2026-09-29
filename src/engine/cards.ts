// ============================================================
// ENGINE: cartas como inteiros 0..51 (rank * 4 + suit)
// rank 0..12 = 2..A, suit 0..3 = s h d c
// ============================================================
import type { Card, Rank, Suit } from '@/types'

export type Rng = () => number

export const RANK_CHARS = '23456789TJQKA'
const SUIT_LIST: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

/** RNG determinístico para testes e replays. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rankOf = (c: number) => c >> 2
export const suitOf = (c: number) => c & 3

export function toInt(card: Card): number {
  return RANK_CHARS.indexOf(card.rank) * 4 + SUIT_LIST.indexOf(card.suit)
}

export function fromInt(c: number): Card {
  return { rank: RANK_CHARS[c >> 2] as Rank, suit: SUIT_LIST[c & 3] }
}

/** "As" -> int. Naipes: s h d c. */
export function parseCard(text: string): number {
  const r = RANK_CHARS.indexOf(text[0].toUpperCase())
  const s = 'shdc'.indexOf(text[1].toLowerCase())
  if (r < 0 || s < 0) throw new Error(`Carta invalida: ${text}`)
  return r * 4 + s
}

export function parseCards(text: string): number[] {
  return text.trim().split(/\s+/).filter(Boolean).map(parseCard)
}

/** Embaralha parcialmente: devolve `count` cartas distintas fora de `dead`. */
export function drawCards(count: number, dead: readonly number[], rng: Rng = Math.random): number[] {
  const deadSet = new Set(dead)
  const deck: number[] = []
  for (let c = 0; c < 52; c++) if (!deadSet.has(c)) deck.push(c)
  const n = Math.min(count, deck.length)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (deck.length - i))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck.slice(0, n)
}

/**
 * Classe canonica (AA, AKs, AKo) de duas cartas.
 * Ordem: rank maior primeiro.
 */
export function canonical169(c1: number, c2: number): string {
  let r1 = rankOf(c1)
  let r2 = rankOf(c2)
  if (r1 < r2) [r1, r2] = [r2, r1]
  if (r1 === r2) return RANK_CHARS[r1] + RANK_CHARS[r2]
  return RANK_CHARS[r1] + RANK_CHARS[r2] + (suitOf(c1) === suitOf(c2) ? 's' : 'o')
}

/**
 * Sorteia uma mao canonica ponderada por combos (par 6, suited 4, offsuit 12),
 * o que reproduz a frequencia real de receber cada mao.
 */
export function randomCanonical(rng: Rng = Math.random): string {
  const [c1, c2] = drawCards(2, [], rng)
  return canonical169(c1, c2)
}
