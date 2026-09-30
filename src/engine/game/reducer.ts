// ============================================================
// ENGINE: maquina de estados de uma mao de No-Limit Hold'em
// Funcoes puras: cada uma devolve um GameState novo.
// ============================================================
import { evaluate, describe } from '../evaluator'
import type { Rng } from '../cards'
import { buildPots, awardPots } from './pots'
import type {
  Action, GameConfig, GameState, HandEvent, LegalActions, PlayerInit, Seat, Street,
} from './types'

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river']

// ---------- helpers ----------

function cloneSeat(s: Seat): Seat {
  return { ...s, cards: s.cards ? [s.cards[0], s.cards[1]] : null }
}

function cloneState(s: GameState): GameState {
  return { ...s, seats: s.seats.map(cloneSeat), board: [...s.board], deck: [...s.deck], history: [...s.history] }
}

export function shuffledDeck(rng: Rng = Math.random): number[] {
  const d = Array.from({ length: 52 }, (_, i) => i)
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[d[i], d[j]] = [d[j], d[i]]
  }
  return d
}

const inHand = (s: Seat) => !s.out && !s.folded
const canAct = (s: Seat) => inHand(s) && !s.allIn

/** Proximo assento (clockwise) apos `from` que satisfaz `pred`; -1 se nenhum. */
function nextSeat(seats: Seat[], from: number, pred: (s: Seat) => boolean): number {
  const n = seats.length
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n
    if (pred(seats[i])) return i
  }
  return -1
}

/** Total na mesa: potes ja recolhidos + apostas da rua. */
export function potTotal(state: GameState): number {
  return state.seats.reduce((a, s) => a + s.total, 0)
}

// ---------- criacao ----------

export function createGame(players: PlayerInit[], cfg: GameConfig, button = 0): GameState {
  const seats: Seat[] = players.map((p, i) => ({
    id: i,
    name: p.name,
    isHero: !!p.isHero,
    profile: p.profile,
    stack: p.stack,
    bet: 0,
    total: 0,
    startStack: p.stack,
    folded: false,
    out: p.stack <= 0,
    allIn: false,
    acted: false,
    raiseLocked: false,
    cards: null,
    lastAction: '',
  }))
  return {
    cfg,
    seats,
    button,
    street: 'preflop',
    board: [],
    deck: [],
    currentBet: 0,
    lastRaiseSize: cfg.bb,
    toAct: -1,
    handNumber: 0,
    over: true,
    gameOver: false,
    runout: false,
    runoutFrom: -1,
    result: null,
    history: [],
  }
}

function logEvent(
  s: GameState, seat: number, type: HandEvent['type'], amount: number, toCall = 0,
) {
  s.history.push({
    street: s.street, seat, type, amount, potBefore: potTotal(s), toCall, allIn: s.seats[seat].allIn,
  })
}

function post(s: GameState, idx: number, amount: number, asBlind: boolean, type: 'ante' | 'sb' | 'bb') {
  const seat = s.seats[idx]
  const paid = Math.min(seat.stack, amount)
  logEvent(s, idx, type, paid)
  seat.stack -= paid
  seat.total += paid
  if (asBlind) seat.bet += paid
  if (seat.stack === 0) seat.allIn = true
}

/**
 * Inicia uma nova mao: gira o botao, posta ante e blinds e da as cartas.
 * Assentos sem fichas ficam fora. Com menos de 2 jogadores, marca gameOver.
 */
export function startHand(prev: GameState, rng: Rng = Math.random): GameState {
  const s = cloneState(prev)
  s.seats.forEach((seat) => {
    seat.bet = 0
    seat.total = 0
    seat.out = seat.stack <= 0
    seat.folded = seat.out
    seat.allIn = false
    seat.acted = false
    seat.raiseLocked = false
    seat.cards = null
    seat.lastAction = ''
    seat.startStack = seat.stack
  })
  s.board = []
  s.history = []
  s.result = null
  s.runout = false
  s.runoutFrom = -1
  s.street = 'preflop'

  const funded = s.seats.filter((x) => !x.out)
  if (funded.length < 2) {
    s.over = true
    s.gameOver = true
    s.toAct = -1
    return s
  }
  s.gameOver = false
  s.over = false
  s.handNumber = prev.handNumber + 1

  const alive = (x: Seat) => !x.out
  s.button = prev.handNumber === 0 && alive(s.seats[prev.button])
    ? prev.button
    : nextSeat(s.seats, prev.button, alive)

  const heads = funded.length === 2
  const sbIdx = heads ? s.button : nextSeat(s.seats, s.button, alive)
  const bbIdx = nextSeat(s.seats, sbIdx, alive)

  s.deck = shuffledDeck(rng)
  for (const seat of s.seats) {
    if (!seat.out) seat.cards = [s.deck.pop() as number, s.deck.pop() as number]
  }

  const { sb, bb, ante } = s.cfg
  if (ante > 0) for (const seat of s.seats) if (!seat.out) post(s, seat.id, ante, false, 'ante')
  post(s, sbIdx, sb, true, 'sb')
  post(s, bbIdx, bb, true, 'bb')
  s.currentBet = bb
  s.lastRaiseSize = bb

  return resolve(s, bbIdx)
}

