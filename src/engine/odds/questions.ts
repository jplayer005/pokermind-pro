// ============================================================
// ENGINE: perguntas do Odds Rush. Quatro tipos (outs, regra do 2 e 4, pot odds, decisao) em tres
// niveis. Os spots de outs sao MONTADOS por tipo de draw e conferidos carta a carta (countOuts),
// entao a resposta certa nunca e decorada: e contada. Tudo e deterministico dado o rng.
// ============================================================
import { type Rng } from '../cards'
import { HAND_CATEGORY } from '../evaluator'
import { categoryAny, countOuts } from './outs'

export type QType = 'outs' | 'rule' | 'potodds' | 'decision'
export type Level = 1 | 2 | 3
export type Street = 'flop' | 'turn'

export const QUESTION_TYPES: { id: QType; label: string; hint: string }[] = [
  { id: 'outs', label: 'Outs', hint: 'Contar as cartas que melhoram a sua mão' },
  { id: 'rule', label: 'Regra do 2 e 4', hint: 'Transformar outs em equity de cabeça' },
  { id: 'potodds', label: 'Pot odds', hint: 'Quanta equity a aposta exige' },
  { id: 'decision', label: 'Pagar ou largar', hint: 'Comparar a sua equity com a necessária' },
]

export interface Question {
  type: QType
  level: Level
  prompt: string
  /** Linhas de contexto (rua, pote, aposta). */
  facts: string[]
  hole?: [number, number]
  board?: number[]
  options: string[]
  correct: number
  /** A conta de cabeca, em uma linha, mostrada depois de responder. */
  explain: string
  meta: { outs: number; street: Street; pot?: number; bet?: number; kind?: string }
}

// ---------- sorteio ----------

const card = (rank: number, suit: number) => rank * 4 + suit
const rnd = (n: number, rng: Rng) => Math.floor(rng() * n)
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[rnd(xs.length, rng)]
function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1, rng)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const ranksExcept = (taken: readonly number[], rng: Rng, n: number): number[] =>
  shuffle([...Array(13).keys()].filter((r) => !taken.includes(r)), rng).slice(0, n)

// ---------- spots de draw ----------

interface Spot { hole: [number, number]; board: number[] }
interface DrawKind {
  id: string
  /** Frase curta explicando de onde vem o numero. */
  why: string
  outs: number
  /** Categoria minima que conta como out, e a categoria da mao sem a carta. */
  minCat: number
  baseCat: number
  minLevel: Level
  /** Monta um spot valido (conferido por countOuts) no flop ou no turn. */
  spot: (street: Street, rng: Rng) => Spot
}

/** Flop candidato de cada draw; o resto (validacao e turn) e comum. */
type FlopBuilder = (rng: Rng) => Spot

const suitOtherThan = (s: number, rng: Rng) => pick([0, 1, 2, 3].filter((x) => x !== s), rng)

const flushDraw: FlopBuilder = (rng) => {
  const s = rnd(4, rng)
  const [a, b, c, d, e] = shuffle([...Array(13).keys()], rng)
  return { hole: [card(a, s), card(b, s)], board: [card(c, s), card(d, s), card(e, suitOtherThan(s, rng))] }
}
const connectors =
  (boardOffsets: [number, number], sameSuit: boolean): FlopBuilder =>
  (rng) => {
    // heroi: r e r+1; board: duas cartas em r+offsets; a terceira e solta
    const r = 1 + rnd(8, rng)
    const s = rnd(4, rng)
    const hs = sameSuit ? [s, s] : shuffle([0, 1, 2, 3], rng)
    const bs = sameSuit ? [s, s] : shuffle([0, 1, 2, 3], rng)
    const loose = ranksExcept([r, r + 1, r + boardOffsets[0], r + boardOffsets[1]], rng, 1)[0]
    return {
      hole: [card(r, hs[0]), card(r + 1, hs[1])],
      board: [card(r + boardOffsets[0], bs[0]), card(r + boardOffsets[1], bs[1]), card(loose, rnd(4, rng))],
    }
  }
const overcards: FlopBuilder = (rng) => {
  const [h1, h2] = shuffle([8, 9, 10, 11, 12], rng)
  const lows = shuffle([0, 1, 2, 3, 4, 5, 6, 7], rng).slice(0, 3)
  const suits = shuffle([0, 1, 2, 3], rng)
  return { hole: [card(h1, suits[0]), card(h2, suits[1])], board: lows.map((r) => card(r, rnd(4, rng))) }
}
const setDraw: FlopBuilder = (rng) => {
  const [p, a, b, c] = shuffle([...Array(13).keys()], rng)
  const [s1, s2] = shuffle([0, 1, 2, 3], rng)
  return { hole: [card(p, s1), card(p, s2)], board: [card(a, rnd(4, rng)), card(b, rnd(4, rng)), card(c, rnd(4, rng))] }
}

