// ============================================================
// POKERMIND PRO — TREINADOR PÓS-FLOP (REESCRITA COMPLETA)
// Treino real: hand + board + decisão GTO com feedback detalhado
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle, XCircle, Info, Play, RotateCcw, TrendingUp, AlertCircle } from 'lucide-react'
import { Button, Card, Badge, SectionHeader, ProgressBar } from '@/components/ui'
import PlayingCard, { Board } from '@/components/poker/PlayingCard'
import TrainingTable from '@/components/poker/TrainingTable'
import { cn, getDifficultyXPMultiplier } from '@/lib/utils'
import { Card as CardType, Action } from '@/types'
import { useUserStore, useTrainingStore, useUIStore } from '@/store'
import {
  evaluatePostflopHand, analyzeBoardTexture, getGTODecision,
  generateRandomCards, analyzeBoardAdvantage, analyzeBlockerEffects,
  classifyTurnCard,
} from '@/lib/poker'
import type { PostflopHandEval, BoardTexture, GtoDecision, BoardAdvantageAnalysis, BlockerEffect, TurnCardInfo } from '@/lib/poker'

// ---- TIPOS ----
type HeroPos = 'IP' | 'OOP'
type PotType = 'SRP' | '3bet'
type FacingScenario = 'first_to_act' | 'facing_bet'

type PostflopAction = 'check' | 'bet_33' | 'bet_50' | 'bet_67' | 'bet_75' | 'bet_pot' | 'fold' | 'call' | 'raise' | 'check_raise'

const ACTION_LABELS: Record<PostflopAction, string> = {
  check:       'Checar',
  check_raise: 'Check-Raise',
  bet_33:      'Bet 33%',
  bet_50:      'Bet 50%',
  bet_67:      'Bet 67%',
  bet_75:      'Bet 75%',
  bet_pot:     'Bet Pot',
  fold:        'Fold',
  call:        'Call',
  raise:       'Raise',
}

const FIRST_TO_ACT_ACTIONS_IP: PostflopAction[]        = ['check', 'bet_33', 'bet_50', 'bet_67', 'bet_pot']
const FIRST_TO_ACT_ACTIONS_OOP: PostflopAction[]       = ['check', 'check_raise', 'bet_33', 'bet_50', 'bet_67']
const TURN_FIRST_TO_ACT_ACTIONS_IP: PostflopAction[]   = ['check', 'bet_50', 'bet_67', 'bet_75', 'bet_pot']
const TURN_FIRST_TO_ACT_ACTIONS_OOP: PostflopAction[]  = ['check', 'check_raise', 'bet_50', 'bet_67', 'bet_75']
const RIVER_FIRST_TO_ACT_ACTIONS_IP: PostflopAction[]  = ['check', 'bet_33', 'bet_67', 'bet_pot']
const RIVER_FIRST_TO_ACT_ACTIONS_OOP: PostflopAction[] = ['check', 'check_raise', 'bet_33', 'bet_67', 'bet_pot']
const FACING_BET_ACTIONS: PostflopAction[] = ['fold', 'call', 'raise']

// ---- HELPERS ----
function strengthColor(strength: number): string {
  if (strength >= 60) return 'bg-emerald-500'
  if (strength >= 30) return 'bg-yellow-500'
  return 'bg-red-500'
}

function strengthTextColor(strength: number): string {
  if (strength >= 60) return 'text-emerald-400'
  if (strength >= 30) return 'text-yellow-400'
  return 'text-red-400'
}

function textureBadgeVariant(label: string): 'crimson' | 'emerald' | 'gold' | 'blue' | 'neutral' {
  if (label.includes('Monotone') || label.includes('Molhado')) return 'crimson'
  if (label.includes('Seco')) return 'emerald'
  if (label.includes('Conectado') || label.includes('Semi')) return 'gold'
  if (label.includes('Pareado')) return 'blue'
  return 'neutral'
}

// ---- SETUP PHASE ----
type StreetMode = 'full' | 'flop_only' | 'turn_only' | 'river_only'

interface SetupConfig {
  position: HeroPos
  potType: PotType
  scenario: FacingScenario
  potSize: number
  effectiveStack: number
  streetMode: StreetMode
}

function SetupPanel({ onStart }: { onStart: (cfg: SetupConfig) => void }) {
  const [position, setPosition] = useState<HeroPos>('IP')
  const [potType, setPotType] = useState<PotType>('SRP')
  const [scenario, setScenario] = useState<FacingScenario>('first_to_act')
  const [potSize, setPotSize] = useState(10)
  const [effectiveStack, setEffectiveStack] = useState(100)
  const [streetMode, setStreetMode] = useState<StreetMode>('full')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Posição */}
      <Card className="p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Sua Posição</div>
        <div className="grid grid-cols-2 gap-2">
          {(['IP', 'OOP'] as HeroPos[]).map(pos => (
            <button
              key={pos}
              onClick={() => setPosition(pos)}
              className={cn(
                'py-3 rounded-xl text-sm font-mono font-bold border transition-all',
                position === pos
                  ? pos === 'IP'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-red-500/15 border-red-500/40 text-red-400'
                  : 'bg-bg-overlay border-border-subtle text-text-muted'
              )}
            >
              {pos === 'IP' ? '✅ IP (Em Posição)' : '❌ OOP (Fora Posição)'}
            </button>
          ))}
        </div>
      </Card>

      {/* Tipo de Pot */}
      <Card className="p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Tipo de Pot</div>
        <div className="grid grid-cols-2 gap-2">
          {(['SRP', '3bet'] as PotType[]).map(pt => (
            <button
              key={pt}
              onClick={() => setPotType(pt)}
              className={cn(
                'py-2.5 rounded-xl text-xs font-mono font-bold border transition-all',
                potType === pt
                  ? 'bg-accent-blue/15 border-accent-blue/40 text-accent-blue'
                  : 'bg-bg-overlay border-border-subtle text-text-muted'
              )}
            >
              {pt === 'SRP' ? '🎯 SRP (Pote Simples)' : '🔥 3bet Pote'}
            </button>
          ))}
        </div>
      </Card>

      {/* Cenário */}
      <Card className="p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Cenário</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setScenario('first_to_act')}
            className={cn(
              'py-3 rounded-xl text-xs font-bold border transition-all',
              scenario === 'first_to_act'
                ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                : 'bg-bg-overlay border-border-subtle text-text-muted'
            )}
          >
            ↗ Primeiro a Agir
            <div className="text-[10px] opacity-70 mt-0.5 font-normal">bet ou check</div>
          </button>
          <button
            onClick={() => setScenario('facing_bet')}
            className={cn(
              'py-3 rounded-xl text-xs font-bold border transition-all',
              scenario === 'facing_bet'
                ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                : 'bg-bg-overlay border-border-subtle text-text-muted'
            )}
          >
            ⚡ Villain Apostou
            <div className="text-[10px] opacity-70 mt-0.5 font-normal">fold/call/raise</div>
          </button>
        </div>
      </Card>

      {/* Modo de treino */}
      <Card className="p-4">
        <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Modo de Treino</div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'full',        label: '3 Ruas',    icon: '🔄', sub: 'Flop → Turn → River' },
            { id: 'flop_only',   label: 'Só Flop',   icon: '🟦', sub: 'Decisão apenas no flop' },
            { id: 'turn_only',   label: 'Só Turn',   icon: '🟨', sub: 'Decisão apenas no turn' },
            { id: 'river_only',  label: 'Só River',  icon: '🟥', sub: 'Decisão apenas no river' },
          ] as const).map(({ id, label, icon, sub }) => (
            <button
              key={id}
              onClick={() => setStreetMode(id)}
              className={cn(
                'py-3 px-3 rounded-xl text-xs font-bold border text-left transition-all',
                streetMode === id
                  ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                  : 'bg-bg-overlay border-border-subtle text-text-muted hover:border-border-default'
              )}
            >
              <div>{icon} {label}</div>
              <div className="text-[10px] font-normal opacity-70 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Sliders de tamanho */}
      <Card className="p-4 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wider">Tamanho do Pot</span>
            <span className="font-mono text-sm font-bold text-accent-gold">{potSize} BB</span>
          </div>
          <input
            type="range" min={4} max={60} step={2}
            value={potSize}
            onChange={e => setPotSize(Number(e.target.value))}
            className="w-full accent-yellow-400"
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>4 BB</span><span>30 BB</span><span>60 BB</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-text-muted uppercase tracking-wider">Stack Efetivo</span>
            <span className="font-mono text-sm font-bold text-accent-blue">{effectiveStack} BB</span>
          </div>
          <input
            type="range" min={20} max={200} step={10}
            value={effectiveStack}
            onChange={e => setEffectiveStack(Number(e.target.value))}
            className="w-full accent-blue-400"
          />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>20 BB</span><span>100 BB</span><span>200 BB</span>
          </div>
        </div>
      </Card>

      <Button variant="gold" size="lg" onClick={() => onStart({ position, potType, scenario, potSize, effectiveStack, streetMode })} className="w-full">
        <Play size={16} />
        Iniciar Drill Pós-Flop
      </Button>
    </motion.div>
  )
}

