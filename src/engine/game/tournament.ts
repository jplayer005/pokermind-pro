// ============================================================
// ENGINE: torneios (Sit&Go e MTT). Camada pura sobre o motor da mao.
// SNG: uma mesa, todos os jogadores sentados. MTT: so a mesa do heroi e jogada; o resto
// do campo e simulado (eliminacoes por probabilidade) e reabastece a mesa (balanceamento).
// ============================================================
import type { Rng } from '../cards'
import type { GameState, PlayerInit } from './types'

export interface BlindLevel {
  sb: number
  bb: number
  ante: number
}

export type TournamentKind = 'sng' | 'mtt'

export interface TournamentConfig {
  kind: TournamentKind
  fieldSize: number
  tableSeats: number
  startStack: number
  handsPerLevel: number
  /** Fracao do premio total por colocacao (1o primeiro). Soma = 1. */
  payouts: number[]
}

export interface Finish {
  name: string
  place: number
  isHero: boolean
}

export interface TournamentState {
  config: TournamentConfig
  levelIdx: number
  handsInLevel: number
  /** Jogadores vivos no torneio inteiro (mesa do heroi + campo simulado). */
  remaining: number
  /** Jogadores vivos fora da mesa do heroi (so MTT). */
  offTable: number
  totalChips: number
  nextId: number
  finishes: Finish[]
  heroPlace: number | null
  done: boolean
}

const BASE_LEVELS: BlindLevel[] = [
  { sb: 10, bb: 20, ante: 0 },
  { sb: 15, bb: 30, ante: 0 },
  { sb: 20, bb: 40, ante: 0 },
  { sb: 30, bb: 60, ante: 5 },
  { sb: 40, bb: 80, ante: 10 },
  { sb: 50, bb: 100, ante: 15 },
  { sb: 75, bb: 150, ante: 20 },
  { sb: 100, bb: 200, ante: 25 },
  { sb: 150, bb: 300, ante: 40 },
  { sb: 200, bb: 400, ante: 50 },
  { sb: 300, bb: 600, ante: 75 },
  { sb: 400, bb: 800, ante: 100 },
  { sb: 600, bb: 1200, ante: 150 },
  { sb: 800, bb: 1600, ante: 200 },
  { sb: 1000, bb: 2000, ante: 250 },
]

/** Nivel de blinds; alem da tabela base, escala 1,4x por nivel. */
export function levelAt(idx: number): BlindLevel {
  if (idx < BASE_LEVELS.length) return BASE_LEVELS[idx]
  const last = BASE_LEVELS[BASE_LEVELS.length - 1]
  const f = Math.pow(1.4, idx - BASE_LEVELS.length + 1)
  const bb = Math.round((last.bb * f) / 200) * 200
  return { sb: bb / 2, bb, ante: Math.round((last.ante * f) / 25) * 25 }
}

/** Premios do MTT: cerca de 15% do campo paga, distribuicao decrescente suave. */
export function mttPayouts(field: number): number[] {
  const paid = Math.max(3, Math.round(field * 0.15))
  const w = Array.from({ length: paid }, (_, i) => 1 / Math.pow(i + 1, 0.9))
  const sum = w.reduce((a, b) => a + b, 0)
  return w.map((x) => x / sum)
}

export function sngConfig(seats: 6 | 9): TournamentConfig {
  // 65/35 para os 2 primeiros, o mesmo modelo dos spots SNG ICM do solver
  return { kind: 'sng', fieldSize: seats, tableSeats: seats, startStack: 1500, handsPerLevel: 10, payouts: [0.65, 0.35] }
}

export function mttConfig(fieldSize: number): TournamentConfig {
  return {
    kind: 'mtt', fieldSize, tableSeats: 9, startStack: 1500, handsPerLevel: 12, payouts: mttPayouts(fieldSize),
  }
}

export const paidPlaces = (t: TournamentState) => t.config.payouts.length
export const inTheMoney = (t: TournamentState) => t.remaining <= paidPlaces(t)
export const isBubble = (t: TournamentState) => t.remaining === paidPlaces(t) + 1
/** MTT na bolha com campo fora da mesa: joga-se mao a mao (todas as mesas dao uma mao por vez). */
export const isHandForHand = (t: TournamentState) =>
  t.config.kind === 'mtt' && t.heroPlace === null && t.offTable > 0 && isBubble(t)
