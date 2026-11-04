// ============================================================
// ENGINE: quanto cada posicao abre e a MEDIA das aberturas da mesa. A meta do app e que essa media
// (todas as posicoes somadas e divididas pelo numero de posicoes, o BB contando zero) fique entre 20%
// e 25% das maos, com o UTG abrindo menos e o botao e o SB abrindo mais.
// ============================================================
import { POSITIONS_BY_FORMAT, getOpenRaiseRange } from '@/data/ranges'
import type { Position, TableFormat } from '@/types'
import { comboCount } from './painter'

export interface OpenCoverageRow {
  position: Position
  /** Fracao das 1326 combinacoes que a posicao abre (0 a 1). */
  coverage: number
}

const coverageOf = (hands: readonly string[]) => hands.reduce((a, h) => a + comboCount(h), 0) / 1326

/** Cobertura de abertura de cada posicao do formato, na ordem de acao. O BB nao abre e fica em zero. */
export function openCoverageRows(format: TableFormat): OpenCoverageRow[] {
  return POSITIONS_BY_FORMAT[format].map((position) => ({
    position,
    coverage: position === 'BB' ? 0 : coverageOf(getOpenRaiseRange(format, position)),
  }))
}

/** Media das aberturas de todas as posicoes do formato (fracao das maos). */
export function meanOpenCoverage(format: TableFormat): number {
  const rows = openCoverageRows(format)
  return rows.reduce((a, r) => a + r.coverage, 0) / rows.length
}
