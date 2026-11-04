// ============================================================
// ENGINE: quanto cada posicao abre e a MEDIA das aberturas da mesa. A meta do app e que essa media
// (todas as posicoes somadas e divididas pelo numero de posicoes, o BB contando zero) fique entre 20%
// e 25% das maos, com o UTG abrindo menos e o botao e o SB abrindo mais.
// ============================================================
import { POSITIONS_BY_FORMAT, getOpenRaiseRange } from '@/data/ranges'
import type { Position, TableFormat } from '@/types'
import type { HudStats } from '../bots/hud'
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

/** Quantas oportunidades de abrir em cada posicao bastam para o numero deixar de ser ruido. */
export const MIN_OPEN_OPPS = 10

export interface HeroOpenRow {
  position: Position
  /** Vezes em que a vez de abrir o pote chegou ate voce. */
  opps: number
  /** % das oportunidades em que voce abriu; null sem nenhuma oportunidade. */
  opened: number | null
  /** % que o range do app abre nessa posicao. */
  target: number
  /** opened - target, em pontos; null com menos de MIN_OPEN_OPPS oportunidades. */
  diff: number | null
}

export interface HeroOpenTable {
  format: TableFormat
  rows: HeroOpenRow[]
  /** Media das suas aberturas (BB conta zero); null enquanto alguma posicao tem poucas oportunidades. */
  mean: number | null
  /** Media dos alvos do app para o mesmo formato. */
  targetMean: number
}

/** Suas aberturas por posicao contra o alvo do app, uma tabela por formato de mesa que voce jogou. */
export function heroOpenTables(open: HudStats['open']): HeroOpenTable[] {
  const tables: HeroOpenTable[] = []
  for (const format of ['6max', '9max'] as const) {
    const targets = openCoverageRows(format)
    const rows: HeroOpenRow[] = targets
      .filter((t) => t.position !== 'BB')
      .map((t) => {
        const cell = open?.[`${format}|${t.position}`]
        const opps = cell?.opps ?? 0
        const opened = opps > 0 ? Math.round((cell!.opens / opps) * 100) : null
        const target = Math.round(t.coverage * 100)
        return { position: t.position, opps, opened, target, diff: opps >= MIN_OPEN_OPPS && opened !== null ? opened - target : null }
      })
    if (!rows.some((r) => r.opps > 0)) continue
    const ready = rows.every((r) => r.opps >= MIN_OPEN_OPPS)
    const mean = ready ? rows.reduce((a, r) => a + (r.opened ?? 0), 0) / targets.length : null
    tables.push({ format, rows, mean, targetMean: meanOpenCoverage(format) * 100 })
  }
  return tables
}