// ---------- acoes legais ----------

export function legalActions(state: GameState): LegalActions {
  const seat = state.seats[state.toAct]
  if (!seat || state.over) {
    return { canCheck: false, canCall: false, callAmount: 0, canRaise: false, minTo: 0, maxTo: 0 }
  }
  const owed = state.currentBet - seat.bet
  const maxTo = seat.bet + seat.stack
  const minTo = Math.min(maxTo, state.currentBet + state.lastRaiseSize)
  return {
    canCheck: owed <= 0,
    canCall: owed > 0,
    callAmount: Math.min(Math.max(owed, 0), seat.stack),
    canRaise: !seat.raiseLocked && maxTo > state.currentBet,
    minTo,
    maxTo,
  }
}

/** All-in como acao valida (call all-in se nao ha como aumentar). */
export function allInAction(state: GameState): Action {
  const la = legalActions(state)
  return la.canRaise ? { type: 'raise', to: la.maxTo } : { type: 'call' }
}

// ---------- aplicar acao ----------

export function applyAction(prev: GameState, action: Action): GameState {
  if (prev.over || prev.toAct < 0) throw new Error('Nenhuma acao esperada')
  const s = cloneState(prev)
  const idx = s.toAct
  const seat = s.seats[idx]
  const la = legalActions(s)
  const owed = Math.max(0, s.currentBet - seat.bet)

  switch (action.type) {
    case 'fold': {
      logEvent(s, idx, 'fold', 0, owed)
      seat.folded = true
      seat.lastAction = 'fold'
      break
    }
    case 'check': {
      if (!la.canCheck) throw new Error('Check ilegal: ha aposta a pagar')
      logEvent(s, idx, 'check', 0, 0)
      seat.acted = true
      seat.lastAction = 'check'
      break
    }
    case 'call': {
      if (!la.canCall) throw new Error('Call ilegal: nada a pagar')
      const paid = la.callAmount
      seat.stack -= paid
      seat.bet += paid
      seat.total += paid
      seat.acted = true
      if (seat.stack === 0) seat.allIn = true
      logEvent(s, idx, 'call', paid, owed)
      seat.lastAction = seat.allIn ? 'all-in' : 'call'
      break
    }
    case 'raise': {
      if (!la.canRaise) throw new Error('Raise ilegal')
      const to = action.to
      if (!Number.isInteger(to) || to > la.maxTo) throw new Error('Raise acima do stack')
      if (to < la.minTo) throw new Error(`Raise abaixo do minimo (${la.minTo})`)
      if (to <= s.currentBet) throw new Error('Raise deve superar a aposta atual')
      const put = to - seat.bet
      const raiseSize = to - s.currentBet
      const isFull = raiseSize >= s.lastRaiseSize

      seat.stack -= put
      seat.bet = to
      seat.total += put
      seat.acted = true
      if (seat.stack === 0) seat.allIn = true

      for (const o of s.seats) {
        if (o.id === idx || !canAct(o)) continue
        o.raiseLocked = isFull ? false : o.raiseLocked || o.acted
        o.acted = false
      }
      if (isFull) s.lastRaiseSize = raiseSize
      const opening = s.currentBet === 0
      s.currentBet = to
      logEvent(s, idx, 'raise', to, owed)
      seat.lastAction = seat.allIn ? 'all-in' : opening ? `bet ${to}` : `raise ${to}`
      break
    }
  }
  return resolve(s, idx)
}

// ---------- fluxo da rua ----------

function roundComplete(s: GameState): boolean {
  const active = s.seats.filter(canAct)
  if (active.length === 0) return true
  if (active.length === 1) return active[0].bet >= s.currentBet
  return active.every((x) => x.acted && x.bet === s.currentBet)
}

