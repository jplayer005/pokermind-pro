// ============================================================
// ENGINE: torneios (Sit&Go e MTT). Camada pura sobre o motor da mao.
// SNG: uma mesa, todos os jogadores sentados. MTT: so a mesa do heroi e jogada; o resto
// do campo e simulado (eliminacoes por probabilidade) e reabastece a mesa (balanceamento).
// ============================================================
import type { Rng } from '../cards'
import { assignPlaces, createField, rebalance, simulateTables, type Bust, type Field } from './field'
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
  finishes: Finish[]
  heroPlace: number | null
  done: boolean
  /** O campo do MTT: cada jogador com nome, estilo, fichas e mesa. null no Sit&Go (a mesa e o torneio). */
  field: Field | null
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
  // MTT: o campo inteiro existe (nomes, estilos, fichas, mesas); a mesa do heroi e a mesa 0
  if (config.kind === 'mtt') {
    const field = createField(config, heroName, rng)
    const seated = field.players.filter((p) => p.table === 0)
    for (let i = seated.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[seated[i], seated[j]] = [seated[j], seated[i]]
    }
    const lvl0 = levelAt(0)
    return {
      players: seated.map((p) => ({ name: p.name, isHero: p.isHero, profile: p.profile, stack: p.stack })),
      cfg: { sb: lvl0.sb, bb: lvl0.bb, ante: lvl0.ante },
      tour: {
        config,
        levelIdx: 0,
        handsInLevel: 0,
        remaining: config.fieldSize,
        offTable: config.fieldSize - seated.length,
        totalChips: config.fieldSize * config.startStack,
        finishes: [],
        heroPlace: null,
        done: false,
        field,
      },
    }
  }

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
      finishes: [],
      heroPlace: null,
      done: false,
      field: null,
    },
  }
}

// ---------------------------------------------------------------- avanco apos cada mao

/**
 * Chamada quando uma mao da mesa do heroi termina: registra as eliminacoes (colocacao); no MTT joga
 * uma mao em cada outra mesa, quebra e equilibra as mesas e reabastece a mesa do heroi com jogadores
 * reais do campo; sobe o nivel de blinds. Devolve o torneio e o jogo atualizados.
 * (`_pickProfile` ficou so por compatibilidade: os jogadores do campo ja nascem com estilo proprio.)
 */
export function advanceAfterHand(
  t: TournamentState,
  game: GameState,
  rng: Rng = Math.random,
  _pickProfile: () => string = () => 'tag',
): { tour: TournamentState; game: GameState } {
  const seats = game.seats.map((s) => ({ ...s }))
  const finishes = [...t.finishes]
  let remaining = t.remaining
  let heroPlace = t.heroPlace
  let field = t.field

  // 1) eliminados na mesa do heroi
  const busted: Bust[] = seats
    .filter((s) => !s.out && s.stack <= 0)
    .map((s) => ({ name: s.name, startStack: s.startStack, isHero: s.isHero }))

  // 2) MTT: as fichas da mesa do heroi vao para o campo e cada outra mesa joga uma mao
  if (field) {
    const stackOf = new Map(seats.filter((s) => !s.out).map((s) => [s.name, s.stack]))
    field = {
      ...field,
      players: field.players.map((p) => (p.alive && stackOf.has(p.name) ? { ...p, stack: stackOf.get(p.name) as number } : p)),
    }
    const avg = t.totalChips / Math.max(1, t.remaining)
    const level = levelAt(t.levelIdx)
    const sim = simulateTables(field, level, rng, (stack) => icmPressure(t, stack, avg), avg / level.bb)
    field = sim.field
    busted.push(...sim.busted)
  }

  // 3) colocacoes: quem comecou a mao com menos fichas fica na pior (na bolha, o maior stack se salva)
  const placed = assignPlaces(busted, remaining)
  for (const p of placed) {
    finishes.push({ name: p.name, place: p.place, isHero: p.isHero })
    if (p.isHero) heroPlace = p.place
    remaining--
  }
  const out = new Set(placed.map((p) => p.name))
  for (const s of seats) if (out.has(s.name)) s.out = true
  if (field) {
    field = { ...field, players: field.players.map((p) => (out.has(p.name) ? { ...p, alive: false, stack: 0 } : p)) }
  }

  const nextLevelIdx = t.handsInLevel + 1 >= t.config.handsPerLevel ? t.levelIdx + 1 : t.levelIdx
  const lvl = levelAt(nextLevelIdx)

  // 4) MTT: quebra de mesas, mesa final e reabastecimento da mesa do heroi com jogadores reais
  if (field && heroPlace === null) {
    const rb = rebalance(field, t.config.tableSeats, rng)
    field = rb.field
    for (const name of rb.fromHeroTable) {
      const s = seats.find((x) => x.name === name && !x.out)
      if (s) { s.out = true; s.stack = 0 } // as fichas dele seguem com ele no campo
    }
    for (const p of rb.toHeroTable) {
      const s = seats.find((x) => x.out || x.stack <= 0)
      if (!s) continue
      s.name = p.name
      s.profile = p.profile
      s.stack = p.stack
      s.startStack = p.stack
      s.out = false
      s.folded = false
      s.cards = null
    }
  }

  // 5) campeao
  if (heroPlace === null && remaining === 1) {
    heroPlace = 1
    const hero = seats.find((s) => s.isHero)
    if (hero) finishes.push({ name: hero.name, place: 1, isHero: true })
  }

  const tour: TournamentState = {
    ...t,
    levelIdx: nextLevelIdx,
    handsInLevel: nextLevelIdx === t.levelIdx ? t.handsInLevel + 1 : 0,
    remaining,
    offTable: field ? field.players.filter((p) => p.alive && p.table !== 0).length : 0,
    finishes,
    heroPlace,
    done: heroPlace !== null,
    field,
  }
  return {
    tour,
    game: { ...game, seats, cfg: { sb: lvl.sb, bb: lvl.bb, ante: lvl.ante } },
  }
}
