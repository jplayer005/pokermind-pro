// ============================================================
// ENGINE: contagem de outs. Out = carta do baralho que melhora a mao do heroi ate uma categoria
// minima (flush, sequencia, trinca...) e que NAO melhora so o board (um 9 que faz dois pares
// para todo mundo nao e out). Base dos drills de odds.
// ============================================================
import { categoryOf, evaluate, HAND_CATEGORY } from '../evaluator'
import { rankOf } from '../cards'

/** Categoria de qualquer quantidade de cartas: o avaliador exige 5, o flop+carta tem 4. */
export function categoryAny(cards: readonly number[]): number {
  if (cards.length >= 5) return categoryOf(evaluate(cards))
  const counts = new Map<number, number>()
  for (const c of cards) counts.set(rankOf(c), (counts.get(rankOf(c)) ?? 0) + 1)
  const groups = [...counts.values()].sort((a, b) => b - a)
  if (groups[0] === 4) return HAND_CATEGORY.QUADS
  if (groups[0] === 3) return HAND_CATEGORY.TRIPS
  if (groups[0] === 2 && groups[1] === 2) return HAND_CATEGORY.TWO_PAIR
  if (groups[0] === 2) return HAND_CATEGORY.PAIR
  return HAND_CATEGORY.HIGH_CARD
}

/** Cartas que levam a mao do heroi a `minCategory` ou mais, sem ser so uma melhora do board. */
export function countOuts(hole: readonly [number, number], board: readonly number[], minCategory: number): number {
  if (board.length >= 5) return 0
  const used = new Set<number>([...hole, ...board])
  const base = categoryAny([...hole, ...board])
  let outs = 0
  for (let c = 0; c < 52; c++) {
    if (used.has(c)) continue
    const withCard = categoryAny([...hole, ...board, c])
    if (withCard >= minCategory && withCard > base && withCard > categoryAny([...board, c])) outs++
  }
  return outs
}
