// ============================================================
// ENGINE: o campo de um MTT. Cada jogador do torneio existe de verdade: nome, estilo proprio,
// fichas e mesa. A mesa do heroi (mesa 0) e jogada na tela; as outras sao simuladas mao a mao
// com o mesmo motor e as mesmas decisoes dos bots, entao os bots se enfrentam, eliminam uns aos
// outros, as mesas quebram e a mesa final se forma. Camada pura: sem React e sem estado oculto.
// ============================================================
import { decideBot } from '../bots/policy'
import { fieldProfile, profileOf } from '../bots/profiles'
import type { Rng } from '../cards'
import { applyAction, createGame, startHand } from './reducer'
import type { BlindLevel, TournamentConfig, TournamentState } from './tournament'

export interface FieldPlayer {
  name: string
  /** Id do perfil, com os tracos individuais (ver bots/profiles). */
  profile: string
  stack: number
  alive: boolean
  isHero: boolean
  /** 0 = mesa do heroi (jogada na tela); 1 em diante = mesas simuladas. */
  table: number
}

export interface Field {
  players: FieldPlayer[]
  /** Nome de quem estava no botao em cada mesa simulada, para girar o botao a cada mao. */
  buttons: Record<number, string>
}

export interface Bust {
  name: string
  /** Fichas no inicio da mao em que caiu: define a colocacao quando varios caem juntos. */
  startStack: number
  isHero: boolean
}

/** Amostras de equity dos bots nas mesas simuladas: menos que na mesa jogada, para o torneio fluir. */
export const FIELD_EQUITY_ITERS = 40

const FIRST_NAMES = [
  'Lucas', 'Marina', 'Rafa', 'Bia', 'Téo', 'Duda', 'Gui', 'Nina', 'Caio', 'Lia', 'Davi', 'Ana', 'Enzo', 'Lara', 'Hugo',
  'Alice', 'Theo', 'Sara', 'Pedro', 'Julia', 'Otávio', 'Clara', 'Bruno', 'Luna', 'Igor', 'Maya', 'Vitor', 'Elisa', 'Nuno', 'Rita',
]
const INITIALS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function shuffled<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Nomes unicos ("Marina K."): 30 nomes x 26 iniciais = 780 combinacoes. */
function uniqueNames(n: number, rng: Rng): string[] {
  const all: string[] = []
  for (const f of FIRST_NAMES) for (const l of INITIALS) all.push(`${f} ${l}.`)
  return shuffled(all, rng).slice(0, n)
}

export const aliveCount = (f: Field) => f.players.filter((p) => p.alive).length

/** Jogadores vivos por mesa ({ 0: 9, 1: 9, ... }), so das mesas com alguem. */
export function tableSizes(f: Field): Record<number, number> {
  const out: Record<number, number> = {}
  for (const p of f.players) if (p.alive) out[p.table] = (out[p.table] ?? 0) + 1
  return out
}

/** Cria o campo: o heroi na mesa 0 e os demais sorteados nas mesas, que ficam com tamanhos quase iguais. */
export function createField(config: TournamentConfig, heroName: string, rng: Rng = Math.random): Field {
  const n = config.fieldSize
  const names = uniqueNames(n - 1, rng)
  const tables = Math.ceil(n / config.tableSeats)
  // tamanhos: o resto da divisao vai uma vaga a mais para as primeiras mesas
  const sizes = Array.from({ length: tables }, (_, i) => Math.floor(n / tables) + (i < n % tables ? 1 : 0))
  const order = [{ name: heroName, isHero: true }, ...names.map((name) => ({ name, isHero: false }))]
  const players: FieldPlayer[] = []
  let table = 0
  let used = 0
  for (const o of order) {
    if (used >= sizes[table]) { table++; used = 0 }
    used++
    players.push({
      name: o.name, isHero: o.isHero, table, alive: true, stack: config.startStack,
      profile: o.isHero ? 'tag' : fieldProfile(rng),
    })
  }
  return { players, buttons: {} }
}