function makeKind(
  id: string, why: string, outs: number, minCat: number, baseCat: number, minLevel: Level, flop: FlopBuilder,
): DrawKind {
  const valid = (s: Spot) => {
    const cards = [...s.hole, ...s.board]
    return new Set(cards).size === cards.length
      && categoryAny(cards) === baseCat
      && countOuts(s.hole, s.board, minCat) === outs
  }
  return {
    id, why, outs, minCat, baseCat, minLevel,
    spot: (street, rng) => {
      for (let i = 0; i < 2000; i++) {
        const f = flop(rng)
        if (!valid(f)) continue
        if (street === 'flop') return f
        // turn: uma 4a carta que nao mexa no draw nem repita carta
        const used = new Set([...f.hole, ...f.board])
        const t = rnd(52, rng)
        if (used.has(t)) continue
        const turned = { hole: f.hole, board: [...f.board, t] }
        if (valid(turned)) return turned
      }
      throw new Error(`nao foi possivel montar o spot ${id}`)
    },
  }
}

const { HIGH_CARD, PAIR, TRIPS, STRAIGHT, FLUSH } = HAND_CATEGORY

export const DRAW_KINDS: DrawKind[] = [
  makeKind('flush', 'Flush draw: 13 cartas do naipe, menos as 4 que você já vê, sobram 9.', 9, FLUSH, HIGH_CARD, 1, flushDraw),
  makeKind('oesd', 'Sequência aberta: duas pontas, 4 cartas de cada, 8 no total.', 8, STRAIGHT, HIGH_CARD, 1, connectors([2, 3], false)),
  makeKind('overcards', 'Duas overcards: 3 de cada, 6 no total, para fazer o par mais alto.', 6, PAIR, HIGH_CARD, 1, overcards),
  makeKind('gutshot', 'Gutshot: só um número completa a sequência, 4 cartas.', 4, STRAIGHT, HIGH_CARD, 2, connectors([3, 4], false)),
  makeKind('set', 'Par de mão: só restam 2 cartas do mesmo valor para a trinca.', 2, TRIPS, PAIR, 2, setDraw),
  makeKind('flush-oesd', 'Flush draw (9) mais sequência aberta fora do naipe (6): 15 outs.', 15, STRAIGHT, HIGH_CARD, 3, connectors([2, 3], true)),
  makeKind('flush-gutshot', 'Flush draw (9) mais gutshot fora do naipe (3): 12 outs.', 12, STRAIGHT, HIGH_CARD, 3, connectors([3, 4], true)),
]

const kindsFor = (level: Level) => DRAW_KINDS.filter((k) => k.minLevel <= level)
const streetFor = (level: Level, rng: Rng): Street => (level === 1 ? 'flop' : pick(['flop', 'turn'] as Street[], rng))

// ---------- numeros ----------

const mult = (street: Street) => (street === 'flop' ? 4 : 2)
/** Equity exata de completar com `outs` cartas, para a explicacao. */
function exactEquity(outs: number, street: Street): number {
  if (street === 'turn') return outs / 46
  return 1 - ((47 - outs) / 47) * ((46 - outs) / 46)
}
const pctText = (n: number) => `${n}%`
const neededPct = (pot: number, bet: number) => (bet / (pot + 2 * bet)) * 100

interface PotSpot { pot: number; bet: number }
function potSpot(level: Level, rng: Rng): PotSpot {
  if (level === 1) {
    const pot = pick([10, 20, 30, 40, 50, 60], rng)
    return { pot, bet: pick([pot / 2, pot], rng) }
  }
  if (level === 2) {
    const pot = pick([12, 24, 36, 48, 60], rng)
    return { pot, bet: pick([pot / 3, (2 * pot) / 3, (3 * pot) / 4, pot * 1.5, pot * 2], rng) }
  }
  const pot = 15 + rnd(76, rng)
  return { pot, bet: 8 + rnd(Math.floor(pot * 1.5) - 7, rng) }
}

/** Opcoes numericas em %: a certa mais os erros tipicos, embaralhadas; devolve o indice da certa. */
function numericOptions(correct: number, wrongs: number[], rng: Rng): { options: string[]; correct: number } {
  const seen = new Set<number>([correct])
  const pool: number[] = []
  for (const w of wrongs) {
    const v = Math.round(w)
    if (v >= 1 && v <= 99 && !seen.has(v)) { seen.add(v); pool.push(v) }
  }
  // completa com valores proximos, sem repetir, ate ter 3 erros
  for (let d = 4; pool.length < 3 && d < 60; d += 4) {
    for (const v of [correct + d, correct - d]) {
      if (v >= 1 && v <= 99 && !seen.has(v) && pool.length < 3) { seen.add(v); pool.push(v) }
    }
  }
  const all = shuffle([correct, ...pool.slice(0, 3)], rng)
  return { options: all.map(pctText), correct: all.indexOf(correct) }
}

