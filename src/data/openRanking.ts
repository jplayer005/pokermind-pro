// ============================================================
// Ranking das 169 maos para ABRIR o pote (da mais forte para a mais fraca) e os ranges de abertura
// por posicao gerados a partir dele: cada posicao tem uma COBERTURA-ALVO (% das maos) e o range e
// o topo do ranking ate essa cobertura. A meta e que a MEDIA das aberturas de todas as posicoes fique
// entre 20% e 25% das maos (ver engine/ranges/coverage e o teste openRanking). Trocar um alvo altera o app:
// coach, bots, treino de pre-flop, consulta de range e Pinte o range.
// ============================================================
import { generateHandGrid } from '@/lib/poker'
import type { Position } from '@/types'

/** As maos mais jogaveis, na ordem de abertura (suited e conectadas valem mais que offsuit fraco). */
const CURATED = [
  'AA', 'KK', 'QQ', 'AKs', 'JJ', 'AQs', 'KQs', 'AKo', 'AJs', 'KJs', 'TT', 'AQo', 'ATs', 'QJs', 'KTs', 'QTs', 'JTs', '99',
  'AJo', 'KQo', 'A9s', 'A5s', 'A8s', '88', 'A4s', 'A7s', 'A3s', 'K9s', 'T9s', 'A6s', 'A2s', 'ATo', 'KJo', 'Q9s', 'J9s', '77',
  '98s', 'QJo', 'K8s', '87s', 'T8s', 'KTo', 'J8s', '66', '76s', 'K7s', 'A9o', 'QTo', '97s', '65s', 'Q8s', 'K6s', 'JTo', '55',
  '86s', '54s', 'K5s', 'A8o', '75s', 'T7s', 'J7s', 'K4s', 'Q7s', '96s', 'K9o', '44', 'A7o', '64s', 'K3s', 'A5o', '85s', 'Q6s',
  'K2s', '53s', 'T9o', 'Q9o', '33', 'J9o', 'A6o', '74s', 'A4o', '98o', 'Q5s', 'T6s', 'J6s', '22', '43s', 'A3o', '63s', 'J5s',
  'Q4s', 'K8o', '87o', '95s', 'A2o', '52s', 'T5s', 'Q3s', 'J4s', 'K7o',
]

/** Pontuacao simples (carta alta, carta baixa, suited, par) so para ordenar as maos que sobram no fim. */
function tailScore(h: string): number {
  const R = 'AKQJT98765432'
  const hi = 12 - R.indexOf(h[0])
  const lo = 12 - R.indexOf(h[1])
  return h.length === 2 ? 30 + hi * 2 : hi * 2 + lo + (h.endsWith('s') ? 4 : 0)
}

const ALL = generateHandGrid().flat()
const REST = ALL.filter((h) => !CURATED.includes(h)).sort((a, b) => tailScore(b) - tailScore(a))

/** As 169 maos, da melhor para abrir a pior. */
export const OPEN_RANKING: readonly string[] = [...CURATED, ...REST]

const combos = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12)

/** Topo do ranking ate a cobertura (fracao das 1326 combinacoes); a mao entra se ao menos metade dela cabe. */
export function rangeByCoverage(coverage: number): string[] {
  const out: string[] = []
  let cum = 0
  for (const h of OPEN_RANKING) {
    const w = combos(h) / 1326
    if (cum + w / 2 > coverage) break
    out.push(h)
    cum += w
  }
  return out
}

/**
 * Meta do app: a MEDIA das aberturas de todas as posicoes da mesa (o BB nao abre e conta zero) fica
 * entre 20% e 25% das maos. O UTG e a que menos entra; o botao e o SB sao as que mais entram.
 */
export const OPEN_AVERAGE_TARGET = { min: 0.2, max: 0.25 } as const

/** Cobertura-alvo (fracao das maos) de cada posicao na mesa de 6. Media das 6 posicoes: 23,8%. */
export const OPEN_TARGETS_6MAX: Partial<Record<Position, number>> = {
  UTG: 0.14, HJ: 0.2, CO: 0.27, BTN: 0.44, SB: 0.38,
}

/** Mesa de 9, todas as posicoes que abrem. Media das 9 posicoes: 21,6%. HJ, CO e BTN seguem de perto o coach. */
export const OPEN_TARGETS_9MAX: Partial<Record<Position, number>> = {
  UTG: 0.11, 'UTG+1': 0.13, 'UTG+2': 0.15, LJ: 0.18, HJ: 0.22, CO: 0.29, BTN: 0.46, SB: 0.4,
}