/**
 * Joga uma mao em cada mesa simulada (a mesa 0 e jogada na tela). Devolve o campo com as fichas
 * atualizadas e quem ficou sem fichas; quem cai continua listado como vivo ate o torneio dar a colocacao.
 * `pressure`: pressao de ICM sentida por um bot com esse stack (0 longe do dinheiro).
 */
export function simulateTables(
  field: Field, level: BlindLevel, rng: Rng, pressure: (stack: number) => number,
): { field: Field; busted: Bust[] } {
  const players = field.players.map((p) => ({ ...p }))
  const buttons = { ...field.buttons }
  const busted: Bust[] = []
  const tableIds = [...new Set(players.filter((p) => p.alive && p.table !== 0).map((p) => p.table))].sort((a, b) => a - b)

  for (const t of tableIds) {
    const seated = players.filter((p) => p.alive && p.table === t)
    if (seated.length < 2) continue
    const prev = seated.findIndex((p) => p.name === buttons[t])
    const button = prev >= 0 ? (prev + 1) % seated.length : Math.floor(rng() * seated.length)
    let g = createGame(
      seated.map((p) => ({ name: p.name, profile: p.profile, stack: p.stack })),
      { sb: level.sb, bb: level.bb, ante: level.ante },
      button,
    )
    g = startHand(g, rng)
    let guard = 0
    while (!g.over) {
      const seat = g.seats[g.toAct]
      g = applyAction(g, decideBot(g, rng, pressure(seat.stack + seat.bet), FIELD_EQUITY_ITERS))
      if (++guard > 400) throw new Error('mao simulada nao termina')
    }
    g.seats.forEach((s, i) => {
      seated[i].stack = s.stack
      if (s.stack <= 0) busted.push({ name: seated[i].name, startStack: s.startStack, isHero: false })
    })
    buttons[t] = seated[g.button].name
  }
  return { field: { players, buttons }, busted }
}

/** Colocacao dos eliminados numa mesma rodada: quem comecou a mao com menos fichas fica na pior. */
export function assignPlaces(busted: Bust[], remaining: number): { name: string; place: number; isHero: boolean }[] {
  return [...busted]
    .sort((a, b) => a.startStack - b.startStack)
    .map((b, i) => ({ name: b.name, place: remaining - i, isHero: b.isHero }))
}

export interface Rebalanced {
  field: Field
  /** Jogadores que passaram a sentar na mesa do heroi (precisam de assento). */
  toHeroTable: FieldPlayer[]
  /** Nomes de quem saiu da mesa do heroi para outra mesa (o assento fica vago). */
  fromHeroTable: string[]
}

/**
 * Quebra mesas e equilibra: o numero de mesas acompanha o campo (ceil(vivos / assentos)), a menor
 * mesa de fora quebra primeiro, e as mesas ficam com no maximo 1 jogador de diferenca. A mesa do
 * heroi nunca quebra e o heroi nunca e movido; os outros jogadores dela podem mudar de mesa.
 * Com `assentos` ou menos vivos, todos sentam na mesa do heroi (mesa final).
 */
