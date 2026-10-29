// ============================================================
// ENGINE: laboratorio de cenarios. Cada cenario e um TEMA de treino ("top par contra
// check-raise"), nao uma mao decorada: o heroi recebe uma mao do tema, o board e do tema, as
// acoes ate a decisao sao roteirizadas, e a mao do vilao e sorteada DENTRO do range coerente
// com essas acoes (ele as vezes tem trinca, as vezes blefa). Cada repeticao varia as cartas.
// ============================================================
import { parseCards, type Rng } from '../cards'
import { buildVillainRange } from '../coach/range'
import { applyAction, createGame, legalActions, potTotal, startHand } from '../game/reducer'
import type { Action, GameConfig, GameState, PlayerInit, Street } from '../game/types'

const BB = 2 // fichas por bb nos cenarios (permite SB de 0,5 bb)
const HERO = 0
const VILLAIN = 1
const SHORT = 2

export type Who = 'hero' | 'villain' | 'short'
const SEAT: Record<Who, number> = { hero: HERO, villain: VILLAIN, short: SHORT }

export interface Step {
  who: Who
  type: 'fold' | 'check' | 'call' | 'raise'
  /** raise pre-flop: total da rua, em bb. */
  bb?: number
  /** raise pos-flop: fracao do pote (aposta; ou aumento sobre a aposta, contando o que ha para pagar). */
  pot?: number
  allIn?: boolean
}

export interface ScenarioDeal {
  hero: [number, number]
  /** Board fixo ate a rua da decisao (3 cartas no flop, 4 no turn). */
  board: number[]
}

export interface Scenario {
  id: string
  title: string
  summary: string
  /** O que prestar atencao: aparece antes da mao e na revisao. */
  lesson: string
  context: string[]
  /** Stacks em bb. `short` e um stack curto que entra e sempre folda (3 assentos). */
  stacks: { hero: number; villain: number; short?: number }
  villainProfile: string
  decisionStreet: Street
  deal: (rng: Rng) => ScenarioDeal
  script: Step[]
}

// ---------- sorteio de cartas ----------

const card = (rank: number, suit: number) => rank * 4 + suit
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)]
function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Top par com bom kicker num flop seco (arco-iris, sem sequencia a vista). */
function dealTopPair(rng: Rng): ScenarioDeal {
  const top = pick([11, 10, 9], rng) // K, Q ou J no topo
  let r1 = 0
  let r2 = 0
  do {
    r1 = Math.floor(rng() * (top - 2)) // ate top-3: afastado do topo
    r2 = Math.floor(rng() * (top - 2))
  } while (r1 - r2 < 2)
  const [s0, s1, s2] = shuffle([0, 1, 2, 3], rng)
  const flop = [card(top, s0), card(r1, s1), card(r2, s2)]
  const heroSuit = pick([0, 1, 2, 3].filter((s) => s !== s0), rng)
  const kickers = [12, 11, 10, 9, 8, 7].filter((r) => r !== top && r !== r1 && r !== r2)
  const kicker = card(pick(kickers, rng), pick([0, 1, 2, 3], rng))
  return { hero: [card(top, heroSuit), kicker], board: flop }
}

/** Par de damas (overpair) num flop molhado de pote 3-bet. */
const WET_FLOPS = ['Js Ts 5d', '9h 8h 4c', 'Td 9d 3s']
function dealOverpair(rng: Rng): ScenarioDeal {
  const [a, b] = shuffle([0, 1, 2, 3], rng)
  return { hero: [card(10, a), card(10, b)], board: parseCards(pick(WET_FLOPS, rng)) }
}

/** Nut flush draw (A + carta baixa do naipe) num flop com duas cartas do naipe. */
function dealFlushDraw(rng: Rng): ScenarioDeal {
  const suit = pick([0, 1, 2, 3], rng)
  const other = pick([0, 1, 2, 3].filter((s) => s !== suit), rng)
  const ranks = shuffle([11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], rng)
  const [b1, b2, b3] = ranks
  const low = pick([0, 1, 2, 3, 4, 5, 6].filter((r) => r !== b1 && r !== b2 && r !== b3), rng)
  return { hero: [card(12, suit), card(low, suit)], board: [card(b1, suit), card(b2, suit), card(b3, other)] }
}

// ---------- catalogo ----------