// ---- DRILL STATE ----
interface DrillState {
  // Flop
  board: CardType[]
  heroCards: [CardType, CardType]
  handEval: PostflopHandEval
  texture: BoardTexture
  gtoDecision: GtoDecision
  boardAdvantage: BoardAdvantageAnalysis
  blockerEffects: BlockerEffect[]
  answered: boolean
  userAction: PostflopAction | null
  resultType: 'correct' | 'alternative' | 'wrong' | null
  // Turn
  phase: 'flop' | 'turn' | 'river'
  turnCard: CardType | null
  turnInfo: TurnCardInfo | null
  turnHandEval: PostflopHandEval | null
  turnGtoDecision: GtoDecision | null
  turnEstimatedPot: number
  turnAnswered: boolean
  turnUserAction: PostflopAction | null
  turnResultType: 'correct' | 'alternative' | 'wrong' | null
  // River
  riverCard: CardType | null
  riverInfo: TurnCardInfo | null   // reutiliza TurnCardInfo (mesma lógica)
  riverHandEval: PostflopHandEval | null
  riverGtoDecision: GtoDecision | null
  riverEstimatedPot: number
  riverAnswered: boolean
  riverUserAction: PostflopAction | null
  riverResultType: 'correct' | 'alternative' | 'wrong' | null
}

function estimateTurnPot(flopPot: number, flopAction: PostflopAction | null): number {
  if (!flopAction) return flopPot
  const multipliers: Partial<Record<PostflopAction, number>> = {
    bet_33: 1 + 0.33 * 2, bet_50: 2, bet_67: 1 + 0.67 * 2,
    bet_75: 1 + 0.75 * 2, bet_pot: 3, check: 1,
  }
  return Math.round(flopPot * (multipliers[flopAction] ?? 1))
}

function generateDrillState(cfg: SetupConfig): DrillState {
  const boardCards = generateRandomCards(3) as [CardType, CardType, CardType]
  const heroCards = generateRandomCards(2, boardCards) as [CardType, CardType]
  const texture = analyzeBoardTexture(boardCards)
  const handEval = evaluatePostflopHand(heroCards, boardCards)
  const gtoDecision = getGTODecision(handEval, texture, cfg.position, cfg.potType, cfg.scenario === 'facing_bet', 'flop')
  const boardAdvantage = analyzeBoardAdvantage(texture, cfg.potType, cfg.position)
  const blockerEffects = analyzeBlockerEffects(heroCards)
  let state: DrillState = {
    board: boardCards, heroCards, handEval, texture,
    gtoDecision, boardAdvantage, blockerEffects,
    answered: false, userAction: null, resultType: null,
    phase: 'flop',
    turnCard: null, turnInfo: null, turnHandEval: null,
    turnGtoDecision: null, turnEstimatedPot: cfg.potSize,
    turnAnswered: false, turnUserAction: null, turnResultType: null,
    riverCard: null, riverInfo: null, riverHandEval: null,
    riverGtoDecision: null, riverEstimatedPot: cfg.potSize,
    riverAnswered: false, riverUserAction: null, riverResultType: null,
  }
  if (cfg.streetMode === 'turn_only') {
    state = { ...advanceTurn(state, cfg), answered: true }
  } else if (cfg.streetMode === 'river_only') {
    state = advanceTurn(state, cfg)
    state = { ...advanceRiver(state, cfg), answered: true, turnAnswered: true }
  }
  return state
}

function advanceTurn(drill: DrillState, cfg: SetupConfig): DrillState {
  const turnCard = generateRandomCards(1, [...drill.heroCards, ...drill.board])[0] as CardType
  const fullBoard = [...drill.board, turnCard]
  const turnInfo = classifyTurnCard(drill.heroCards, drill.board, turnCard, drill.handEval)
  const turnHandEval = evaluatePostflopHand(drill.heroCards, fullBoard)
  const turnTexture = analyzeBoardTexture(fullBoard)
  const turnGtoDecision = getGTODecision(turnHandEval, turnTexture, cfg.position, cfg.potType, false, 'turn')
  const turnEstimatedPot = estimateTurnPot(cfg.potSize, drill.userAction)
  return {
    ...drill,
    phase: 'turn',
    turnCard, turnInfo, turnHandEval, turnGtoDecision, turnEstimatedPot,
    turnAnswered: false, turnUserAction: null, turnResultType: null,
  }
}

function advanceRiver(drill: DrillState, cfg: SetupConfig): DrillState {
  const usedCards = [...drill.heroCards, ...drill.board, ...(drill.turnCard ? [drill.turnCard] : [])]
  const riverCard = generateRandomCards(1, usedCards)[0] as CardType
  const fullBoard = [...drill.board, ...(drill.turnCard ? [drill.turnCard] : []), riverCard]
  const riverInfo = classifyTurnCard(drill.heroCards, fullBoard.slice(0, -1), riverCard,
    drill.turnHandEval ?? drill.handEval)
  const riverHandEval = evaluatePostflopHand(drill.heroCards, fullBoard)
  const riverTexture = analyzeBoardTexture(fullBoard)
  const riverGtoDecision = getGTODecision(riverHandEval, riverTexture, cfg.position, cfg.potType, false, 'river')
  const riverEstimatedPot = estimateTurnPot(drill.turnEstimatedPot, drill.turnUserAction)
  return {
    ...drill,
    phase: 'river',
    riverCard, riverInfo, riverHandEval, riverGtoDecision, riverEstimatedPot,
    riverAnswered: false, riverUserAction: null, riverResultType: null,
  }
}