export const currentLevel = (t: TournamentState) => levelAt(t.levelIdx)
/** Premio em buy-ins para uma colocacao (0 fora do dinheiro). */
export const prizeInBuyIns = (config: TournamentConfig, place: number) =>
  place >= 1 && place <= config.payouts.length ? config.payouts[place - 1] * config.fieldSize : 0

/**
 * Pressao de ICM sentida por um bot (-0,3..0,6): perto do dinheiro, stacks medios apertam
 * (perder fichas custa mais do que ganhar), o chip leader pressiona os outros e o stack
 * muito curto fica desesperado (empurra mais). 0 longe do dinheiro e depois de entrar nele.
 */
export function icmPressure(t: TournamentState, stack: number, avgStack: number): number {
  const paid = paidPlaces(t)
  if (t.remaining <= paid || t.remaining > paid + 4 || avgStack <= 0) return 0
  const base = t.remaining === paid + 1 ? 0.6 : t.remaining <= paid + 2 ? 0.35 : 0.15
  const ratio = stack / avgStack
  if (ratio < 0.45) return -0.3
  if (ratio > 1.5) return base * 0.4
  return base
}

export function ordinal(place: number): string {
  return `${place}º`
}

// ---------------------------------------------------------------- criacao

export interface TournamentStart {
  players: PlayerInit[]
  cfg: { sb: number; bb: number; ante: number }
  tour: TournamentState
}

const NAMES = ['Lucas', 'Marina', 'Rafa', 'Bia', 'Téo', 'Duda', 'Gui', 'Nina', 'Caio', 'Lia']

export function startTournament(
  config: TournamentConfig,
  heroName: string,
  pickProfile: (i: number) => string,
  rng: Rng = Math.random,
): TournamentStart {
  const seats = Math.min(config.tableSeats, config.fieldSize)
  const heroSeat = Math.floor(rng() * seats)
  const order = [...NAMES].sort(() => rng() - 0.5)
  let b = 0
  const players: PlayerInit[] = Array.from({ length: seats }, (_, i) =>
    i === heroSeat
      ? { name: heroName, isHero: true, profile: 'tag', stack: config.startStack }
      : { name: order[b % order.length] + (b >= order.length ? ` ${b}` : ''), profile: pickProfile(b++), stack: config.startStack },
  )
  const lvl = levelAt(0)
  return {
    players,
    cfg: { sb: lvl.sb, bb: lvl.bb, ante: lvl.ante },
    tour: {
      config,
      levelIdx: 0,
      handsInLevel: 0,
      remaining: config.fieldSize,
      offTable: config.fieldSize - seats,
      totalChips: config.fieldSize * config.startStack,
      nextId: 1,
      finishes: [],
      heroPlace: null,
      done: false,
    },
  }
}

// ---------------------------------------------------------------- avanco apos cada mao

/** Probabilidade de um jogador do campo simulado ser eliminado numa mao da mesa do heroi. */
export function bustProbability(avgStackBB: number): number {
  return 0.06 * Math.exp(-avgStackBB / 12)
}

/**
 * Chamada quando uma mao termina: registra eliminacoes (colocacao), simula o campo,
 * sobe o nivel de blinds e reabastece a mesa. Devolve o torneio e o jogo atualizados.
 */
