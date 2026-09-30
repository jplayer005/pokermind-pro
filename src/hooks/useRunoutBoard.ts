// Quando todos estao all-in, o board sai por etapas (flop, turn, river) em vez de aparecer
// inteiro de uma vez. O motor ja terminou a mao; aqui e so apresentacao.
import { useLayoutEffect, useState } from 'react'
import type { GameState } from '@/engine/game/types'

/** Intervalo entre as etapas do runout (ms). */
export const RUNOUT_STEP_MS = 1100

/** Quantas etapas (flop/turn/river) ainda saem depois de `from` cartas. */
export function runoutStages(from: number, total: number): number[] {
  return [3, 4, 5].filter((n) => n > from && n <= total)
}

/** Tempo total (ms) que o runout leva para terminar de aparecer. */
export function runoutDurationMs(game: GameState): number {
  const r = game.result
  if (!game.over || !r?.runout || r.runoutFrom < 0) return 0
  return runoutStages(r.runoutFrom, game.board.length).length * RUNOUT_STEP_MS
}

export function useRunoutBoard(game: GameState): { board: number[]; done: boolean } {
  const total = game.board.length
  const from = game.result?.runoutFrom ?? -1
  const animate = game.over && !!game.result?.runout && from >= 0 && from < total
  const [shown, setShown] = useState(total)

  // useLayoutEffect: evita um quadro com o board completo antes de comecar a revelar
  useLayoutEffect(() => {
    if (!animate) {
      setShown(total)
      return
    }
    setShown(from)
    const timers = runoutStages(from, total).map((n, i) => setTimeout(() => setShown(n), RUNOUT_STEP_MS * (i + 1)))
    return () => timers.forEach(clearTimeout)
    // recomeca a cada mao (handNumber) e quando o board muda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, game.handNumber, total, from])

  return { board: game.board.slice(0, shown), done: !animate || shown >= total }
}