/** Decide o proximo passo apos uma acao (ou apos postar blinds). */
function resolve(s: GameState, lastActor: number): GameState {
  for (;;) {
    if (s.seats.filter(inHand).length <= 1) return finishHand(s)
    if (!roundComplete(s)) {
      const needs = (x: Seat) => canAct(x) && (!x.acted || x.bet < s.currentBet)
      s.toAct = nextSeat(s.seats, lastActor, needs)
      if (s.toAct >= 0) return s
    }
    // rua encerrada
    if (s.street === 'river') return finishHand(s)
    advanceStreet(s)
    lastActor = s.button
  }
}

function advanceStreet(s: GameState) {
  for (const x of s.seats) {
    x.bet = 0
    x.acted = false
    x.raiseLocked = false
    if (!x.out && !x.folded && !x.allIn) x.lastAction = ''
  }
  s.currentBet = 0
  s.lastRaiseSize = s.cfg.bb
  const next = STREETS[STREETS.indexOf(s.street) + 1]
  const count = next === 'flop' ? 3 : 1
  const before = s.board.length
  for (let i = 0; i < count; i++) s.board.push(s.deck.pop() as number)
  s.street = next
  if (s.seats.filter(canAct).length <= 1) {
    // ninguem mais pode apostar: as cartas restantes saem sem acao (a tela revela por etapas)
    if (!s.runout) s.runoutFrom = before
    s.runout = true
  }
}

// ---------- fim da mao ----------

function finishHand(s: GameState): GameState {
  const startTotal = s.seats.reduce((a, x) => a + x.stack + x.total, 0)

  // Completa o board se a mao foi decidida por all-in
  const contenders = s.seats.filter(inHand)
  const showdown = contenders.length > 1
  if (showdown) {
    if (s.board.length < 5 && !s.runout) s.runoutFrom = s.board.length
    while (s.board.length < 5) s.board.push(s.deck.pop() as number)
    if (s.street !== 'river') s.runout = true
    s.street = 'river'
  }

  // Devolve a parte nao paga da maior aposta
  let refund: { seat: number; amount: number } | null = null
  const sorted = [...s.seats].sort((a, b) => b.total - a.total)
  if (sorted[0].total > sorted[1].total) {
    const amount = sorted[0].total - sorted[1].total
    sorted[0].total -= amount
    sorted[0].stack += amount
    sorted[0].bet = Math.max(0, sorted[0].bet - amount)
    refund = { seat: sorted[0].id, amount }
  }

  const scores: (number | null)[] = s.seats.map((x) =>
    showdown && inHand(x) && x.cards ? evaluate([...x.cards, ...s.board]) : null,
  )
  const pots = buildPots(s.seats)
  const award = awardPots(pots, scores, s.button)
  const winners: { seat: number; amount: number; handName?: string }[] = []
  award.payout.forEach((amt, i) => {
    if (amt <= 0) return
    s.seats[i].stack += amt
    const sc = scores[i]
    winners.push({ seat: i, amount: amt, handName: sc !== null ? describe(sc) : undefined })
  })

  const net = s.seats.map((x) => x.stack - x.startStack)
  s.seats.forEach((x) => { x.bet = 0 })
  s.result = { showdown, runout: s.runout, runoutFrom: s.runoutFrom, pots: award.pots, net, winners, scores, refund }
  s.over = true
  s.toAct = -1

  const endTotal = s.seats.reduce((a, x) => a + x.stack, 0)
  if (endTotal !== startTotal) throw new Error(`Fichas nao conservadas: ${startTotal} -> ${endTotal}`)
  return s
}

// ---------- posicoes ----------

const LABELS: Record<number, string[]> = {
  2: ['BTN', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['CO', 'BTN', 'SB', 'BB'],
  5: ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  6: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  7: ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  9: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
}

/** Posicao de cada assento na mao atual (HU: o botao e SB e aparece como BTN). */
export function positionsBySeat(state: GameState): Record<number, string> {
  const active = state.seats.filter((x) => !x.out).map((x) => x.id)
  const n = active.length
  const out: Record<number, string> = {}
  const labels = LABELS[n]
  if (!labels) return out
  // ordem de acao pre-flop: comeca no primeiro a agir e termina no BB
  const heads = n === 2
  const alive = (x: Seat) => !x.out
  const sb = heads ? state.button : nextSeat(state.seats, state.button, alive)
  const bb = nextSeat(state.seats, sb, alive)
  let i = nextSeat(state.seats, bb, alive)
  for (let k = 0; k < n; k++) {
    out[i] = labels[k]
    i = nextSeat(state.seats, i, alive)
  }
  return out
}
