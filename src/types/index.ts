// ============================================================
// POKERMIND PRO — TIPOS GLOBAIS
// Arquivo central de tipos TypeScript para toda a aplicação
// ============================================================

// ------- CARTAS -------
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 'A' | 'K' | 'Q' | 'J' | 'T' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

export interface Card {
  rank: Rank
  suit: Suit
}

// ------- POSIÇÕES -------
// Todas as posições possíveis de UTG (9 jogadores) a HU
export type Position = 'UTG' | 'UTG+1' | 'UTG+2' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'
export type PositionShort = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'

// ------- FORMATO DE MESA -------
export type TableFormat = 'HU' | '6max' | '9max'

// ------- AÇÕES DE POKER -------
export type Action = 'fold' | 'call' | 'raise' | 'check' | '3bet' | '4bet' | 'jam' | 'limp'
export type Street = 'preflop' | 'flop' | 'turn' | 'river'

// ------- RANGE -------
export interface HandCombo {
  hand: string        // Ex: "AKs", "QQ", "72o"
  action: Action
  frequency: number   // 0-1, frequência GTO
  ev?: number
}

export interface RangeMatrix {
  [hand: string]: {
    action: Action
    frequency: number
    ev?: number
  }
}

// ------- TREINO PRÉ-FLOP -------
export type PreflopScenario =
  | 'open_raise'
  | 'vs_raise'
  | '3bet'
  | '4bet'
  | 'push_fold'
  | 'bb_defense'
  | 'squeeze'
  | 'sb_vs_bb'
  | 'postflop'

export interface PreflopDrillQuestion {
  id: string
  hand: string              // Ex: "AKs"
  position: Position
  heroStack: number         // Em BBs
  scenario: PreflopScenario
  villainAction?: Action
  villainPosition?: Position
  correctAction: Action
  correctFrequency: number  // Frequência GTO (0-1)
  explanation: string
  evComparison?: {
    fold: number
    call: number
    raise: number
  }
  // GTO mixing: frequências de cada ação quando há mistura (ex: {raise: 0.7, fold: 0.3})
  gtoMix?: Partial<Record<Action, number>>
}

export interface DrillSession {
  id: string
  startedAt: number
  endedAt?: number
  totalQuestions: number
  correctAnswers: number
  questions: DrillResult[]
  mode: 'study' | 'drill' | 'exam' | 'competition'
  scenario: PreflopScenario
}

export interface DrillResult {
  questionId: string
  hand: string
  userAction: Action
  correctAction: Action
  isCorrect: boolean
  timeMs: number
  timestamp: number
}

// ------- PÓS-FLOP -------
export interface PostflopSpot {
  id: string
  board: Card[]
  potType: 'SRP' | '3bet' | '4bet'
  heroPosition: 'IP' | 'OOP'
  potSize: number
  effectiveStack: number
  heroRange: string
  villainRange: string
  recommendedSizing: string[]
  strategy: PostflopStrategy
}

export interface PostflopStrategy {
  bet: { frequency: number; sizing: string[] }
  check: { frequency: number }
  raise: { frequency: number; sizing: string[] }
  fold: { frequency: number }
}

// ------- HAND REPLAYER -------
export interface ReplayerAction {
  player: string
  action: Action
  amount?: number
  street: Street
  timestamp: number
}

export interface SavedHand {
  id: string
  title: string
  date: number
  heroCards: Card[]
  board: Card[]
  players: ReplayerPlayer[]
  actions: ReplayerAction[]
  pot: number
  result: number
  notes: string
  tags: string[]
}

export interface ReplayerPlayer {
  name: string
  position: Position
  stack: number
  cards?: Card[]
  isHero: boolean
}

// ------- ESTATÍSTICAS -------
export interface UserStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  accuracy: number
  studyTimeMinutes: number
  currentStreak: number
  maxStreak: number
  xp: number
  level: number
  lastStudyDate: string
  // Campos opcionais adicionados para conquistas e streak visual
  lastStudyDates?: string[]        // últimos 30 dias de estudo (ISO date)
  flashcardsReviewed?: number      // total de flashcards revisados
  competitionBestScore?: number    // maior score no modo competição
  competitionGamesPlayed?: number  // total de partidas de competição
  modulesCompleted?: number        // aulas de curso completadas
}

export interface PerformanceBySpot {
  position: Position
  scenario: PreflopScenario
  accuracy: number
  totalAttempts: number
}

// ------- USUÁRIO -------
export type UserPlan = 'free' | 'premium' | 'elite'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  plan: UserPlan
  joinedAt: number
  stats: UserStats
  achievements: Achievement[]
  goals: StudyGoal[]
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category?: string    // 'start'|'streak'|'precision'|'volume'|'mastery'|'time'|'sessions'|'competition'|'content'|'level'|'xp'|'special'
  unlockedAt?: number
  progress?: number
  maxProgress?: number
}

export interface StudyGoal {
  id: string
  type: 'daily_questions' | 'weekly_accuracy' | 'streak'
  target: number
  current: number
  period: 'daily' | 'weekly' | 'monthly'
}

// ------- SPACED REPETITION (SM-2) -------
export interface QuestionSM2Data {
  questionId: string
  interval: number       // dias até próxima revisão
  repetitions: number    // acertos consecutivos
  easeFactor: number     // 2.5 padrão, mínimo 1.3
  nextReview: string     // ISO date "2026-05-30"
  totalAttempts: number
  totalCorrect: number
  lastSeen: string       // ISO date
}

// ------- CALCULADORAS -------
export interface PotOddsCalc {
  potSize: number
  callAmount: number
  equity: number
  decision: 'call' | 'fold'
  breakeven: number
}

export interface ICMCalc {
  payouts: number[]
  stacks: number[]
  icmValues: number[]
}

export interface EVCalc {
  foldEV: number
  callEV: number
  raiseEV: number
  bestAction: Action
}

// ------- CONTEÚDO EDUCACIONAL -------
export interface Course {
  id: string
  title: string
  description: string
  thumbnail: string
  category: 'preflop' | 'postflop' | 'mtt' | 'cash' | 'mental' | 'icm'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  modules: CourseModule[]
  totalMinutes: number
  isPremium: boolean
}

export interface CourseModule {
  id: string
  title: string
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  title: string
  duration: number
  isCompleted: boolean
  type: 'video' | 'article' | 'quiz' | 'drill'
  content?: string   // conteúdo real da aula (markdown-lite)
}

export interface Flashcard {
  id: string
  front: string
  back: string
  category: string
  difficulty: 1 | 2 | 3 | 4 | 5
  lastReviewed?: number
  nextReview?: number
  correctCount: number
  incorrectCount: number
}

// ------- NAVEGAÇÃO -------
export type NavSection =
  | 'dashboard'
  | 'preflop'
  | 'postflop'
  | 'replayer'
  | 'calculators'
  | 'study'
  | 'profile'
