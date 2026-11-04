// ============================================================
// ENGINE: "Recriar minha mao". O jogador registra uma mao real (mesa, posicoes, stacks, cartas, board
// e as acoes ate a sua decisao) e ela vira um cenario jogavel, com o coach e o quiz de sempre. As
// cartas do vilao, se ele nao as viu, sao sorteadas do range coerente com as acoes dele.
// ============================================================
import { POSITIONS_BY_FORMAT } from '@/data/ranges'
import type { Position } from '@/types'
import { mulberry32 } from '../cards'
import type { PlayerInit, Street } from '../game/types'
import { buildCustomHand, SCENARIO_CFG, type CustomSetup, type Scenario } from './scenarios'

export type RecordWho = 'hero' | 'villain'

export interface RecordStep {
  who: RecordWho
  type: 'fold' | 'check' | 'call' | 'raise'
  /** raise: total da rua, em bb. */
  bb?: number
  allIn?: boolean
}

export interface HandRecord {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  tableSize: 6 | 9
  heroPos: Position
  villainPos: Position
  heroStackBB: number
  villainStackBB: number
  /** Ante por jogador, em bb (0 = sem ante). */
  anteBB: number
  heroCards: [number, number]
  /** Cartas do vilao, quando ele as mostrou; ausentes = sorteadas do range. */
  villainCards?: [number, number]
  /** Board ate a rua da decisao (0, 3, 4 ou 5 cartas). */
  board: number[]
  /** Acoes em ordem ate a decisao do heroi; os demais jogadores largam sozinhos. */
  steps: RecordStep[]
  notes?: string
}

export type RecordCheck = { ok: true; stepStreets: Street[]; decisionStreet: Street } | { ok: false; error: string }

const OTHER_STACK_BB = 100
const BB = SCENARIO_CFG.bb

const STREET_LABEL: Record<Street, string> = { preflop: 'Pré-flop', flop: 'Flop', turn: 'Turn', river: 'River' }
export const streetLabel = (s: Street) => STREET_LABEL[s] ?? String(s)

/** Tudo que precisa estar certo antes de montar a mesa; devolve a mensagem para o formulario. */
function structuralError(rec: HandRecord): string | null {
  const labels = POSITIONS_BY_FORMAT[rec.tableSize === 6 ? '6max' : '9max']
  if (!labels.includes(rec.heroPos) || !labels.includes(rec.villainPos)) {
    return `Essa posição não existe na mesa de ${rec.tableSize}. Escolha outra.`
  }
  if (rec.heroPos === rec.villainPos) return 'Você e o vilão precisam estar em posições diferentes.'
  if (!(rec.heroStackBB > 0) || !(rec.villainStackBB > 0)) return 'Informe o stack de você e do vilão, em bb.'
  if (!(rec.anteBB >= 0)) return 'O ante não pode ser negativo.'
  if (![0, 3, 4, 5].includes(rec.board.length)) return 'O board precisa ter 3 cartas (flop), 4 (turn) ou 5 (river), ou ficar vazio.'
  const cards = [...rec.heroCards, ...(rec.villainCards ?? []), ...rec.board]
  if (new Set(cards).size !== cards.length) return 'Há cartas repetidas entre as suas, as do vilão e o board.'
  return null
}

/** Seats e botao: o heroi e o assento 0 e o botao e escolhido para ele cair na posicao pedida. */
function setupOf(rec: HandRecord): CustomSetup {
  const n = rec.tableSize
  const labels = POSITIONS_BY_FORMAT[n === 6 ? '6max' : '9max']
  const heroIdx = labels.indexOf(rec.heroPos)
  const villIdx = labels.indexOf(rec.villainPos)
  // o primeiro a agir (UTG) fica 3 assentos depois do botao; o assento s tem o indice (s - botao - 3) na ordem de acao
  const button = (((-heroIdx - 3) % n) + n) % n
  const villainSeat = (villIdx + button + 3) % n
  let bot = 0
  const players: PlayerInit[] = Array.from({ length: n }, (_, i) => {
    if (i === 0) return { name: 'Você', isHero: true, profile: 'tag', stack: rec.heroStackBB * BB }
    if (i === villainSeat) return { name: 'Rafa', profile: 'tag', stack: rec.villainStackBB * BB }
    return { name: `Bot ${++bot}`, profile: 'tag', stack: OTHER_STACK_BB * BB }
  })
  return {
    players,
    button,
    ante: Math.round(rec.anteBB * BB),
    hero: rec.heroCards,
    villainCards: rec.villainCards,
    villainSeat,
    board: rec.board,
    steps: rec.steps.map((s) => ({ seat: s.who === 'hero' ? 0 : villainSeat, type: s.type, bb: s.bb, allIn: s.allIn })),
  }
}

/** Confere a mao inteira montando-a de verdade: as mesmas regras do jogo decidem se ela fecha. */
export function validateRecord(rec: HandRecord): RecordCheck {
  const bad = structuralError(rec)
  if (bad) return { ok: false, error: bad }
  try {
    const built = buildCustomHand(setupOf(rec), mulberry32(1))
    return { ok: true, stepStreets: built.stepStreets, decisionStreet: built.game.street }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível montar essa mão.' }
  }
}

const bbText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Linhas de contexto para a folha de abertura do cenario. */
export function recordDescription(rec: HandRecord): string[] {
  const lines = [
    `Mesa de ${rec.tableSize}. Você está no ${rec.heroPos} com ${bbText(rec.heroStackBB)} bb; o vilão está no ${rec.villainPos} com ${bbText(rec.villainStackBB)} bb${rec.anteBB > 0 ? `, com ante de ${bbText(rec.anteBB)} bb` : ''}.`,
  ]
  const check = validateRecord(rec)
  if (check.ok) lines.push(`A decisão é no ${streetLabel(check.decisionStreet)}. Os outros jogadores largaram antes de agir.`)
  if (rec.villainCards) lines.push('As cartas do vilão são as que ele mostrou.')
  else lines.push('Você não viu as cartas dele: a cada repetição ele recebe uma mão do range que as ações dele sugerem.')
  return lines
}

/** O cenario jogavel a partir do registro. Lanca Error se a mao nao fecha (use validateRecord antes). */
export function scenarioFromRecord(rec: HandRecord): Scenario {
  const check = validateRecord(rec)
  if (!check.ok) throw new Error(check.error)
  const custom = setupOf(rec)
  return {
    id: `mao-${rec.id}`,
    title: rec.title || 'Minha mão',
    summary: `${rec.heroPos} contra ${rec.villainPos}, decisão no ${streetLabel(check.decisionStreet)}.`,
    lesson: rec.notes?.trim() || 'Decida como na mão real e compare com o coach. Repita para ver como a leitura muda com cada mão do vilão.',
    context: recordDescription(rec),
    stacks: { hero: rec.heroStackBB, villain: rec.villainStackBB },
    villainProfile: 'tag',
    decisionStreet: check.decisionStreet,
    deal: () => ({ hero: rec.heroCards, board: rec.board }),
    script: [],
    custom,
  }
}