export function advanceAfterHand(
  t: TournamentState,
  game: GameState,
  rng: Rng = Math.random,
  pickProfile: () => string = () => 'tag',
): { tour: TournamentState; game: GameState } {
  const seats = game.seats.map((s) => ({ ...s }))
  const finishes = [...t.finishes]
  let remaining = t.remaining
  let offTable = t.offTable
  let nextId = t.nextId
  let heroPlace = t.heroPlace

  // 1) eliminados na mesa: menor stack inicial fica com a pior colocacao
  const busted = seats.filter((s) => !s.out && s.stack <= 0).sort((a, b) => a.startStack - b.startStack)
  // Mao a mao (bolha do MTT): no maximo UMA eliminacao no campo por mao, e ela concorre com as da
  // mesa do heroi pela pior colocacao: quem tinha menos fichas cai primeiro (o campo simulado
  // usa a metade do stack medio fora da mesa como proxy, ja que quem quebra costuma ser curto).
  const hfh = isHandForHand(t)
  let hfhOffBust = false
  if (hfh) {
    const chipsAtTable = seats.reduce((a, s) => a + s.stack, 0)
    const avgOff = (t.totalChips - chipsAtTable) / t.offTable
    const p = bustProbability(avgOff / game.cfg.bb)
    for (let i = 0; i < t.offTable && !hfhOffBust; i++) if (rng() < p) hfhOffBust = true
    hfhOffBust = hfhOffBust && t.offTable > 1
    if (hfhOffBust) {
      const proxy = avgOff / 2
      const worse = busted.filter((b) => b.startStack < proxy)
      const better = busted.filter((b) => b.startStack >= proxy)
      const takeOut = (s: (typeof busted)[number]) => {
        finishes.push({ name: s.name, place: remaining, isHero: s.isHero })
        if (s.isHero) heroPlace = remaining
        remaining--
        s.out = true
      }
      worse.forEach(takeOut)
      finishes.push({ name: `Jogador ${nextId++}`, place: remaining, isHero: false })
      remaining--
      offTable--
      better.forEach(takeOut)
      busted.length = 0
    }
  }
  for (const s of busted) {
    finishes.push({ name: s.name, place: remaining, isHero: s.isHero })
    if (s.isHero) heroPlace = remaining
    remaining--
    s.out = true
  }

  const tableChips = seats.reduce((a, s) => a + s.stack, 0)
  const nextLevelIdx = t.handsInLevel + 1 >= t.config.handsPerLevel ? t.levelIdx + 1 : t.levelIdx
  const lvl = levelAt(nextLevelIdx)

  // 2) campo simulado (so MTT): eliminacoes fora da mesa
  if (t.config.kind === 'mtt' && offTable > 0 && heroPlace === null && !hfh) {
    const avgOff = (t.totalChips - tableChips) / offTable
    const p = bustProbability(avgOff / game.cfg.bb)
    let k = 0
    for (let i = 0; i < offTable; i++) if (rng() < p) k++
    // o campo simulado nunca fica vazio enquanto ha fichas nele: as fichas de quem quebra vao
    // para quem sobra. O ultimo so sai sentando na mesa (mesa final), senao as fichas sumiriam.
    k = Math.min(k, offTable - 1)
    for (let j = 0; j < k; j++) {
      finishes.push({ name: `Jogador ${nextId++}`, place: remaining, isHero: false })
      remaining--
      offTable--
    }
  }

  // 3) balanceamento: reabastece a mesa quando ela encolhe, ou forma a mesa final
  if (t.config.kind === 'mtt' && offTable > 0 && heroPlace === null) {
    const vacancies = seats.filter((s) => s.stack <= 0)
    const active = seats.length - vacancies.length
    const finalTable = remaining <= t.config.tableSeats
    if (finalTable || active <= t.config.tableSeats - 3) {
      let chipsRem = t.totalChips - tableChips
      const n = Math.min(vacancies.length, offTable)
      for (let i = 0; i < n; i++) {
        // o ultimo jogador do campo recebe exatamente o que sobra: as fichas se conservam
        const stack = offTable === 1 ? chipsRem : Math.round(chipsRem / offTable)
        chipsRem -= stack
        offTable--
        const seat = vacancies[i]
        seat.name = `Jogador ${nextId++}`
        seat.profile = pickProfile()
        seat.stack = stack
        seat.startStack = stack
        seat.out = false
        seat.folded = false
        seat.cards = null
      }
    }
  }

  // 4) campeao
  const heroAlive = heroPlace === null
  if (heroAlive && remaining === 1) {
    heroPlace = 1
    const hero = seats.find((s) => s.isHero)
    if (hero) finishes.push({ name: hero.name, place: 1, isHero: true })
  }

  const done = heroPlace !== null
  const tour: TournamentState = {
    ...t,
    levelIdx: nextLevelIdx,
    handsInLevel: nextLevelIdx === t.levelIdx ? t.handsInLevel + 1 : 0,
    remaining,
    offTable,
    nextId,
    finishes,
    heroPlace,
    done,
  }
  return {
    tour,
    game: { ...game, seats, cfg: { sb: lvl.sb, bb: lvl.bb, ante: lvl.ante } },
  }
}