// ---------- perguntas ----------

const streetFact = (s: Street) => (s === 'flop' ? 'Flop: faltam duas cartas' : 'Turn: falta uma carta')

function outsQuestion(level: Level, rng: Rng): Question {
  const kind = pick(kindsFor(level), rng)
  const street = streetFor(level, rng)
  const spot = kind.spot(street, rng)
  const n = kind.outs
  const candidates = [...new Set([n - 2, n + 2, n + 4, n - 4, 4, 6, 8, 9, 12, 15, 2].filter((v) => v >= 1 && v !== n))]
  // os erros mais proximos do certo confundem mais, e por isso treinam mais
  const wrong = candidates.sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || rng() - 0.5).slice(0, 3)
  const opts = shuffle([n, ...wrong], rng)
  return {
    type: 'outs', level, prompt: 'Quantos outs você tem?',
    facts: [streetFact(street)],
    hole: spot.hole, board: spot.board,
    options: opts.map(String), correct: opts.indexOf(n),
    explain: kind.why,
    meta: { outs: n, street, kind: kind.id },
  }
}

function ruleQuestion(level: Level, rng: Rng): Question {
  const street = streetFor(level, rng)
  const n = pick(kindsFor(level), rng).outs
  const m = mult(street)
  const correct = n * m
  const other = n * (m === 4 ? 2 : 4)
  const { options, correct: idx } = numericOptions(correct, [other, n, correct + 8, correct - 8], rng)
  return {
    type: 'rule', level, prompt: 'Quanto de equity isso dá?',
    facts: [`${n} outs`, streetFact(street)],
    options, correct: idx,
    explain: `${n} outs x ${m} = ${correct}% (${street === 'flop' ? 'regra do 4: duas cartas por vir' : 'regra do 2: uma carta por vir'}). Exato: ${Math.round(exactEquity(n, street) * 100)}%.`,
    meta: { outs: n, street },
  }
}

function potOddsQuestion(level: Level, rng: Rng): Question {
  const { pot, bet } = potSpot(level, rng)
  const correct = Math.round(neededPct(pot, bet))
  const { options, correct: idx } = numericOptions(
    correct,
    [(bet / (pot + bet)) * 100, (pot / (pot + bet)) * 100, correct + 6, correct - 6],
    rng,
  )
  return {
    type: 'potodds', level, prompt: 'Que equity você precisa para pagar?',
    facts: [`Pote: ${pot} bb`, `Aposta dele: ${bet} bb`],
    options, correct: idx,
    explain: `Pagar ${bet} para ganhar ${pot + bet}: ${bet} / (${pot} + ${bet} + ${bet}) = ${correct}%.`,
    meta: { outs: 0, street: 'flop', pot, bet },
  }
}

function decisionQuestion(level: Level, rng: Rng): Question {
  let best: { n: number; street: Street; ps: PotSpot; gap: number } | null = null
  for (let i = 0; i < 60; i++) {
    const n = pick(kindsFor(level), rng).outs
    const street = streetFor(level, rng)
    const ps = potSpot(level, rng)
    const needed = neededPct(ps.pot, ps.bet)
    const rule = n * mult(street)
    const exact = exactEquity(n, street) * 100
    // folga nos dois metodos e do mesmo lado: a resposta nao depende de arredondar
    const gap = Math.min(Math.abs(rule - needed), Math.abs(exact - needed))
    const sameSide = rule >= needed === exact >= needed
    if (sameSide && gap >= 4) { best = { n, street, ps, gap }; break }
    if (sameSide && (!best || gap > best.gap)) best = { n, street, ps, gap }
  }
  const { n, street, ps } = best ?? { n: 9, street: 'flop' as Street, ps: { pot: 20, bet: 10 } }
  const rule = n * mult(street)
  const needed = Math.round(neededPct(ps.pot, ps.bet))
  const pays = rule >= neededPct(ps.pot, ps.bet)
  return {
    type: 'decision', level, prompt: 'Pagar ou largar?',
    facts: [`${n} outs`, streetFact(street), `Pote: ${ps.pot} bb`, `Aposta dele: ${ps.bet} bb`],
    options: ['Pagar', 'Largar'], correct: pays ? 0 : 1,
    explain: `${n} outs x ${mult(street)} = ${rule}% contra ${needed}% necessários: ${pays ? 'pagar' : 'largar'}.`,
    meta: { outs: n, street, pot: ps.pot, bet: ps.bet },
  }
}

export function makeQuestion(type: QType, level: Level, rng: Rng = Math.random): Question {
  switch (type) {
    case 'outs': return outsQuestion(level, rng)
    case 'rule': return ruleQuestion(level, rng)
    case 'potodds': return potOddsQuestion(level, rng)
    case 'decision': return decisionQuestion(level, rng)
  }
}