// Mapeia PostflopAction para Action (compatibilidade com DrillResult)
function toAction(a: PostflopAction): Action {
  if (a === 'fold') return 'fold'
  if (a === 'call') return 'call'
  if (a === 'check' || a === 'check_raise') return 'check'
  return 'raise' // bet_33, bet_50, bet_67, bet_75, bet_pot, raise
}

// ---- MAIN COMPONENT ----
export default function PostflopTrainer() {
  const { addXP, updateStats, updateStreak, syncAchievements, profile } = useUserStore()
  const { startSession, answerQuestion, endSession, currentSession } = useTrainingStore()
  const { defaultDifficulty } = useUIStore()

  const [config, setConfig] = useState<SetupConfig | null>(null)
  const [drill, setDrill] = useState<DrillState | null>(null)
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 })

  // Refs para scroll automático ao avançar ruas
  const turnSectionRef = useRef<HTMLDivElement>(null)
  const riverSectionRef = useRef<HTMLDivElement>(null)

  // Rola automaticamente quando muda de fase
  useEffect(() => {
    if (!drill) return
    const ref = drill.phase === 'turn' ? turnSectionRef : drill.phase === 'river' ? riverSectionRef : null
    if (ref?.current) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150) // aguarda React renderizar o conteúdo
    }
  }, [drill?.phase])

  const handleStart = useCallback((cfg: SetupConfig) => {
    setConfig(cfg)
    setDrill(generateDrillState(cfg))
    setSessionStats({ total: 0, correct: 0 })
    startSession('drill', 'postflop')
  }, [startSession])

  const handleAnswer = useCallback((action: PostflopAction) => {
    if (!drill || !config) return
    if (drill.phase === 'flop' && drill.answered) return
    if (drill.phase === 'turn' && drill.turnAnswered) return

    if (drill.phase === 'flop') {
      const gto = drill.gtoDecision
      const resultType: 'correct' | 'alternative' | 'wrong' =
        action === gto.primaryAction ? 'correct' :
        (gto.alternativeAction && action === gto.alternativeAction) ? 'alternative' : 'wrong'
      setDrill(prev => prev ? { ...prev, answered: true, userAction: action, resultType } : prev)
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (resultType === 'correct' ? 1 : resultType === 'alternative' ? 0.5 : 0),
      }))
      const xp = resultType === 'correct' ? 10 : resultType === 'alternative' ? 5 : 0
      if (xp > 0) addXP(Math.round(xp * getDifficultyXPMultiplier(defaultDifficulty)))
      answerQuestion({
        questionId: `postflop_flop_${Date.now()}`,
        hand: drill.heroCards.map(c => `${c.rank}${c.suit[0]}`).join(''),
        userAction: toAction(action),
        correctAction: toAction(gto.primaryAction),
        isCorrect: resultType === 'correct',
        timeMs: 0,
        timestamp: Date.now(),
      })
    } else if (drill.phase === 'turn') {
      const gto = drill.turnGtoDecision!
      const resultType: 'correct' | 'alternative' | 'wrong' =
        action === gto.primaryAction ? 'correct' :
        (gto.alternativeAction && action === gto.alternativeAction) ? 'alternative' : 'wrong'
      setDrill(prev => prev ? { ...prev, turnAnswered: true, turnUserAction: action, turnResultType: resultType } : prev)
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (resultType === 'correct' ? 1 : resultType === 'alternative' ? 0.5 : 0),
      }))
      const xp = resultType === 'correct' ? 10 : resultType === 'alternative' ? 5 : 0
      if (xp > 0) addXP(xp)
      answerQuestion({
        questionId: `postflop_turn_${Date.now()}`,
        hand: drill.heroCards.map(c => `${c.rank}${c.suit[0]}`).join(''),
        userAction: toAction(action),
        correctAction: toAction(gto.primaryAction),
        isCorrect: resultType === 'correct',
        timeMs: 0,
        timestamp: Date.now(),
      })
    } else {
      // River
      const gto = drill.riverGtoDecision!
      const resultType: 'correct' | 'alternative' | 'wrong' =
        action === gto.primaryAction ? 'correct' :
        (gto.alternativeAction && action === gto.alternativeAction) ? 'alternative' : 'wrong'
      setDrill(prev => prev ? { ...prev, riverAnswered: true, riverUserAction: action, riverResultType: resultType } : prev)
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (resultType === 'correct' ? 1 : resultType === 'alternative' ? 0.5 : 0),
      }))
      const xp = resultType === 'correct' ? 10 : resultType === 'alternative' ? 5 : 0
      if (xp > 0) addXP(xp)
      answerQuestion({
        questionId: `postflop_river_${Date.now()}`,
        hand: drill.heroCards.map(c => `${c.rank}${c.suit[0]}`).join(''),
        userAction: toAction(action),
        correctAction: toAction(gto.primaryAction),
        isCorrect: resultType === 'correct',
        timeMs: 0,
        timestamp: Date.now(),
      })
    }
  }, [drill, config, addXP, answerQuestion])

  const handleGoToTurn = useCallback(() => {
    if (!drill || !config) return
    setDrill(prev => prev ? advanceTurn(prev, config) : prev)
  }, [drill, config])

  const handleGoToRiver = useCallback(() => {
    if (!drill || !config) return
    setDrill(prev => prev ? advanceRiver(prev, config) : prev)
  }, [drill, config])

  const handleNext = useCallback(() => {
    if (!config) return
    const sessionDuration = currentSession
      ? Math.round((Date.now() - currentSession.startedAt) / 60000)
      : 0
    endSession()
    const newTotal = profile.stats.totalQuestions + sessionStats.total
    const newCorrect = profile.stats.totalCorrect + Math.round(sessionStats.correct)
    if (sessionStats.total > 0) {
      updateStats({
        totalQuestions: newTotal,
        totalCorrect: newCorrect,
        accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
        studyTimeMinutes: profile.stats.studyTimeMinutes + sessionDuration,
        totalSessions: profile.stats.totalSessions + 1,
      })
      updateStreak()
      syncAchievements(useTrainingStore.getState().sessionHistory, useTrainingStore.getState().competitionHighScores)
    }
    setSessionStats({ total: 0, correct: 0 })
    startSession('drill', 'postflop')
    setDrill(generateDrillState(config))
  }, [config, currentSession, endSession, updateStats, updateStreak, syncAchievements, profile, sessionStats, startSession])

  const handleEnd = useCallback(() => {
    if (sessionStats.total > 0) {
      const sessionDuration = currentSession
        ? Math.round((Date.now() - currentSession.startedAt) / 60000)
        : 0
      endSession()
      const newTotal = profile.stats.totalQuestions + sessionStats.total
      const newCorrect = profile.stats.totalCorrect + Math.round(sessionStats.correct)
      updateStats({
        totalQuestions: newTotal,
        totalCorrect: newCorrect,
        accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
        studyTimeMinutes: profile.stats.studyTimeMinutes + sessionDuration,
        totalSessions: profile.stats.totalSessions + 1,
      })
      updateStreak()
      syncAchievements(useTrainingStore.getState().sessionHistory, useTrainingStore.getState().competitionHighScores)
    } else {
      endSession()
    }
    setConfig(null)
    setDrill(null)
  }, [sessionStats, currentSession, endSession, updateStats, updateStreak, syncAchievements, profile])

  const currentPhase = drill?.phase ?? 'flop'
  const actions = config?.scenario === 'facing_bet'
    ? FACING_BET_ACTIONS
    : currentPhase === 'river'
      ? (config?.position === 'OOP' ? RIVER_FIRST_TO_ACT_ACTIONS_OOP : RIVER_FIRST_TO_ACT_ACTIONS_IP)
      : currentPhase === 'turn'
        ? (config?.position === 'OOP' ? TURN_FIRST_TO_ACT_ACTIONS_OOP : TURN_FIRST_TO_ACT_ACTIONS_IP)
        : (config?.position === 'OOP' ? FIRST_TO_ACT_ACTIONS_OOP : FIRST_TO_ACT_ACTIONS_IP)

  // Board cards acumulados para a mesa visual
  const tableBoardCards = drill ? [
    ...drill.board,
    ...(drill.turnCard ? [drill.turnCard] : []),
    ...(drill.riverCard ? [drill.riverCard] : []),
  ] : []

  return (
    <div className="page-scroll">
      <div className="lg:flex lg:min-h-full">

        {/* ===== PAINEL ESQUERDO: mesa de poker (desktop only, só durante drill) ===== */}
        {config && drill && (
          <div className="hidden lg:flex lg:flex-col lg:w-[380px] xl:w-[420px] lg:shrink-0 lg:border-r lg:border-border-subtle lg:p-6 lg:overflow-y-auto">
            <TrainingTable
              position={config.position}
              heroCards={drill.heroCards}
              boardCards={tableBoardCards}
              boardPhase={drill.phase}
              potSize={drill.phase === 'flop' ? config.potSize : drill.phase === 'turn' ? drill.turnEstimatedPot : drill.riverEstimatedPot}
            />
          </div>
        )}

        {/* ===== PAINEL DIREITO: conteúdo (mobile: tela inteira) ===== */}
        <div className="flex-1 min-w-0">
      <div className="px-4 py-4 pb-6 space-y-4 lg:px-6 max-w-2xl mx-auto lg:max-w-none lg:mx-0">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-text-primary">Treinador Pós-Flop</h1>
            <p className="text-xs text-text-muted mt-0.5">Treino com sua mão real no board</p>
          </div>
          {config && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="font-mono text-xs text-accent-emerald font-bold">
                  {sessionStats.total > 0 ? `${Math.round((sessionStats.correct / sessionStats.total) * 100)}%` : '—'}
                </div>
                <div className="text-[10px] text-text-muted">{sessionStats.total} mãos</div>
              </div>
            </div>
          )}
        </div>

        {/* SETUP ou DRILL */}
        <AnimatePresence mode="wait">
          {!config ? (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SetupPanel onStart={handleStart} />
            </motion.div>
          ) : drill ? (
            <motion.div
              key={drill.board.map(c => `${c.rank}${c.suit}`).join('-')}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-4"
            >
              {/* CONTEXTO */}
              <Card className="p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={config.position === 'IP' ? 'emerald' : 'crimson'}>{config.position}</Badge>
                  <Badge variant="blue">{config.potType}</Badge>
                  <Badge variant="neutral">{config.scenario === 'facing_bet' ? 'Villain Apostou' : 'Primeiro a Agir'}</Badge>
                  <Badge variant="gold">{config.potSize} BB pot</Badge>
                  <Badge variant="neutral">{config.effectiveStack} BB stack</Badge>
                </div>
              </Card>

              {/* ===== SEÇÃO FLOP (só para full e flop_only) ===== */}
              {(config.streetMode === 'full' || config.streetMode === 'flop_only') && (<>

              {/* BOARD */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-text-muted uppercase tracking-wider">Board (Flop)</span>
                  <Badge variant={textureBadgeVariant(drill.texture.label)}>{drill.texture.label}</Badge>
                </div>
                <div className="flex justify-center">
                  <Board cards={drill.board} size="md" maxCards={3} />
                </div>
              </Card>

              {/* MÃO DO HERÓI */}
              <Card className="p-4">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-3 text-center">Sua Mão</div>
                <div className="flex justify-center gap-3">
                  {drill.heroCards.map((card, i) => (
                    <PlayingCard key={i} card={card} size="lg" animate delay={i * 0.1} />
                  ))}
                </div>
                {!drill.answered && (
                  <div className="mt-3 text-center">
                    <span className="text-xs text-text-muted">{drill.handEval.label}</span>
                  </div>
                )}
              </Card>

              {/* BOTÕES DE AÇÃO */}
              {!drill.answered && (
                <div className={cn(
                  'grid gap-2',
                  actions.length <= 3 ? 'grid-cols-3' : 'grid-cols-5'
                )}>
                  {actions.map(action => (
                    <button
                      key={action}
                      onClick={() => handleAnswer(action)}
                      className={cn(
                        'py-3 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                        action === 'fold'
                          ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          : action === 'call'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                          : action === 'raise'
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                          : action === 'check'
                          ? 'bg-bg-overlay border-border-default text-text-secondary hover:bg-bg-elevated'
                          : action === 'check_raise'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20'
                          : 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold hover:bg-accent-gold/20'
                      )}
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  ))}
                </div>
              )}

              {/* RESULTADO */}
              <AnimatePresence>
                {drill.answered && drill.userAction && drill.resultType && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Veredito */}
                    <Card className={cn(
                      'p-4 border-2',
                      drill.resultType === 'correct' ? 'border-emerald-500/40 bg-emerald-500/5'
                      : drill.resultType === 'alternative' ? 'border-yellow-500/40 bg-yellow-500/5'
                      : 'border-red-500/40 bg-red-500/5'
                    )}>
                      <div className="flex items-start gap-3 mb-3">
                        {drill.resultType === 'correct' ? (
                          <CheckCircle size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        ) : drill.resultType === 'alternative' ? (
                          <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className={cn(
                            'text-sm font-bold mb-0.5',
                            drill.resultType === 'correct' ? 'text-emerald-400'
                            : drill.resultType === 'alternative' ? 'text-yellow-400'
                            : 'text-red-400'
                          )}>
                            {drill.resultType === 'correct' ? 'Correto! Jogada GTO principal.' : drill.resultType === 'alternative' ? 'Também válido, mas menos frequente.' : 'Incorreto'}
                          </div>
                          <div className="text-xs text-text-muted">
                            Você escolheu:{' '}
                            <span className="font-mono font-bold text-text-primary">{ACTION_LABELS[drill.userAction]}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            GTO principal:{' '}
                            <span className="font-mono font-bold text-accent-gold">{ACTION_LABELS[drill.gtoDecision.primaryAction]}</span>
                            {' '}<span className="text-text-muted">({Math.round(drill.gtoDecision.primaryFrequency * 100)}% freq.)</span>
                          </div>
                          {drill.gtoDecision.alternativeAction && (
                            <div className="text-xs text-text-muted mt-0.5">
                              Alternativa válida:{' '}
                              <span className="font-mono text-text-secondary">{ACTION_LABELS[drill.gtoDecision.alternativeAction as PostflopAction]}</span>
                              {' '}<span className="text-text-muted">({Math.round((drill.gtoDecision.alternativeFrequency ?? 0) * 100)}%)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Explicação GTO */}
                      <div className="flex items-start gap-2 mt-3 pt-3 border-t border-border-subtle">
                        <Info size={13} className="text-accent-blue flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {drill.gtoDecision.explanation}
                        </p>
                      </div>
                    </Card>

                    {/* Avaliação da mão + força */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Avaliação da Mão</span>
                        <span className={cn('text-xs font-mono font-bold', strengthTextColor(drill.handEval.strength))}>
                          {drill.handEval.strength}/100
                        </span>
                      </div>
                      <div className="text-sm font-bold text-text-primary mb-2">{drill.handEval.label}</div>

                      {/* Barra de força */}
                      <div className="h-2 bg-bg-overlay rounded-full overflow-hidden mb-3">
                        <motion.div
                          className={cn('h-full rounded-full', strengthColor(drill.handEval.strength))}
                          initial={{ width: 0 }}
                          animate={{ width: `${drill.handEval.strength}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut' }}
                        />
                      </div>

                      {/* Draws */}
                      {drill.handEval.draws.length > 0 && (
                        <div className="flex gap-1 flex-wrap mb-2">
                          {drill.handEval.draws.map(d => (
                            <Badge key={d} variant="blue" size="sm">{d}</Badge>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        {drill.handEval.description}
                      </p>
                    </Card>

                    {/* Textura do board */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Textura do Board</span>
                        <Badge variant={textureBadgeVariant(drill.texture.label)}>{drill.texture.label}</Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {drill.texture.paired && <Badge variant="neutral" size="sm">Pareado</Badge>}
                        {drill.texture.monotone && <Badge variant="crimson" size="sm">Monotone</Badge>}
                        {drill.texture.twoTone && !drill.texture.monotone && <Badge variant="gold" size="sm">Two-tone</Badge>}
                        {drill.texture.connected && <Badge variant="blue" size="sm">Conectado</Badge>}
                        {drill.texture.wet && <Badge variant="crimson" size="sm">Molhado</Badge>}
                        {drill.texture.dry && <Badge variant="emerald" size="sm">Seco</Badge>}
                        <Badge variant="neutral" size="sm">Top: {drill.texture.topRank}</Badge>
                      </div>
                    </Card>

                    {/* Range Advantage vs Nut Advantage */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Vantagem de Range</span>
                        <div className="flex gap-1.5">
                          <Badge
                            variant={drill.boardAdvantage.rangeAdvantage === config.position ? 'emerald' : drill.boardAdvantage.rangeAdvantage === 'neutral' ? 'neutral' : 'crimson'}
                            size="sm"
                          >
                            Range: {drill.boardAdvantage.rangeAdvantage === 'neutral' ? 'Neutro' : drill.boardAdvantage.rangeAdvantage === config.position ? `Você (${config.position})` : `Villain`}
                          </Badge>
                          <Badge
                            variant={drill.boardAdvantage.nutAdvantage === config.position ? 'emerald' : drill.boardAdvantage.nutAdvantage === 'neutral' ? 'neutral' : 'crimson'}
                            size="sm"
                          >
                            Nuts: {drill.boardAdvantage.nutAdvantage === 'neutral' ? 'Neutro' : drill.boardAdvantage.nutAdvantage === config.position ? `Você` : `Villain`}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-secondary leading-relaxed mb-2">
                        {drill.boardAdvantage.explanation}
                      </p>
                      <div className="bg-bg-base rounded-lg p-2 border border-border-subtle">
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          <span className="text-accent-blue font-semibold">Implicação: </span>
                          {drill.boardAdvantage.bettingImplication}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="neutral" size="sm">
                          Freq: {drill.boardAdvantage.recommendedFrequency === 'high' ? 'Alta' : drill.boardAdvantage.recommendedFrequency === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                        <Badge variant="neutral" size="sm">
                          Tamanho: {drill.boardAdvantage.recommendedSize === 'small' ? 'Pequeno (33%)' : drill.boardAdvantage.recommendedSize === 'large' ? 'Grande (67-pot)' : drill.boardAdvantage.recommendedSize === 'mixed' ? 'Misto' : 'Médio (50%)'}
                        </Badge>
                      </div>
                    </Card>

                    {/* Blocker Effects */}
                    {drill.blockerEffects.length > 0 && (
                      <Card className="p-4">
                        <div className="text-xs text-text-muted uppercase tracking-wider mb-3">
                          Bloqueadores das suas cartas
                        </div>
                        <p className="text-[10px] text-text-muted mb-3">
                          Suas cartas reduzem os seguintes combos no range do villain:
                        </p>
                        <div className="space-y-2">
                          {drill.blockerEffects.slice(0, 4).map(b => (
                            <div key={b.hand} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                  b.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                                  b.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-bg-overlay text-text-muted'
                                )}>
                                  {b.impact === 'high' ? '↓↓' : b.impact === 'medium' ? '↓' : '~'}
                                </span>
                                <span className="text-xs font-mono text-text-primary">{b.hand}</span>
                                <span className="text-[10px] text-text-muted">{b.label}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-mono text-text-secondary">
                                  {b.originalCombos} → <span className={b.impact === 'high' ? 'text-red-400' : 'text-yellow-400'}>{b.remainingCombos}</span> combos
                                </span>
                                <span className="text-[10px] text-text-muted ml-1">(-{b.percentBlocked}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {drill.blockerEffects.some(b => b.impact === 'high') && (
                          <p className="text-[10px] text-accent-blue mt-2 pt-2 border-t border-border-subtle">
                            Bloqueadores fortes aumentam sua fold equity — villain tem menos combos de mãos fortes para chamar ou raisar.
                          </p>
                        )}
                      </Card>
                    )}

                    {/* Check-Raise tip */}
                    {config.position === 'OOP' && config.scenario === 'first_to_act' && drill.gtoDecision.checkRaiseCandidate && (
                      <Card className="p-3 border border-purple-500/30 bg-purple-500/5">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400 text-sm font-bold">♟ Check-Raise Spot</span>
                        </div>
                        <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
                          Esta mão tem potencial de check-raise OOP. Cheque com intenção de raisar se villain apostar — constrói potes maiores que donk bet e protege sua checking range.
                        </p>
                      </Card>
                    )}

                    {/* Botões de navegação: Turn ou Próxima Mão */}
                    {drill.phase === 'flop' ? (
                      config.streetMode === 'flop_only' ? (
                        <Button variant="gold" size="lg" onClick={handleNext} className="w-full">
                          <RefreshCw size={13} />
                          Nova Mão
                        </Button>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="ghost" size="md" onClick={handleNext} className="text-text-muted">
                            <RefreshCw size={13} />
                            Nova Mão
                          </Button>
                          <Button variant="gold" size="md" onClick={handleGoToTurn} className="w-full">
                            Ir para o Turn →
                          </Button>
                        </div>
                      )
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Fecha o bloco da seção flop */}
              </>)}

              {/* ===================== TURN PHASE ===================== */}
              <AnimatePresence>
                {drill.phase === 'turn' && drill.turnCard && drill.turnInfo && (
                  <div ref={turnSectionRef}>
                  <motion.div
                    key="turn-phase"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Turn header */}
                    <div className={cn(
                      'rounded-xl p-3 border flex items-center justify-between',
                      drill.turnInfo.type === 'gin'   ? 'bg-emerald-500/10 border-emerald-500/30' :
                      drill.turnInfo.type === 'scare' ? 'bg-red-500/10 border-red-500/30' :
                                                        'bg-bg-overlay border-border-subtle'
                    )}>
                      <div>
                        <div className={cn(
                          'text-sm font-bold',
                          drill.turnInfo.type === 'gin'   ? 'text-emerald-400' :
                          drill.turnInfo.type === 'scare' ? 'text-red-400' :
                                                            'text-text-secondary'
                        )}>
                          Turn — {drill.turnInfo.label}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          Pot estimado: ~{drill.turnEstimatedPot} BB
                        </div>
                      </div>
                      <Badge
                        variant={drill.turnInfo.type === 'gin' ? 'emerald' : drill.turnInfo.type === 'scare' ? 'crimson' : 'neutral'}
                      >
                        {drill.turnInfo.type.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Board completo com turn */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Board (Turn)</span>
                        <span className="text-[10px] text-text-muted">4 cartas</span>
                      </div>
                      <div className="flex justify-center">
                        <Board cards={[...drill.board, drill.turnCard]} size="md" maxCards={4} />
                      </div>
                      <p className="text-[10px] text-text-muted mt-3 leading-relaxed text-center">
                        {drill.turnInfo.reason}
                      </p>
                    </Card>

                    {/* Mão do herói atualizada */}
                    <Card className="p-4">
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-3 text-center">Sua Mão no Turn</div>
                      <div className="flex justify-center gap-3 mb-3">
                        {drill.heroCards.map((card, i) => (
                          <PlayingCard key={i} card={card} size="lg" animate delay={i * 0.1} />
                        ))}
                      </div>
                      {!drill.turnAnswered && drill.turnHandEval && (
                        <div className="text-center">
                          <span className="text-xs text-text-muted">{drill.turnHandEval.label}</span>
                          {drill.turnHandEval.draws.length > 0 && (
                            <div className="flex gap-1 justify-center mt-1">
                              {drill.turnHandEval.draws.map(d => (
                                <Badge key={d} variant="blue" size="sm">{d}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>

                    {/* Contexto da ação: última ação do villain + jogadores após hero */}
                    {!drill.turnAnswered && (
                      <Card className="p-3 border border-accent-blue/20 bg-accent-blue/5">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-[10px] text-text-muted uppercase tracking-wider">Contexto da ação</div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs">
                                <span className="text-text-muted">Villain: </span>
                                <span className={cn('font-mono font-bold text-xs',
                                  config.position === 'IP' && config.scenario === 'facing_bet' ? 'text-orange-400' :
                                  config.position === 'IP' ? 'text-text-secondary' : 'text-text-muted/60'
                                )}>
                                  {config.position === 'IP' && config.scenario === 'facing_bet' ? 'Apostou ⚡' :
                                   config.position === 'IP' ? 'Checked ✓' : 'Aguardando...'}
                                </span>
                              </span>
                              <span className="text-text-muted text-[10px]">|</span>
                              <span className="text-xs">
                                <span className="text-text-muted">Após você: </span>
                                <span className="font-mono font-bold text-accent-blue">
                                  {config.position === 'OOP' ? '1 jogador' : '0 jogadores'}
                                </span>
                              </span>
                            </div>
                          </div>
                          <Badge variant={config.position === 'IP' ? 'emerald' : 'crimson'} size="sm">
                            {config.position}
                          </Badge>
                        </div>
                      </Card>
                    )}

                    {/* Botões de ação do turn */}
                    {!drill.turnAnswered && (
                      <div className={cn('grid gap-2', `grid-cols-${actions.length}`)}>
                        {actions.map(action => (
                          <button
                            key={action}
                            onClick={() => handleAnswer(action)}
                            className={cn(
                              'py-3 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                              action === 'fold'        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' :
                              action === 'call'        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' :
                              action === 'raise'       ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' :
                              action === 'check'       ? 'bg-bg-overlay border-border-default text-text-secondary hover:bg-bg-elevated' :
                              action === 'check_raise' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20' :
                                                         'bg-accent-gold/10 border-accent-gold/30 text-accent-gold hover:bg-accent-gold/20'
                            )}
                          >
                            {ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Feedback do turn */}
                    <AnimatePresence>
                      {drill.turnAnswered && drill.turnUserAction && drill.turnResultType && drill.turnGtoDecision && drill.turnHandEval && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3"
                        >
                          {/* Veredito turn */}
                          <Card className={cn(
                            'p-4 border-2',
                            drill.turnResultType === 'correct'     ? 'border-emerald-500/40 bg-emerald-500/5' :
                            drill.turnResultType === 'alternative' ? 'border-yellow-500/40 bg-yellow-500/5' :
                                                                     'border-red-500/40 bg-red-500/5'
                          )}>
                            <div className="flex items-start gap-3 mb-3">
                              {drill.turnResultType === 'correct' ? (
                                <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                              ) : drill.turnResultType === 'alternative' ? (
                                <AlertCircle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className={cn(
                                  'text-sm font-bold mb-0.5',
                                  drill.turnResultType === 'correct' ? 'text-emerald-400' :
                                  drill.turnResultType === 'alternative' ? 'text-yellow-400' : 'text-red-400'
                                )}>
                                  {drill.turnResultType === 'correct' ? 'Correto no Turn! 🎯' :
                                   drill.turnResultType === 'alternative' ? 'Válido, mas menos freq.' : 'Incorreto no Turn'}
                                </div>
                                <div className="text-xs text-text-muted">
                                  Você: <span className="font-mono font-bold text-text-primary">{ACTION_LABELS[drill.turnUserAction]}</span>
                                </div>
                                <div className="text-xs text-text-muted mt-0.5">
                                  GTO: <span className="font-mono font-bold text-accent-gold">{ACTION_LABELS[drill.turnGtoDecision.primaryAction as PostflopAction]}</span>
                                  {' '}({Math.round(drill.turnGtoDecision.primaryFrequency * 100)}%)
                                </div>
                                {drill.turnGtoDecision.alternativeAction && (
                                  <div className="text-xs text-text-muted mt-0.5">
                                    Alt: <span className="font-mono text-text-secondary">{ACTION_LABELS[drill.turnGtoDecision.alternativeAction as PostflopAction]}</span>
                                    {' '}({Math.round((drill.turnGtoDecision.alternativeFrequency ?? 0) * 100)}%)
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border-subtle">
                              <Info size={13} className="text-accent-blue shrink-0 mt-0.5" />
                              <p className="text-[11px] text-text-secondary leading-relaxed">
                                {drill.turnGtoDecision.explanation}
                              </p>
                            </div>
                          </Card>

                          {/* Avaliação da mão no turn */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-text-muted uppercase tracking-wider">Mão no Turn</span>
                              <span className={cn('text-xs font-mono font-bold', strengthTextColor(drill.turnHandEval.strength))}>
                                {drill.turnHandEval.strength}/100
                              </span>
                            </div>
                            <div className="text-sm font-bold text-text-primary mb-2">{drill.turnHandEval.label}</div>
                            <div className="h-2 bg-bg-overlay rounded-full overflow-hidden mb-2">
                              <motion.div
                                className={cn('h-full rounded-full', strengthColor(drill.turnHandEval.strength))}
                                initial={{ width: 0 }}
                                animate={{ width: `${drill.turnHandEval.strength}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                              />
                            </div>
                            {drill.turnHandEval.draws.length > 0 && (
                              <div className="flex gap-1 flex-wrap mb-2">
                                {drill.turnHandEval.draws.map(d => (
                                  <Badge key={d} variant="blue" size="sm">{d}</Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-[11px] text-text-secondary leading-relaxed">
                              {drill.turnHandEval.description}
                            </p>
                          </Card>

                          {/* Navegação após turn */}
                          {config.streetMode === 'turn_only' ? (
                            <Button variant="gold" size="lg" onClick={handleNext} className="w-full">
                              <RefreshCw size={13} />
                              Nova Mão
                            </Button>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <Button variant="ghost" size="md" onClick={handleNext} className="text-text-muted">
                                <RefreshCw size={13} />
                                Nova Mão
                              </Button>
                              <Button variant="gold" size="md" onClick={handleGoToRiver}>
                                Ir para o River →
                              </Button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* ===================== RIVER PHASE ===================== */}
              <AnimatePresence>
                {drill.phase === 'river' && drill.riverCard && drill.riverHandEval && drill.riverGtoDecision && (
                  <div ref={riverSectionRef}>
                  <motion.div
                    key="river-phase"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* River header */}
                    <div className={cn(
                      'rounded-xl p-3 border flex items-center justify-between',
                      drill.riverInfo?.type === 'gin'   ? 'bg-emerald-500/10 border-emerald-500/30' :
                      drill.riverInfo?.type === 'scare' ? 'bg-red-500/10 border-red-500/30' :
                                                          'bg-accent-blue/10 border-accent-blue/30'
                    )}>
                      <div>
                        <div className={cn(
                          'text-sm font-bold',
                          drill.riverInfo?.type === 'gin'   ? 'text-emerald-400' :
                          drill.riverInfo?.type === 'scare' ? 'text-red-400' : 'text-accent-blue'
                        )}>
                          River — {drill.riverInfo?.label ?? 'Board Final'}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          Pot estimado: ~{drill.riverEstimatedPot} BB • SPR ≈ {Math.max(0, (config.effectiveStack - drill.riverEstimatedPot) / drill.riverEstimatedPot).toFixed(1)}
                        </div>
                      </div>
                      <Badge variant="blue">RIVER</Badge>
                    </div>

                    {/* Board completo (5 cartas) */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-text-muted uppercase tracking-wider">Board Final (River)</span>
                        <span className="text-[10px] text-text-muted">5 cartas</span>
                      </div>
                      <div className="flex justify-center">
                        <Board cards={[...drill.board, ...(drill.turnCard ? [drill.turnCard] : []), drill.riverCard]} size="md" maxCards={5} />
                      </div>
                      {drill.riverInfo && (
                        <p className="text-[10px] text-text-muted mt-3 leading-relaxed text-center">
                          {drill.riverInfo.reason}
                        </p>
                      )}
                    </Card>

                    {/* Mão final */}
                    <Card className="p-4">
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-3 text-center">Sua Mão Final</div>
                      <div className="flex justify-center gap-3 mb-3">
                        {drill.heroCards.map((card, i) => (
                          <PlayingCard key={i} card={card} size="lg" />
                        ))}
                      </div>
                      {!drill.riverAnswered && (
                        <div className="text-center">
                          <span className="text-sm font-bold text-text-primary">{drill.riverHandEval.label}</span>
                          <div className="text-[10px] text-text-muted mt-1">
                            {drill.riverHandEval.draws.length > 0
                              ? `Draw não completada: ${drill.riverHandEval.draws.join(', ')}`
                              : 'Sem draws pendentes'}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Contexto da ação: última ação do villain + jogadores após hero */}
                    {!drill.riverAnswered && (
                      <Card className="p-3 border border-accent-blue/20 bg-accent-blue/5">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-[10px] text-text-muted uppercase tracking-wider">Contexto da ação</div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs">
                                <span className="text-text-muted">Villain: </span>
                                <span className={cn('font-mono font-bold text-xs',
                                  config.position === 'IP' && config.scenario === 'facing_bet' ? 'text-orange-400' :
                                  config.position === 'IP' ? 'text-text-secondary' : 'text-text-muted/60'
                                )}>
                                  {config.position === 'IP' && config.scenario === 'facing_bet' ? 'Apostou ⚡' :
                                   config.position === 'IP' ? 'Checked ✓' : 'Aguardando...'}
                                </span>
                              </span>
                              <span className="text-text-muted text-[10px]">|</span>
                              <span className="text-xs">
                                <span className="text-text-muted">Após você: </span>
                                <span className="font-mono font-bold text-accent-blue">
                                  {config.position === 'OOP' ? '1 jogador' : '0 jogadores'}
                                </span>
                              </span>
                            </div>
                          </div>
                          <Badge variant="blue" size="sm">RIVER</Badge>
                        </div>
                      </Card>
                    )}

                    {/* Botões river */}
                    {!drill.riverAnswered && (
                      <div className={cn('grid gap-2', `grid-cols-${actions.length}`)}>
                        {actions.map(action => (
                          <button
                            key={action}
                            onClick={() => handleAnswer(action)}
                            className={cn(
                              'py-3 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                              action === 'fold'        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' :
                              action === 'call'        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' :
                              action === 'raise'       ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20' :
                              action === 'check'       ? 'bg-bg-overlay border-border-default text-text-secondary hover:bg-bg-elevated' :
                              action === 'check_raise' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20' :
                                                         'bg-accent-gold/10 border-accent-gold/30 text-accent-gold hover:bg-accent-gold/20'
                            )}
                          >
                            {ACTION_LABELS[action]}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Feedback river + resumo multi-street */}
                    <AnimatePresence>
                      {drill.riverAnswered && drill.riverUserAction && drill.riverResultType && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-4"
                        >
                          {/* Veredito river */}
                          <Card className={cn(
                            'p-4 border-2',
                            drill.riverResultType === 'correct'     ? 'border-emerald-500/40 bg-emerald-500/5' :
                            drill.riverResultType === 'alternative' ? 'border-yellow-500/40 bg-yellow-500/5' :
                                                                      'border-red-500/40 bg-red-500/5'
                          )}>
                            <div className="flex items-start gap-3 mb-3">
                              {drill.riverResultType === 'correct' ? (
                                <CheckCircle size={20} className="text-emerald-400 shrink-0 mt-0.5" />
                              ) : drill.riverResultType === 'alternative' ? (
                                <AlertCircle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className={cn('text-sm font-bold mb-0.5',
                                  drill.riverResultType === 'correct' ? 'text-emerald-400' :
                                  drill.riverResultType === 'alternative' ? 'text-yellow-400' : 'text-red-400'
                                )}>
                                  {drill.riverResultType === 'correct' ? 'Correto no River! 🎯' :
                                   drill.riverResultType === 'alternative' ? 'Válido, mas menos freq.' : 'Incorreto no River'}
                                </div>
                                <div className="text-xs text-text-muted">
                                  GTO: <span className="font-mono font-bold text-accent-gold">{ACTION_LABELS[drill.riverGtoDecision.primaryAction as PostflopAction]}</span>
                                  {' '}({Math.round(drill.riverGtoDecision.primaryFrequency * 100)}%)
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border-subtle">
                              <Info size={13} className="text-accent-blue shrink-0 mt-0.5" />
                              <p className="text-[11px] text-text-secondary leading-relaxed">
                                {drill.riverGtoDecision.explanation}
                              </p>
                            </div>
                          </Card>

                          {/* Mão final avaliação */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-text-muted uppercase tracking-wider">Mão Final</span>
                              <span className={cn('text-xs font-mono font-bold', strengthTextColor(drill.riverHandEval.strength))}>
                                {drill.riverHandEval.strength}/100
                              </span>
                            </div>
                            <div className="text-sm font-bold text-text-primary mb-2">{drill.riverHandEval.label}</div>
                            <div className="h-2 bg-bg-overlay rounded-full overflow-hidden">
                              <motion.div
                                className={cn('h-full rounded-full', strengthColor(drill.riverHandEval.strength))}
                                initial={{ width: 0 }}
                                animate={{ width: `${drill.riverHandEval.strength}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                              />
                            </div>
                          </Card>

                          {/* ======= MULTI-STREET SUMMARY (só no modo full) ======= */}
                          {config.streetMode === 'full' && <Card className="p-4">
                            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">
                              Resumo da Mão — 3 Ruas
                            </div>
                            <div className="space-y-2">
                              {[
                                { street: 'Flop', userAction: drill.userAction, gtoAction: drill.gtoDecision.primaryAction, result: drill.resultType, pot: config.potSize },
                                { street: 'Turn', userAction: drill.turnUserAction, gtoAction: drill.turnGtoDecision?.primaryAction, result: drill.turnResultType, pot: drill.turnEstimatedPot },
                                { street: 'River', userAction: drill.riverUserAction, gtoAction: drill.riverGtoDecision?.primaryAction, result: drill.riverResultType, pot: drill.riverEstimatedPot },
                              ].map(row => (
                                <div key={row.street} className="flex items-center justify-between py-1.5 border-b border-border-subtle/50 last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-text-muted w-10">{row.street}</span>
                                    <span className={cn(
                                      'text-[10px] font-bold px-2 py-0.5 rounded',
                                      row.result === 'correct' ? 'bg-emerald-500/20 text-emerald-400' :
                                      row.result === 'alternative' ? 'bg-yellow-500/20 text-yellow-400' :
                                      row.result === 'wrong' ? 'bg-red-500/20 text-red-400' : 'bg-bg-overlay text-text-muted'
                                    )}>
                                      {row.userAction ? ACTION_LABELS[row.userAction as PostflopAction] : '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-text-muted">~{row.pot} BB</span>
                                    {row.result && row.result !== 'correct' && row.gtoAction && (
                                      <span className="text-[9px] text-text-muted">
                                        GTO: <span className="text-accent-gold font-mono">{ACTION_LABELS[row.gtoAction as PostflopAction]}</span>
                                      </span>
                                    )}
                                    {row.result === 'correct' && <span className="text-emerald-400 text-xs">✓</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Avaliação da linha */}
                            {(() => {
                              const results = [drill.resultType, drill.turnResultType, drill.riverResultType]
                              const corrects = results.filter(r => r === 'correct').length
                              const alts = results.filter(r => r === 'alternative').length
                              const score = corrects + alts * 0.5
                              return (
                                <div className={cn(
                                  'mt-3 p-2 rounded-lg text-[10px] font-body',
                                  score >= 2.5 ? 'bg-emerald-500/10 text-emerald-400' :
                                  score >= 1.5 ? 'bg-yellow-500/10 text-yellow-400' :
                                                 'bg-red-500/10 text-red-400'
                                )}>
                                  {score >= 2.5 ? '✅ Linha excelente — consistência GTO nas 3 ruas.' :
                                   score >= 1.5 ? '⚠️ Linha razoável — revise as ruas marcadas em amarelo.' :
                                                  '❌ Linha inconsistente — revise a estratégia multi-street.'}
                                </div>
                              )
                            })()}
                          </Card>}

                          {/* ======= POT GEOMETRY ======= */}
                          <Card className="p-4">
                            <div className="text-xs text-text-muted uppercase tracking-wider mb-3">
                              Geometria do Pot
                            </div>
                            {[
                              { label: 'Flop', pot: config.potSize, stack: config.effectiveStack },
                              { label: 'Turn', pot: drill.turnEstimatedPot, stack: config.effectiveStack - drill.turnEstimatedPot * 0.5 },
                              { label: 'River', pot: drill.riverEstimatedPot, stack: Math.max(0, config.effectiveStack - drill.riverEstimatedPot) },
                            ].map(row => {
                              const spr = row.stack > 0 ? (row.stack / row.pot) : 0
                              return (
                                <div key={row.label} className="flex items-center gap-3 mb-2">
                                  <span className="text-[10px] font-mono text-text-muted w-10">{row.label}</span>
                                  <div className="flex-1 h-1.5 bg-bg-overlay rounded-full overflow-hidden">
                                    <div
                                      className={cn('h-full rounded-full transition-all',
                                        spr > 5 ? 'bg-accent-blue' : spr > 2 ? 'bg-yellow-500' : 'bg-red-500'
                                      )}
                                      style={{ width: `${Math.min(100, (row.pot / config.effectiveStack) * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-text-secondary w-16 text-right">
                                    {row.pot}BB | SPR {spr.toFixed(1)}
                                  </span>
                                </div>
                              )
                            })}
                            <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                              {(() => {
                                const finalSpr = Math.max(0, config.effectiveStack - drill.riverEstimatedPot) / drill.riverEstimatedPot
                                if (finalSpr < 1) return '🔴 SPR < 1 no river: você está comprometido. Não há fold correto com qualquer mão forte.'
                                if (finalSpr < 2) return '🟡 SPR baixo no river: pot grande em relação ao stack. Decisões de commitment são simples.'
                                return '🟢 SPR normal: há espaço para fold mesmo no river com mãos medianas.'
                              })()}
                            </p>
                          </Card>

                          <Button variant="gold" size="lg" onClick={handleNext} className="w-full">
                            <RefreshCw size={14} />
                            Nova Mão →
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Barra de progresso da sessão */}
              {sessionStats.total > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-text-muted">
                    <span>Precisão da sessão</span>
                    <span className="font-mono">{sessionStats.correct.toFixed(0)}/{sessionStats.total}</span>
                  </div>
                  <ProgressBar
                    value={Math.round((sessionStats.correct / sessionStats.total) * 100)}
                    color={sessionStats.correct / sessionStats.total >= 0.7 ? 'emerald' : 'gold'}
                  />
                </div>
              )}

              {/* Encerrar */}
              <Button variant="ghost" size="sm" onClick={handleEnd} className="w-full text-text-muted">
                <RotateCcw size={13} />
                Encerrar Sessão
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

      </div>
        </div>
      </div>
    </div>
  )
}
