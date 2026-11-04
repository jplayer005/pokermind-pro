// ============================================================
// ENGINE: quem cobre quem. Em torneio, quem tem o maior stack da mao pode eliminar o outro; o selo
// "voce cobre" / "te cobre" mostra isso nos assentos. Compara o stack do INICIO da mao.
// ============================================================
import type { Seat } from './types'

/** Diferenca relativa abaixo da qual os stacks contam como iguais (sem selo). */
const SAME_STACK = 0.03

export type Cover = 'hero' | 'villain'

/** 'hero' = o heroi cobre este assento; 'villain' = este assento cobre o heroi; null = sem selo. */
export function coverOf(hero: Seat, seat: Seat): Cover | null {
  if (hero.id === seat.id || hero.out || seat.out || seat.folded) return null
  const big = Math.max(hero.startStack, seat.startStack)
  if (big <= 0 || Math.abs(hero.startStack - seat.startStack) / big < SAME_STACK) return null
  return hero.startStack > seat.startStack ? 'hero' : 'villain'
}
