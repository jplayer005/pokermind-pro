// ============================================================
// ENGINE: tipos da mao de poker (No-Limit Hold'em). Fichas sao inteiros.
// ============================================================

export type Street = 'preflop' | 'flop' | 'turn' | 'river'

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** `to` = total apostado na rua apos a jogada (aposta e raise usam o mesmo tipo). */
  | { type: 'raise'; to: number }

export interface PlayerInit {
  name: string
  isHero?: boolean
  /** id do perfil do bot (ver bots/profiles). Ignorado para o heroi. */
  profile: string
  stack: number
}

export interface Seat {
  id: number
  name: string
  isHero: boolean
  profile: string
  stack: number // fichas atras
  bet: number // comprometido nesta rua
  total: number // comprometido nesta mao (inclui ante)
  startStack: number
  folded: boolean
  out: boolean // sem fichas / fora da mao
  allIn: boolean
  acted: boolean
  raiseLocked: boolean // all-in curto nao reabre a acao para quem ja agiu
  cards: [number, number] | null
  lastAction: string
}

export interface HandEvent {
  street: Street
  seat: number
  type: 'ante' | 'sb' | 'bb' | 'fold' | 'check' | 'call' | 'raise'
  /** para raise: total da rua apos a jogada; para call/blinds/ante: fichas colocadas. */
  amount: number
  potBefore: number
  toCall: number
  allIn: boolean
}

export interface PotLayer {
  amount: number
  eligible: number[]
}

export interface HandResult {
  showdown: boolean
  runout: boolean
  /** Quantas cartas do board havia quando o runout comecou (todos all-in); -1 se nao houve. */
  runoutFrom: number
  pots: (PotLayer & { winners: number[] })[]
  /** variacao de fichas por assento na mao (soma = 0). */
  net: number[]
  winners: { seat: number; amount: number; handName?: string }[]
  scores: (number | null)[]
  refund: { seat: number; amount: number } | null
}

export interface GameConfig {
  sb: number
  bb: number
  ante: number
}

export interface GameState {
  cfg: GameConfig
  seats: Seat[]
  button: number
  street: Street
  board: number[]
  deck: number[]
  currentBet: number
  lastRaiseSize: number
  toAct: number // -1 quando ninguem pode agir
  handNumber: number
  over: boolean // mao terminada (ou mesa sem jogadores suficientes)
  gameOver: boolean // menos de 2 jogadores com fichas
  runout: boolean
  /** Idem HandResult.runoutFrom: usado para revelar o board por etapas. */
  runoutFrom: number
  result: HandResult | null
  history: HandEvent[]
}

export interface LegalActions {
  canCheck: boolean
  canCall: boolean
  callAmount: number
  canRaise: boolean
  minTo: number
  maxTo: number
}