export const SCENARIOS: Scenario[] = [
  {
    id: 'bolha-top-par',
    title: 'Chip leader na bolha: top par contra check-raise',
    summary: 'Você tem o maior stack, bate um top par e o adversário dá check-raise grande.',
    lesson:
      'Um check-raise grande tem muito mais mão feita no range (trinca, dois pares) do que uma aposta comum de iniciativa. Leia o range dele antes de pagar e pese o risco: o pote já é grande e o stack dele pode te ameaçar.',
    context: [
      'Contexto: perto da bolha. Você é o chip leader com 90 bb e ele tem 60% do seu stack (54 bb).',
      'O stack curto da BB (12 bb) está fora da mão.',
      'Você abriu da BTN, ele pagou do SB, o flop saiu seco. Você apostou e ele deu check-raise.',
    ],
    stacks: { hero: 90, villain: 54, short: 12 },
    villainProfile: 'tag',
    decisionStreet: 'flop',
    deal: dealTopPair,
    script: [
      { who: 'hero', type: 'raise', bb: 2.5 },
      { who: 'villain', type: 'call' },
      { who: 'short', type: 'fold' },
      { who: 'villain', type: 'check' },
      { who: 'hero', type: 'raise', pot: 0.4 },
      { who: 'villain', type: 'raise', pot: 1 },
    ],
  },
  {
    id: 'overpair-3bet',
    title: 'Par de damas em pote 3-bet, board molhado',
    summary: 'Você abre, ele dá 3-bet, você paga e ele aposta no flop molhado.',
    lesson:
      'Em pote 3-bet o range dele é forte e tem poucos blefes. Um overpair é bom, mas num board molhado ele perde para sets, dois pares e draws com muita equity. Compare a sua equity com o que a aposta exige.',
    context: [
      'Contexto: heads-up, 100 bb. Você abriu para 2,5 bb, ele deu 3-bet para 8 bb e você pagou.',
      'O flop é molhado (cartas conectadas e de naipe) e ele aposta de novo.',
    ],
    stacks: { hero: 100, villain: 100 },
    villainProfile: 'tag',
    decisionStreet: 'flop',
    deal: dealOverpair,
    script: [
      { who: 'hero', type: 'raise', bb: 2.5 },
      { who: 'villain', type: 'raise', bb: 8 },
      { who: 'hero', type: 'call' },
      { who: 'villain', type: 'raise', pot: 0.6 },
    ],
  },
  {
    id: 'flush-draw-shove',
    title: 'Flush draw contra all-in (12 bb)',
    summary: 'Stack curto: você tem o nut flush draw e ele empurra tudo no flop.',
    lesson:
      'Com o draw você não tem a mão feita, mas tem muita equity. Conte os outs, passe para equity (regra do 2 e 4 com duas cartas por vir) e compare com a equity que o all-in exige. É um spot de margem pequena.',
    context: [
      'Contexto: heads-up, 12 bb. Você abriu, ele pagou e deu all-in no flop.',
      'Você tem A mais uma carta baixa do naipe do flush draw.',
    ],
    stacks: { hero: 12, villain: 12 },
    villainProfile: 'lag',
    decisionStreet: 'flop',
    deal: dealFlushDraw,
    script: [
      { who: 'hero', type: 'raise', bb: 2.5 },
      { who: 'villain', type: 'call' },
      { who: 'villain', type: 'raise', allIn: true },
    ],
  },
]

export const scenarioById = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id)

// ---------- montagem da mao ----------

function toAction(state: GameState, step: Step): Action {
  if (step.type !== 'raise') return { type: step.type }
  const la = legalActions(state)
  if (step.allIn) return { type: 'raise', to: la.maxTo }
  const wanted = step.bb !== undefined
    ? step.bb * state.cfg.bb
    : state.currentBet + (step.pot ?? 0.66) * (potTotal(state) + la.callAmount)
  return { type: 'raise', to: Math.max(la.minTo, Math.min(la.maxTo, Math.round(wanted))) }
}

/** Jogadores do cenario: heroi (assento 0), vilao (1) e, se houver, o stack curto (2). */
export function scenarioPlayers(sc: Scenario): PlayerInit[] {
  return [
    { name: 'Você', isHero: true, profile: 'tag', stack: sc.stacks.hero * BB },
    { name: 'Rafa', profile: sc.villainProfile, stack: sc.stacks.villain * BB },
    ...(sc.stacks.short ? [{ name: 'Duda', profile: 'tag', stack: sc.stacks.short * BB }] : []),
  ]
}

export const SCENARIO_CFG: GameConfig = { sb: 1, bb: BB, ante: 0 }

/**
 * Monta uma mao do cenario ate a decisao do heroi: cartas do tema, acoes do roteiro e a mao do
 * vilao sorteada do range coerente com elas. `handNumber` identifica a repeticao.
 */
export function buildScenarioHand(sc: Scenario, rng: Rng, handNumber = 1): GameState {
  const { hero, board } = sc.deal(rng)
  let g = startHand(createGame(scenarioPlayers(sc), SCENARIO_CFG, 0), rng, { holes: { [HERO]: hero }, board })

  sc.script.forEach((step, i) => {
    if (g.over || g.toAct !== SEAT[step.who]) {
      throw new Error(`cenario ${sc.id}: o passo ${i + 1} (${step.who}) nao e a vez desse assento`)
    }
    g = applyAction(g, toAction(g, step))
  })
  if (g.over || g.toAct !== HERO || g.street !== sc.decisionStreet) {
    throw new Error(`cenario ${sc.id}: o roteiro nao termina na decisao do heroi`)
  }

  // mao do vilao: sorteada do range que as acoes dele sugerem (sem as cartas do heroi, do board e do stack curto)
  const range = buildVillainRange(g)
  if (range) {
    const taken = new Set(g.seats.filter((s) => s.id !== VILLAIN).flatMap((s) => s.cards ?? []))
    const pool = range.combos.filter((c) => !taken.has(c[0]) && !taken.has(c[1]))
    if (pool.length > 0) {
      const chosen = pool[Math.floor(rng() * pool.length)]
      const old = g.seats[VILLAIN].cards ?? []
      g = {
        ...g,
        seats: g.seats.map((s) => (s.id === VILLAIN ? { ...s, cards: [chosen[0], chosen[1]] } : s)),
        // as cartas antigas voltam ao baralho; as novas saem dele
        deck: [...old, ...g.deck].filter((c) => c !== chosen[0] && c !== chosen[1]),
      }
    }
  }
  return { ...g, handNumber }
}
