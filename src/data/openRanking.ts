// ============================================================
// Ranking das 169 maos para ABRIR o pote (da mais forte para a mais fraca) e os ranges de abertura
// por posicao gerados a partir dele: cada posicao tem uma COBERTURA-ALVO (% das maos) e o range e
// o topo do ranking ate essa cobertura. Os alvos foram calibrados para um jogador que segue a
// tabela ter PFR de 20% a 25% (ver o teste pfrCalibration). Trocar um alvo altera o app inteiro:
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

/** Cobertura-alvo (fracao das maos) de cada posicao na mesa de 6. O BB nao abre. */
export const OPEN_TARGETS_6MAX: Partial<Record<Position, number>> = {
  UTG: 0.19, HJ: 0.25, CO: 0.34, BTN: 0.55, SB: 0.5,
}

/** Posicoes iniciais da mesa de 9 (as demais usam os alvos da mesa de 6). */
export const OPEN_TARGETS_9MAX: Partial<Record<Position, number>> = {
  UTG: 0.14, 'UTG+1': 0.16, 'UTG+2': 0.18, LJ: 0.21,
}

/** Ordem para 3-betar: valor primeiro, depois blefes com suited (A5s a A2s, conectadas) e as melhores maos que sobram. */
const THREEBET_CURATED = [
  'AA', 'KK', 'QQ', 'AKs', 'AKo', 'JJ', 'AQs', 'TT', 'AQo', 'KQs', 'AJs', '99', 'A5s', 'A4s', 'KJs', 'AJo', 'A3s', 'A2s',
  'KQo', 'QJs', 'JTs', '88', '76s', '65s', 'ATs', 'KTs', 'T9s', '54s', '98s', '87s', 'K9s', 'QTs', '77', 'A9s', 'Q9s', 'J9s',
]
const THREEBET_RANKING: readonly string[] = [...THREEBET_CURATED, ...OPEN_RANKING.filter((h) => !THREEBET_CURATED.includes(h))]

/** Range de 3-bet: topo do ranking de 3-bet ate a cobertura (fracao das 1326 combinacoes). */
export function threeBetByCoverage(coverage: number): string[] {
  const out: string[] = []
  let cum = 0
  for (const h of THREEBET_RANKING) {
    const w = combos(h) / 1326
    if (cum + w / 2 > coverage) break
    out.push(h)
    cum += w
  }
  return out
}

/** Cobertura-alvo do 3-bet por posicao de quem da o 3-bet (contra uma abertura). */
export const THREEBET_TARGETS: Partial<Record<Position, number>> = {
  UTG: 0.075, 'UTG+1': 0.085, 'UTG+2': 0.095, LJ: 0.105, HJ: 0.115, CO: 0.13, BTN: 0.17, SB: 0.19, BB: 0.2,
}