export function rebalance(field: Field, seats: number, rng: Rng): Rebalanced {
  const players = field.players.map((p) => ({ ...p }))
  const before = new Map(players.map((p) => [p.name, p.table]))
  const alive = () => players.filter((p) => p.alive)
  const count = (t: number) => alive().filter((p) => p.table === t).length
  // mesa -1 = jogador sem mesa (a mesa dele quebrou): nao conta como mesa
  const tableIds = () => [...new Set(alive().map((p) => p.table).filter((t) => t >= 0))]

  const needed = Math.max(1, Math.ceil(alive().length / seats))

  // 1) quebra as menores mesas de fora enquanto sobrarem mesas
  const pool: FieldPlayer[] = []
  while (tableIds().length > needed) {
    const others = tableIds().filter((t) => t !== 0)
    if (others.length === 0) break
    const smallest = others.reduce((a, b) => (count(b) < count(a) ? b : a))
    for (const p of alive().filter((q) => q.table === smallest)) { pool.push(p); p.table = -1 }
  }
  // 2) os jogadores das mesas quebradas vao para as mesas com mais vagas
  for (const p of shuffled(pool, rng)) {
    const open = tableIds().filter((t) => count(t) < seats)
    const min = Math.min(...open.map(count))
    const cands = open.filter((t) => count(t) === min)
    p.table = cands[Math.floor(rng() * cands.length)]
  }
  // 3) equilibra: sempre tira de uma mesa maior (sem mover o heroi) para a menor
  for (let guard = 0; guard < 500; guard++) {
    const ids = tableIds()
    const big = ids.reduce((a, b) => (count(b) > count(a) ? b : a))
    const small = ids.reduce((a, b) => (count(b) < count(a) ? b : a))
    if (count(big) - count(small) <= 1) break
    const movable = alive().filter((p) => p.table === big && !p.isHero)
    if (movable.length === 0) break
    movable[Math.floor(rng() * movable.length)].table = small
  }

  const toHeroTable = players.filter((p) => p.alive && p.table === 0 && before.get(p.name) !== 0)
  const fromHeroTable = players.filter((p) => p.alive && p.table !== 0 && before.get(p.name) === 0).map((p) => p.name)
  return { field: { players, buttons: field.buttons }, toHeroTable, fromHeroTable }
}

// ---------------------------------------------------------------- resumo para o painel do campo

export interface SummaryPlayer {
  name: string
  /** Rotulo do estilo (TAG, LAG+, Nit-...). */
  style: string
  stackBB: number
  isHero: boolean
  table: number
}

export interface TableRow {
  table: number
  players: number
  leader: string
  leaderBB: number
  isHeroTable: boolean
}

export interface FieldSummary {
  remaining: number
  fieldSize: number
  tables: number
  paid: number
  /** Quantos jogadores ainda precisam cair para entrar no dinheiro (0 quando ja esta). */
  toMoney: number
  inMoney: boolean
  heroStackBB: number
  /** Posicao do heroi em fichas (1 = chip leader). */
  heroRank: number
  avgStackBB: number
  leaders: SummaryPlayer[]
  heroTable: SummaryPlayer[]
  tableRows: TableRow[]
}

/** Numeros do campo para o painel: ranking, lideres, stack medio, mesas e quem esta na mesa do heroi. */
export function fieldSummary(t: TournamentState, bb: number): FieldSummary | null {
  const field = t.field
  if (!field) return null
  const alive = field.players.filter((p) => p.alive)
  const view = (p: FieldPlayer): SummaryPlayer => ({
    name: p.name, style: p.isHero ? 'Você' : profileOf(p.profile).label, stackBB: p.stack / bb, isHero: p.isHero, table: p.table,
  })
  const byStack = [...alive].sort((a, b) => b.stack - a.stack)
  const hero = alive.find((p) => p.isHero)
  const paid = t.config.payouts.length
  const rows = new Map<number, FieldPlayer[]>()
  for (const p of alive) rows.set(p.table, [...(rows.get(p.table) ?? []), p])
  const total = alive.reduce((a, p) => a + p.stack, 0)
  return {
    remaining: t.remaining,
    fieldSize: t.config.fieldSize,
    tables: rows.size,
    paid,
    toMoney: Math.max(0, t.remaining - paid),
    inMoney: t.remaining <= paid,
    heroStackBB: hero ? hero.stack / bb : 0,
    heroRank: hero ? byStack.findIndex((p) => p.isHero) + 1 : 0,
    avgStackBB: alive.length ? total / alive.length / bb : 0,
    leaders: byStack.slice(0, 5).map(view),
    heroTable: [...(rows.get(0) ?? [])].sort((a, b) => b.stack - a.stack).map(view),
    tableRows: [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([table, ps]) => {
        const lead = [...ps].sort((a, b) => b.stack - a.stack)[0]
        return { table, players: ps.length, leader: lead.name, leaderBB: lead.stack / bb, isHeroTable: table === 0 }
      }),
  }
}
