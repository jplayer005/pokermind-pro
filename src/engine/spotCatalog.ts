// Catalogo dos formatos push/fold resolvidos (portado do treinador-poker).
// id do spot: '<prefixo>:<stack>:<posicao>', com 'BB_vs_BTN' na defesa.
import type { Rng } from './cards'

export type FormatKind = 'simple' | 'multiway'

export interface Formato {
  id: string
  label: string
  prefixo: string
  kind: FormatKind // simple = HU/3-max (SB all-in, BB paga); multiway = 6/9-max
  icm: boolean
  premios?: string
  stacks: number[]
  ordem: string[] // posicoes na ordem de acao (nomes do banco)
  tableFormat: 'HU' | '6max' | '9max' // para o TrainingTable
}

export const STACKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25]
const O2 = ['SB', 'BB']
const O6 = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const O9 = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']

export const FORMATOS: Formato[] = [
  { id: 'hu', label: 'Heads-Up', prefixo: 'HU', kind: 'simple', icm: false, stacks: STACKS, ordem: O2, tableFormat: 'HU' },
  { id: 'bolha3', label: 'Bolha 3-max', prefixo: 'bolha_3max', kind: 'simple', icm: true, premios: '65/35', stacks: STACKS, ordem: O2, tableFormat: 'HU' },
  { id: 'sat3', label: 'Satélite 3-max', prefixo: 'satelite_3max', kind: 'simple', icm: true, premios: 'vagas iguais', stacks: STACKS, ordem: O2, tableFormat: 'HU' },
  { id: '6max', label: '6-max', prefixo: '6max', kind: 'multiway', icm: false, stacks: STACKS, ordem: O6, tableFormat: '6max' },
  { id: 'sng6', label: '6-max SNG', prefixo: 'sng6_top2', kind: 'multiway', icm: true, premios: '65/35', stacks: STACKS, ordem: O6, tableFormat: '6max' },
  { id: 'sat6', label: '6-max Satélite', prefixo: 'satelite6', kind: 'multiway', icm: true, premios: 'vagas iguais', stacks: STACKS, ordem: O6, tableFormat: '6max' },
  { id: '9max', label: '9-max', prefixo: '9max', kind: 'multiway', icm: false, stacks: STACKS, ordem: O9, tableFormat: '9max' },
  { id: 'sng9', label: '9-max SNG', prefixo: 'sng9_top2', kind: 'multiway', icm: true, premios: '65/35', stacks: STACKS, ordem: O9, tableFormat: '9max' },
  { id: 'sat9', label: '9-max Satélite', prefixo: 'satelite9', kind: 'multiway', icm: true, premios: 'vagas iguais', stacks: STACKS, ordem: O9, tableFormat: '9max' },
]

export function formatoPorId(id: string): Formato {
  const f = FORMATOS.find((x) => x.id === id)
  if (!f) throw new Error(`Formato desconhecido: ${id}`)
  return f
}

/** Nome do banco -> nome usado pelo TrainingTable e pela UI. */
const POS_ALIAS: Record<string, string> = { UTG1: 'UTG+1', MP: 'UTG+2' }
export const posDisplay = (pos: string) => POS_ALIAS[pos] ?? pos

export interface SpotRef {
  id: string
  hero: string // quem decide (nome do banco)
  acao: 'push' | 'call'
  shover: string
}

/** Todas as referencias de spot de um formato num stack. */
export function spotRefs(f: Formato, stack: number): SpotRef[] {
  const refs: SpotRef[] = []
  if (f.kind === 'simple') {
    refs.push({ id: `${f.prefixo}:${stack}:SB`, hero: 'SB', acao: 'push', shover: 'SB' })
    refs.push({ id: `${f.prefixo}:${stack}:BB`, hero: 'BB', acao: 'call', shover: 'SB' })
    return refs
  }
  const o = f.ordem
  for (let i = 0; i < o.length - 1; i++) {
    const shover = o[i]
    refs.push({ id: `${f.prefixo}:${stack}:${shover}`, hero: shover, acao: 'push', shover })
    for (let j = i + 1; j < o.length; j++) {
      refs.push({ id: `${f.prefixo}:${stack}:${o[j]}_vs_${shover}`, hero: o[j], acao: 'call', shover })
    }
  }
  return refs
}

/** Maior stack do catalogo que nao passa de `bb` (minimo 2). */
export function nearestStack(bb: number): number {
  let best = STACKS[0]
  for (const s of STACKS) if (s <= bb) best = s
  return best
}

/** Sorteia um spot (stack fixo, ou qualquer se `stack` for null). */
export function spotAleatorio(
  f: Formato,
  stack: number | null,
  rng: Rng = Math.random,
): { ref: SpotRef; stack: number } {
  const s = stack ?? f.stacks[Math.floor(rng() * f.stacks.length)]
  const refs = spotRefs(f, s)
  return { ref: refs[Math.floor(rng() * refs.length)], stack: s }
}
