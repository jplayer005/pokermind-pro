// ============================================================
// POKERMIND PRO — TREINADOR PRÉ-FLOP
// Sistema completo de drill com ranges, heatmaps e análise GTO
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Play, RotateCcw, ChevronDown, Info, CheckCircle, XCircle, Eye, Trophy, Timer } from 'lucide-react'
import { Button, Card, Badge, ProgressBar, SectionHeader } from '@/components/ui'
import { HandDisplay } from '@/components/poker/PlayingCard'
import RangeGrid from '@/components/poker/RangeGrid'
import TrainingTable from '@/components/poker/TrainingTable'
import { useUserStore, useTrainingStore, useSpacedRepetitionStore, useUIStore, CompetitionScore } from '@/store'
import { DRILL_QUESTIONS, OPEN_RAISE_RANGES, PUSH_FOLD_RANGES, THREE_BET_RANGES, BB_DEFENSE_RANGES, FOUR_BET_RANGES, SQUEEZE_RANGES, POSITIONS_BY_FORMAT, getOpenRaiseRange, SB_VS_BB_RAISE_RANGES, SB_VS_BB_LIMP_RANGES } from '@/data/ranges'
import { randomHand, classifyHandStrength, generateHandGrid, countCombos } from '@/lib/poker'
import { formatPercent, shuffle, getDifficultyXPMultiplier } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Action, Position, PreflopDrillQuestion, TableFormat } from '@/types'

// ---- TIPOS DE MODO ----
type DrillMode = 'study' | 'drill' | 'exam' | 'competition'

const COMPETITION_DURATION = 180 // 3 minutos

function competitionRank(accuracy: number): { label: string; color: string; emoji: string } {
  if (accuracy >= 85) return { label: 'Platina', color: 'text-cyan-400', emoji: '💎' }
  if (accuracy >= 70) return { label: 'Ouro', color: 'text-accent-gold', emoji: '🥇' }
  if (accuracy >= 50) return { label: 'Prata', color: 'text-slate-300', emoji: '🥈' }
  return { label: 'Bronze', color: 'text-orange-400', emoji: '🥉' }
}
type ScenarioType = 'open_raise' | 'push_fold' | '3bet' | 'bb_defense' | 'call_rfi' | '4bet' | 'squeeze' | 'sb_vs_bb'

const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']

// ---- HELPER: range correto por cenário + formato ----
// villainPosition: usado em bb_defense (range varia conforme quem abriu)
// Posições early sem range próprio (UTG+1/UTG+2/LJ) fazem fallback para UTG.
function resolveBBDefenseRange(villainPos: Position): string[] {
  const direct = BB_DEFENSE_RANGES[villainPos] || []
  if (direct.length > 0) return direct
  // Fallback: posições early sem range próprio usam range vs UTG (mais tight)
  return BB_DEFENSE_RANGES['UTG'] || []
}

function getRangeForScenario(
  scenario: ScenarioType,
  position: Position,
  stackDepth: number,
  tableFormat: TableFormat = '6max',
  villainPosition: Position = 'BTN'
): string[] {
  switch (scenario) {
    case 'open_raise':
      if (position === 'BB') return resolveBBDefenseRange(villainPosition)
      return getOpenRaiseRange(tableFormat, position)
    case 'push_fold': {
      const depth = stackDepth <= 12 ? 10 : 15
      return (PUSH_FOLD_RANGES[depth] ?? {})[position] || []
    }
    case '3bet':       return THREE_BET_RANGES[position] || []
    case 'bb_defense': return resolveBBDefenseRange(villainPosition)
    case 'call_rfi':
      if (position === 'BB') return resolveBBDefenseRange(villainPosition)
      return getOpenRaiseRange(tableFormat, position)
    case '4bet':       return FOUR_BET_RANGES[position] || []
    case 'squeeze':    return SQUEEZE_RANGES[position] || []
    case 'sb_vs_bb':   return SB_VS_BB_RAISE_RANGES // raise range do SB vs BB
    default:           return getOpenRaiseRange(tableFormat, position)
  }
}

// Range de LIMP do SB vs BB (separado do raise range)
function getLimpRangeForScenario(scenario: ScenarioType): string[] {
  if (scenario === 'sb_vs_bb') return SB_VS_BB_LIMP_RANGES
  return []
}

// Posições disponíveis por cenário (inclui posições de 9max para suporte completo)
const POSITIONS_BY_SCENARIO: Record<ScenarioType, Position[]> = {
  open_raise: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
  push_fold:  ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
  '3bet':     ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  bb_defense: ['BB'],
  call_rfi:   ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '4bet':     ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  squeeze:    ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  sb_vs_bb:   ['SB'], // SB é o único hero no SB vs BB
}

// ---- HELPER: ação correta por cenário ----
function getCorrectActionForScenario(
  scenario: ScenarioType,
  isInRaiseRange: boolean,
  hand?: string,
  position?: Position
): Action {
  if (scenario === 'sb_vs_bb') {
    if (isInRaiseRange) return 'raise'
    if (hand && SB_VS_BB_LIMP_RANGES.includes(hand)) return 'limp'
    return 'fold'
  }
  if (!isInRaiseRange) return 'fold'
  switch (scenario) {
    case 'push_fold':  return 'jam'
    case '3bet':       return '3bet'
    case '4bet':       return '4bet'
    case 'squeeze':    return '3bet'
    // bb_defense e call_rfi: diferenciar call vs 3bet usando THREE_BET_RANGES
    case 'bb_defense':
    case 'call_rfi': {
      if (hand && position) {
        const threeBetRange = THREE_BET_RANGES[position] || []
        return threeBetRange.includes(hand) ? '3bet' : 'call'
      }
      return 'call'
    }
    default:           return 'raise'
  }
}

// ---- HELPER: ajuste de range por profundidade de stack ----
// Mãos especulativas (implied odds) perdem valor em stacks curtos
function applyStackAdjustment(range: string[], heroStack: number): string[] {
  if (heroStack >= 100) return range
  // Mãos que exigem implied odds (deep stack) — removidas gradualmente com stack menor
  const removalsMid = [
    'K2s','K3s','K4s','Q6s','Q7s','J6s','J7s','T5s','T6s',
    '95s','96s','85s','86s','74s','75s','63s','64s','52s','53s','54s','A2s','A3s',
  ]
  const removalsShort = [
    ...removalsMid,
    '22','33','44','K5s','K6s','Q8s','J8s','T7s','97s','87s','76s','65s',
    'A4s','A5s','A8o','A9o','KTo','QTo','JTo','Q9o','J9o',
  ]
  const removalsVeryShort = [
    ...removalsShort,
    '55','K7s','K8s','Q9s','J9s','T8s','T9s','98s','88',
  ]
  const removals =
    heroStack <= 40 ? removalsVeryShort :
    heroStack <= 60 ? removalsShort :
    heroStack <= 80 ? removalsMid : []
  return range.filter(h => !removals.includes(h))
}

// ---- HELPER: constrói pool ponderado por combos ----
// difficulty: ajusta proporção de mãos fora do range (mais fora = mais disciplina de fold)
// easy:   menos mãos fora (50%) → mais oportunidades de open/raise
// medium: igual (100%) → comportamento original
// hard:   mais mãos fora (180%) → maior pressão sobre decisões de fold borderline
function buildWeightedPool(range: string[], allHands: string[], difficulty: 'easy' | 'medium' | 'hard' = 'medium'): string[] {
  const pool: string[] = []
  // Mãos no range: peso por combos (AA=6, AKs=4, AKo=12)
  for (const hand of range) {
    const w = countCombos(hand)
    for (let i = 0; i < Math.ceil(w / 4); i++) pool.push(hand)
  }
  // Quantidade de mãos fora do range varia com dificuldade
  const outRatio = difficulty === 'easy' ? 0.5 : difficulty === 'hard' ? 1.8 : 1.0
  const outCount = Math.floor(range.length * outRatio)
  const outOfRange = allHands.filter(h => !range.includes(h))
  const shuffledOut = [...outOfRange]
  for (let i = shuffledOut.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledOut[i], shuffledOut[j]] = [shuffledOut[j], shuffledOut[i]]
  }
  for (const hand of shuffledOut.slice(0, outCount)) pool.push(hand)
  // Fisher-Yates final
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}
const ACTIONS: { action: Action; label: string; color: string; shortcut: string }[] = [
  { action: 'fold',  label: 'Fold',  color: 'bg-bg-overlay border-border-default text-text-secondary', shortcut: 'F' },
  { action: 'limp',  label: 'Limp',  color: 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue', shortcut: 'L' },
  { action: 'call',  label: 'Call',  color: 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald', shortcut: 'C' },
  { action: 'raise', label: 'Raise', color: 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold', shortcut: 'R' },
  { action: '3bet',  label: '3-Bet', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400', shortcut: '3' },
  { action: '4bet',  label: '4-Bet', color: 'bg-purple-500/10 border-purple-500/30 text-purple-400', shortcut: '4' },
  { action: 'jam',   label: 'Jam',   color: 'bg-accent-crimson/10 border-accent-crimson/30 text-accent-crimson', shortcut: 'J' },
]

// Ações visíveis por cenário (evita mostrar todos os botões sempre)
const ACTIONS_BY_SCENARIO: Record<ScenarioType, Action[]> = {
  open_raise: ['fold', 'raise'],
  push_fold:  ['fold', 'jam'],
  '3bet':     ['fold', 'call', '3bet'],
  bb_defense: ['fold', 'call', '3bet'],
  call_rfi:   ['fold', 'call', '3bet'],
  '4bet':     ['fold', 'call', '4bet'],
  squeeze:    ['fold', 'call', '3bet'],
  sb_vs_bb:   ['fold', 'limp', 'raise'],
}

export default function PreflopTrainer() {
  const { addXP, updateStats, updateStreak, syncAchievements, profile } = useUserStore()
  const { startSession, answerQuestion, endSession, currentSession, competitionHighScores, addCompetitionScore } = useTrainingStore()
  const { updateSM2, getDueQuestions } = useSpacedRepetitionStore()
  const { defaultDifficulty } = useUIStore()
  const location = useLocation()

  // Pré-seleciona cenário se vier da navegação (Dashboard → Pontos a Melhorar / Treinar Agora)
  const initScenario = (location.state?.scenario as ScenarioType) || 'open_raise'
  const initPosition: Position =
    initScenario === 'bb_defense' ? 'BB' :
    initScenario === 'sb_vs_bb'   ? 'SB' : 'BTN'

  // Estado do modo de treino (mode pode ser passado via location.state)
  const [mode, setMode] = useState<DrillMode>((location.state?.mode as DrillMode) || 'study')
  const [tableFormat, setTableFormat] = useState<TableFormat>('6max')
  const [scenario, setScenario] = useState<ScenarioType>(initScenario)
  const [position, setPosition] = useState<Position>(initPosition)
  const [villainPosition, setVillainPosition] = useState<Position>('BTN')
  const [stackDepth, setStackDepth] = useState(15) // push/fold específico (5-25bb)
  const [heroStack, setHeroStack] = useState(100)    // stack geral da sessão (25-200bb)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isRandomPosition, setIsRandomPosition] = useState(true)
  const [poolPosition, setPoolPosition] = useState<Position>('BTN')

  // Posições válidas para o villain (quem abriu) no cenário bb_defense.
  // Filtra dinamicamente pelo formato — em 9max inclui UTG+1/UTG+2/LJ; em 6max só UTG-SB.
  const VILLAIN_OPEN_POSITIONS: Position[] = (
    tableFormat === '9max'
      ? ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB']
      : tableFormat === 'HU'
      ? ['BTN']
      : ['UTG', 'HJ', 'CO', 'BTN', 'SB']
  )

  const STACK_OPTIONS = [25, 40, 50, 75, 100, 150, 200]

  // Ao mudar formato de mesa, ajusta posições válidas
  const handleFormatChange = useCallback((newFormat: TableFormat) => {
    setTableFormat(newFormat)
    const validPos = POSITIONS_BY_FORMAT[newFormat]
    const scenarioPos = POSITIONS_BY_SCENARIO[scenario]
    const intersection = validPos.filter(p => scenarioPos.includes(p))
    if (intersection.length > 0 && !intersection.includes(position)) {
      setPosition(newFormat === 'HU' ? 'BTN' : intersection[0])
    }
    setHandPool([])
    setPoolPosition('BTN')
  }, [scenario, position])

  // Ao mudar cenário, garante que a posição seja válida para o novo cenário
  const handleScenarioChange = useCallback((newScenario: ScenarioType) => {
    setScenario(newScenario)
    const validPositions = POSITIONS_BY_SCENARIO[newScenario]
    if (!validPositions.includes(position)) {
      if (newScenario === 'bb_defense') setPosition('BB')
      else if (newScenario === 'sb_vs_bb') setPosition('SB')
      else setPosition('BTN')
    }
    setHandPool([])
    setPoolPosition('BTN')
  }, [position])

  // Pool de mãos para rotação sistemática
  const [handPool, setHandPool] = useState<string[]>([])
  const allHandsList = generateHandGrid().flat()

  // Estado da questão atual
  const [currentQuestion, setCurrentQuestion] = useState<PreflopDrillQuestion | null>(null)
  const [userAnswer, setUserAnswer] = useState<Action | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showRange, setShowRange] = useState(false)
  const [questionStart, setQuestionStart] = useState(0)

  // Estatísticas da sessão atual
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 })
  // Tipo SM-2 da questão atual: 'review' = revisão agendada, 'new' = primeira vez, null = do pool dinâmico
  const [questionSM2Type, setQuestionSM2Type] = useState<'review' | 'new' | null>(null)

  // --- Competição ---
  const [competitionTimeLeft, setCompetitionTimeLeft] = useState(COMPETITION_DURATION)
  const [competitionResult, setCompetitionResult] = useState<CompetitionScore | null>(null)
  const competitionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---- GERAÇÃO DE QUESTÃO ----
  const generateQuestion = useCallback(() => {
    // Determina posição efetiva (aleatória ou manual)
    let effectivePos = position
    if (isRandomPosition) {
      const formatPos = POSITIONS_BY_FORMAT[tableFormat]
      const scenarioPos = POSITIONS_BY_SCENARIO[scenario]
      const validPos = formatPos.filter(p => scenarioPos.includes(p))
      if (validPos.length > 0) {
        effectivePos = validPos[Math.floor(Math.random() * validPos.length)]
      }
    }

    // Range ajustado por profundidade de stack (open_raise tem maior dependência de implied odds)
    const baseRange = getRangeForScenario(scenario, effectivePos, stackDepth, tableFormat, villainPosition)
    const range = scenario === 'open_raise' ? applyStackAdjustment(baseRange, heroStack) : baseRange

    // Questões do banco para posição efetiva
    const bankQuestions = DRILL_QUESTIONS.filter(q => {
      if (q.scenario !== scenario) return false
      if (q.position !== effectivePos) return false
      if (scenario === 'bb_defense' && q.villainPosition && q.villainPosition !== villainPosition) return false
      return true
    })
    const bankFallback = DRILL_QUESTIONS.filter(q => q.scenario === scenario)
    const bankPool = bankQuestions.length > 0 ? bankQuestions : bankFallback

    // Prioridade SM-2: questões vencidas do banco para o cenário atual
    const dueIds = getDueQuestions()
    const dueInBank = bankPool.filter(q => dueIds.includes(q.id))

    // Probabilidade do banco proporcional ao número de mãos únicas — evita repetição (bug K4s)
    const uniqueHandsInBank = new Set(bankPool.map(q => q.hand)).size
    const bankProb = bankPool.length === 0 ? 0 :
      uniqueHandsInBank <= 1 ? 0.15 :
      uniqueHandsInBank <= 3 ? 0.35 : 0.6

    let question: PreflopDrillQuestion

    if (dueInBank.length > 0) {
      // SM-2: usar questão com revisão mais atrasada
      question = dueInBank[0]
      setQuestionSM2Type('review')
    } else if (Math.random() < bankProb) {
      // Verifica se é primeira vez vendo essa questão (totalAttempts = 0)
      const picked = bankPool[Math.floor(Math.random() * bankPool.length)]
      const sm2Stats = useSpacedRepetitionStore.getState().getQuestionStats(picked.id)
      setQuestionSM2Type(sm2Stats ? null : 'new')
      question = picked
    } else {
      setQuestionSM2Type(null)
      // Pool rotativo — reconstrói se posição mudou ou pool esvaziou
      let pool = (poolPosition === effectivePos) ? handPool : []
      if (pool.length === 0) {
        pool = buildWeightedPool(range, allHandsList, defaultDifficulty)
        setPoolPosition(effectivePos)
      }

      const hand = pool[0] || randomHand()
      setHandPool(pool.slice(1))

      const isInRange = range.includes(hand)
      const correctAction = getCorrectActionForScenario(scenario, isInRange, hand, effectivePos)

      const scenarioLabels: Record<ScenarioType, string> = {
        open_raise: 'open raise',
        push_fold:  'push/fold',
        '3bet':     '3-bet',
        '4bet':     '4-bet',
        squeeze:    'squeeze',
        bb_defense: 'defesa do BB',
        call_rfi:   'call vs raise',
        sb_vs_bb:   'SB vs BB',
      }
      const actionLabels: Record<string, string> = {
        raise: 'RAISE (abrir o pot)',
        fold:  'FOLD (descartar)',
        jam:   'JAM (all-in)',
        '3bet': '3-BET (reraise)',
        '4bet': '4-BET (re-reraise)',
        call:   'CALL (chamar)',
        limp:   'LIMP (completar BB)',
      }

      const stackNote = scenario === 'open_raise' && heroStack < 100
        ? ` [Range ajustada para ${heroStack}bb — mãos especulativas removidas]`
        : ''

      question = {
        id: `gen_${Date.now()}`,
        hand,
        position: effectivePos,
        heroStack,
        scenario,
        correctAction,
        correctFrequency: 1.0,
        explanation: isInRange
          ? `${hand} está dentro do range de ${scenarioLabels[scenario]} do ${effectivePos}.${stackNote} A jogada correta é ${actionLabels[correctAction] ?? correctAction}.`
          : `${hand} está fora do range de ${scenarioLabels[scenario]} do ${effectivePos}.${stackNote} A mão não tem equity suficiente nesta situação — FOLD é a jogada correta.`,
      }
    }

    // Bank questions são curadas com decisões GTO refinadas (frequências, gtoMix,
    // explicações específicas). Confiamos no correctAction do banco — a fórmula binária
    // "está no range?" não captura exceções como A5s vs UTG=fold, JJ vs BB 3bet=call,
    // squeeze com call equilibrado, ou SB vs BB com mixed strategy (raise/limp).
    // Questões geradas dinamicamente (`gen_*`) sempre usam a fórmula.

    setCurrentQuestion(question)
    setUserAnswer(null)
    setShowResult(false)
    setShowRange(false)
    setQuestionStart(Date.now())
  }, [scenario, position, isRandomPosition, stackDepth, heroStack, handPool, poolPosition, allHandsList, villainPosition, tableFormat, getDueQuestions, defaultDifficulty])

  // ---- RESPOSTA DO USUÁRIO ----
  const handleAnswer = useCallback((action: Action) => {
    if (!currentQuestion || showResult) return

    const timeMs = Date.now() - questionStart
    const isCorrect = action === currentQuestion.correctAction
    setUserAnswer(action)
    setShowResult(true)

    // Atualiza stats da sessão
    setSessionStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    }))

    // Registra no store de treino
    answerQuestion({
      questionId: currentQuestion.id,
      hand: currentQuestion.hand,
      userAction: action,
      correctAction: currentQuestion.correctAction,
      isCorrect,
      timeMs,
      timestamp: Date.now(),
    })

    // Concede XP (ajustado pela dificuldade configurada)
    if (isCorrect) {
      const base = mode === 'exam' ? 15 : 10
      addXP(Math.round(base * getDifficultyXPMultiplier(defaultDifficulty)))
    }

    // Atualiza SM-2 apenas para questões do banco (com ID fixo, não geradas dinamicamente)
    if (!currentQuestion.id.startsWith('gen_')) {
      updateSM2(currentQuestion.id, isCorrect)
    }

    // No modo exam/competition, passa automaticamente após 1.5s/1s
    if (mode === 'exam') {
      setTimeout(() => generateQuestion(), 1500)
    }
    if (mode === 'competition') {
      setTimeout(() => generateQuestion(), 1000)
    }

    // Mostra range automaticamente no modo estudo
    if (mode === 'study') {
      setTimeout(() => setShowRange(true), 300)
    }
  }, [currentQuestion, showResult, questionStart, mode, answerQuestion, addXP, generateQuestion, updateSM2])

  // ---- INICIA SESSÃO ----
  function startDrillSession() {
    startSession(mode, scenario)
    setSessionStats({ total: 0, correct: 0 })
    setHandPool([]) // força reconstrução do pool com cenário/posição atuais
    setIsSessionActive(true)
    generateQuestion()
  }

  // Auto-start: se vier com location.state.autoStart, inicia direto no drill
  useEffect(() => {
    if (location.state?.autoStart && !isSessionActive) {
      startDrillSession()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only — usa closure do estado inicial

  // ---- TIMER DE COMPETIÇÃO ----
  useEffect(() => {
    if (!isSessionActive || mode !== 'competition') {
      if (competitionTimerRef.current) clearInterval(competitionTimerRef.current)
      return
    }
    setCompetitionTimeLeft(COMPETITION_DURATION)
    competitionTimerRef.current = setInterval(() => {
      setCompetitionTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(competitionTimerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (competitionTimerRef.current) clearInterval(competitionTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionActive, mode])

  // Quando timer chega a 0, encerra automaticamente a competição
  useEffect(() => {
    if (competitionTimeLeft === 0 && mode === 'competition' && isSessionActive) {
      endCompetitionSession(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionTimeLeft])

  // ---- ENCERRA SESSÃO ----
  function endDrillSession() {
    // Calcular duração ANTES de endSession() que zera currentSession
    const sessionDuration = currentSession
      ? Math.round((Date.now() - currentSession.startedAt) / 60000)
      : 0
    endSession()
    const newTotal = profile.stats.totalQuestions + sessionStats.total
    const newCorrect = profile.stats.totalCorrect + sessionStats.correct
    updateStats({
      totalQuestions: newTotal,
      totalCorrect: newCorrect,
      accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
      studyTimeMinutes: profile.stats.studyTimeMinutes + sessionDuration,
      totalSessions: profile.stats.totalSessions + 1,
    })
    updateStreak()
    syncAchievements(useTrainingStore.getState().sessionHistory)
    setIsSessionActive(false)
    setCurrentQuestion(null)
  }

  // ---- ENCERRA COMPETIÇÃO ----
  function endCompetitionSession(secondsLeft: number) {
    if (competitionTimerRef.current) clearInterval(competitionTimerRef.current)
    const timeBonus = Math.round(secondsLeft * 0.5)
    const score = sessionStats.correct * 10 + timeBonus
    const accuracy = sessionStats.total > 0
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0
    const entry: CompetitionScore = {
      score,
      accuracy,
      date: new Date().toISOString().split('T')[0],
      scenario,
      totalQuestions: sessionStats.total,
      correctAnswers: sessionStats.correct,
    }
    addCompetitionScore(entry)
    setCompetitionResult(entry)
    // Finaliza sessão normalmente para registrar no histórico
    const sessionDuration = currentSession
      ? Math.round((Date.now() - currentSession.startedAt) / 60000)
      : 0
    endSession()
    const newTotal = profile.stats.totalQuestions + sessionStats.total
    const newCorrect = profile.stats.totalCorrect + sessionStats.correct
    updateStats({
      totalQuestions: newTotal,
      totalCorrect: newCorrect,
      accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
      studyTimeMinutes: profile.stats.studyTimeMinutes + sessionDuration,
      totalSessions: profile.stats.totalSessions + 1,
      competitionGamesPlayed: (profile.stats.competitionGamesPlayed || 0) + 1,
      competitionBestScore: Math.max(score, profile.stats.competitionBestScore || 0),
    })
    updateStreak()
    const { sessionHistory: sh, competitionHighScores: chs } = useTrainingStore.getState()
    syncAchievements(sh, chs)
    setIsSessionActive(false)
    setCurrentQuestion(null)
    if (accuracy > 0) addXP(Math.round(score * getDifficultyXPMultiplier(defaultDifficulty)))
  }

  // Monta range para o heatmap (com ajuste de stack para open_raise)
  // Em modo aleatório, usa a posição da questão atual (não o estado `position` que pode ser BTN)
  const rangePosition = currentQuestion?.position ?? position
  const currentRange = (() => {
    const base = getRangeForScenario(scenario, rangePosition, stackDepth, tableFormat, villainPosition)
    return scenario === 'open_raise' ? applyStackAdjustment(base, heroStack) : base
  })()
  const heatmapAction: Action =
    scenario === 'push_fold'  ? 'jam'   :
    scenario === '3bet'       ? '3bet'  :
    scenario === 'squeeze'    ? '3bet'  :
    scenario === '4bet'       ? '4bet'  :
    scenario === 'bb_defense' ? 'call'  :
    scenario === 'sb_vs_bb'   ? 'raise' : 'raise'

  // call_rfi e bb_defense: diferencia call (verde) vs 3bet (laranja) no grid
  const rangeMap: Record<string, Action | 'mixed'> = {}
  if (scenario === 'call_rfi' || scenario === 'bb_defense') {
    const threeBetHands = THREE_BET_RANGES[rangePosition] || []
    currentRange.forEach(h => { rangeMap[h] = threeBetHands.includes(h) ? '3bet' : 'call' })
  } else {
    currentRange.forEach(h => { rangeMap[h] = heatmapAction })
  }

  // ---- TELA DE RESULTADO DA COMPETIÇÃO ----
  if (competitionResult) {
    const rank = competitionRank(competitionResult.accuracy)
    const bestScore = competitionHighScores[0]
    const isNewBest = bestScore && competitionResult.score >= bestScore.score
    return (
      <div className="page-scroll">
        <div className="px-4 py-6 space-y-4">
          <div className="text-center py-4">
            <div className="text-5xl mb-2">{rank.emoji}</div>
            <h1 className="text-xl font-display font-bold text-text-primary">{rank.label}</h1>
            <p className="text-xs text-text-muted mt-1">Resultado da Competição</p>
          </div>

          <Card className="p-5 text-center">
            <div className="text-4xl font-mono font-bold text-accent-gold mb-1">
              {competitionResult.score}
            </div>
            <div className="text-xs text-text-muted mb-4">pontos</div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-mono font-bold text-lg text-text-primary">{competitionResult.correctAnswers}</div>
                <div className="text-[10px] text-text-muted">acertos</div>
              </div>
              <div>
                <div className="font-mono font-bold text-lg text-text-primary">{competitionResult.totalQuestions}</div>
                <div className="text-[10px] text-text-muted">total</div>
              </div>
              <div>
                <div className={cn('font-mono font-bold text-lg', rank.color)}>{competitionResult.accuracy}%</div>
                <div className="text-[10px] text-text-muted">precisão</div>
              </div>
            </div>
          </Card>

          {isNewBest && (
            <Card className="p-3 border-accent-gold/30 bg-accent-gold/5 text-center">
              <span className="text-xs text-accent-gold font-bold">🎉 Novo recorde pessoal!</span>
            </Card>
          )}

          {competitionHighScores.length > 1 && (
            <Card className="p-4">
              <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">Top Scores</div>
              <div className="space-y-2">
                {competitionHighScores.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-text-muted w-4">{i + 1}.</span>
                    <span className="font-mono font-bold text-sm text-accent-gold flex-1">{s.score}</span>
                    <span className="text-[10px] text-text-muted">{s.accuracy}% · {s.date}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => { setCompetitionResult(null); setMode('competition') }}
              className="flex-1"
            >
              Jogar Novamente
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={() => setCompetitionResult(null)}
              className="flex-1"
            >
              Ver Treino
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-scroll">
      <div className="lg:flex lg:min-h-full">

        {/* ===== PAINEL ESQUERDO: mesa de poker (desktop only, só durante sessão ativa) ===== */}
        {isSessionActive && (
        <div className="hidden lg:flex lg:flex-col lg:w-[380px] xl:w-[420px] lg:shrink-0 lg:border-r lg:border-border-subtle lg:p-6 lg:overflow-y-auto">
          <TrainingTable
            heroPosition={currentQuestion ? currentQuestion.position : (isRandomPosition ? poolPosition : position)}
            villainPosition={['bb_defense', '3bet', '4bet', 'squeeze', 'call_rfi'].includes(scenario) ? villainPosition : undefined}
            handNotation={currentQuestion ? currentQuestion.hand : undefined}
            scenario={scenario}
            stackDepth={heroStack}
            tableFormat={tableFormat}
            heroAction={showResult && userAnswer ? userAnswer : undefined}
          />
          {/* Range heatmap no painel esquerdo (após resposta) */}
          {isSessionActive && currentQuestion && showResult && mode !== 'competition' && (showRange || mode === 'study') && (
            <div className="mt-6 pt-5 border-t border-border-subtle">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-3 font-body">
                Range correto — {currentQuestion.position}
              </div>
              <RangeGrid
                range={rangeMap}
                highlightHand={currentQuestion.hand}
                cellSize="xs"
                showLegend={scenario === 'call_rfi' || scenario === 'bb_defense'}
              />
            </div>
          )}
        </div>
        )}

        {/* ===== PAINEL DIREITO: conteúdo (mobile: tela inteira) ===== */}
        <div className="flex-1 min-w-0">
      <div className="px-4 py-4 pb-6 lg:px-6 space-y-4">

        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-text-primary">Treinador Pré-Flop</h1>
            <p className="text-xs text-text-muted mt-0.5">Ranges, GTO e decisões corretas</p>
          </div>
          {isSessionActive && (
            <div className="flex items-center gap-3">
              {mode === 'competition' && (
                <div className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-sm font-bold',
                  competitionTimeLeft <= 30
                    ? 'bg-accent-crimson/15 border-accent-crimson/40 text-accent-crimson'
                    : competitionTimeLeft <= 60
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
                    : 'bg-accent-emerald/10 border-accent-emerald/30 text-accent-emerald'
                )}>
                  <Timer size={12} />
                  {String(Math.floor(competitionTimeLeft / 60)).padStart(2, '0')}:{String(competitionTimeLeft % 60).padStart(2, '0')}
                </div>
              )}
              <div className="text-right">
                <div className="font-mono text-xs text-accent-emerald font-bold">
                  {sessionStats.total > 0 ? formatPercent(sessionStats.correct / sessionStats.total) : '—'}
                </div>
                <div className="text-[10px] text-text-muted">{sessionStats.total} mãos</div>
              </div>
            </div>
          )}
        </div>

        {/* ---- CONFIGURAÇÕES (quando não ativo) ---- */}
        <AnimatePresence>
          {!isSessionActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Modo */}
              <Card className="p-4">
                <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">Modo de Treino</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {(['study', 'drill', 'exam'] as DrillMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'py-2.5 rounded-lg text-xs font-display font-semibold capitalize transition-all duration-200 border',
                        mode === m
                          ? 'bg-accent-gold/10 border-accent-gold/40 text-accent-gold'
                          : 'bg-bg-overlay border-border-subtle text-text-muted'
                      )}
                    >
                      {m === 'study' ? '📖 Estudo' : m === 'drill' ? '🎯 Drill' : '📝 Exame'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setMode('competition')}
                  className={cn(
                    'w-full py-2.5 rounded-lg text-xs font-display font-semibold transition-all duration-200 border flex items-center justify-center gap-2',
                    mode === 'competition'
                      ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
                      : 'bg-bg-overlay border-border-subtle text-text-muted'
                  )}
                >
                  <Trophy size={13} /> 🏆 Competição — 3 min, sem dicas
                </button>
                <p className="text-[10px] text-text-muted mt-2 font-body">
                  {mode === 'study' ? 'Veja o range completo e explicações detalhadas após cada resposta'
                    : mode === 'drill' ? 'Treino focado com feedback imediato e análise'
                    : mode === 'exam' ? 'Modo exame: sem dicas, avança automaticamente'
                    : 'Competição: 3 min cronometrados, sem hints. Score = acertos × 10 + bônus de tempo.'}
                </p>
              </Card>

              {/* Formato de Mesa */}
              <Card className="p-4">
                <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">Formato de Mesa</div>
                <div className="grid grid-cols-3 gap-1.5 mb-1">
                  {(['HU','6max','9max'] as TableFormat[]).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => handleFormatChange(fmt)}
                      className={cn(
                        'py-2 rounded-lg text-[11px] font-mono font-bold border transition-all',
                        tableFormat === fmt
                          ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                          : 'bg-bg-overlay border-border-subtle text-text-muted'
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted font-body mt-2">
                  {tableFormat === 'HU' ? 'HU MTT: BTN abre ~65% das mãos — dinâmica heads-up' :
                   tableFormat === '6max' ? '6-max MTT: formato mais comum em torneios online' :
                   '9-max MTT: full ring, UTG very tight (~10%) — simula mesas de torneio ao vivo'}
                </p>
              </Card>

              {/* Cenário e Posição */}
              <Card className="p-4">
                <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">Cenário</div>
                <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
                  {([
                    { key: 'open_raise', label: 'Open Raise', icon: '↗' },
                    { key: 'push_fold',  label: 'Push/Fold',  icon: '⚡' },
                    { key: 'sb_vs_bb',   label: 'SB vs BB',   icon: '⚔' },
                    { key: '3bet',       label: '3-Bet',      icon: '🔥' },
                    { key: '4bet',       label: '4-Bet',      icon: '♟' },
                    { key: 'squeeze',    label: 'Squeeze',    icon: '🗜' },
                    { key: 'bb_defense', label: 'BB Defense', icon: '🛡' },
                    { key: 'call_rfi',   label: 'vs Raise',   icon: '🎯' },
                  ] as { key: ScenarioType; label: string; icon: string }[]).map(s => (
                    <button
                      key={s.key}
                      onClick={() => handleScenarioChange(s.key)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-xs font-body transition-all border flex items-center gap-2',
                        scenario === s.key
                          ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                          : 'bg-bg-overlay border-border-subtle text-text-secondary'
                      )}
                    >
                      <span>{s.icon}</span> {s.label}
                    </button>
                  ))}
                </div>

                {/* Posição */}
                <div className="text-xs text-text-muted font-body mb-2 uppercase tracking-wider">Posição Heroína</div>
                <div className="flex gap-1.5 flex-wrap">
                  {/* Botão Aleatória */}
                  <button
                    onClick={() => setIsRandomPosition(true)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border flex items-center gap-1',
                      isRandomPosition
                        ? 'bg-accent-crimson/15 border-accent-crimson/40 text-accent-crimson'
                        : 'bg-bg-overlay border-border-subtle text-text-muted'
                    )}
                  >
                    🎲 Aleatória
                  </button>
                  {/* Posições manuais */}
                  {(() => {
                    const formatPos = POSITIONS_BY_FORMAT[tableFormat]
                    const scenarioPos = POSITIONS_BY_SCENARIO[scenario]
                    return formatPos.filter(p => scenarioPos.includes(p))
                  })().map(pos => (
                    <button
                      key={pos}
                      onClick={() => { setIsRandomPosition(false); setPosition(pos); setHandPool([]) }}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border',
                        !isRandomPosition && position === pos
                          ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                          : isRandomPosition
                          ? 'bg-bg-overlay border-border-subtle text-text-muted/40'
                          : 'bg-bg-overlay border-border-subtle text-text-muted'
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
                {isRandomPosition && (
                  <p className="text-[10px] text-accent-crimson/70 mt-1.5 font-body">
                    Posição, mão e contexto variam a cada rodada — simula tomada de decisão real.
                  </p>
                )}
                {/* Seletor de posição do villain para bb_defense e call_rfi */}
                {(scenario === 'bb_defense' || scenario === 'call_rfi') && (
                  <div className="mt-3">
                    <div className="text-xs text-text-muted font-body mb-2 uppercase tracking-wider">
                      Villain abriu de:
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {VILLAIN_OPEN_POSITIONS.map(pos => (
                        <button
                          key={pos}
                          onClick={() => { setVillainPosition(pos); setHandPool([]) }}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border',
                            villainPosition === pos
                              ? 'bg-accent-crimson/15 border-accent-crimson/40 text-accent-crimson'
                              : 'bg-bg-overlay border-border-subtle text-text-muted'
                          )}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 font-body">
                      {scenario === 'bb_defense'
                        ? 'Range de defesa varia conforme a posição do opener — quanto mais late, mais wide o range adversário e mais mãos você pode defender.'
                        : 'Range de call e 3-bet vs raise varia conforme a posição do opener — vs UTG você defende mais tight, verde = Call / laranja = 3-Bet.'}
                    </p>
                  </div>
                )}
                {scenario === '4bet' && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    4-Bet: você abriu, villain 3-betou. Range polarizado: AA/KK/QQ/AK para valor + A5s-A2s como bluff com bloqueadores. Ação: fold, call ou 4-bet.
                  </p>
                )}
                {scenario === 'squeeze' && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    Squeeze: houve um open raise + 1 caller antes de você. Range mais tight que 3-bet HU — precisa bater 2 players. Ação: fold, call ou squeeze (3-bet).
                  </p>
                )}
                {scenario === 'sb_vs_bb' && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    SB vs BB: todos foldaram, você está no SB. Pode FOLD, LIMP (completar BB por 0.5bb extra) ou RAISE (2.5x). GTO mistura limp e raise com muitas mãos — heatmap mostra range de raise.
                  </p>
                )}

                {/* Stack depth para push/fold */}
                {scenario === 'push_fold' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-text-muted uppercase tracking-wider">Stack</span>
                      <span className="font-mono text-sm font-bold text-accent-gold">{stackDepth} BBs</span>
                    </div>
                    <input
                      type="range"
                      min={5} max={25} step={1}
                      value={stackDepth}
                      onChange={(e) => setStackDepth(Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>5 BBs</span><span>15 BBs</span><span>25 BBs</span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Stack Depth */}
              <Card className="p-4">
                <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">Stack do Herói</div>
                <div className="grid grid-cols-7 gap-1">
                  {STACK_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => { setHeroStack(s); if (scenario === 'push_fold') setStackDepth(Math.min(25, Math.max(5, s))) }}
                      className={cn(
                        'py-2 rounded-lg text-[10px] font-mono font-bold border transition-all',
                        heroStack === s
                          ? 'bg-accent-emerald/15 border-accent-emerald/40 text-accent-emerald'
                          : 'bg-bg-overlay border-border-subtle text-text-muted'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-2 font-body">
                  {heroStack <= 25 ? '⚡ Push/fold territory — quase tudo é all-in ou fold' :
                   heroStack <= 50 ? '⚠ Short stack — evite calls especulativos, valorize fold equity' :
                   heroStack <= 75 ? '📊 Mid stack — ranges ajustadas, 3-bets menores em valor de stack' :
                   heroStack === 100 ? '✅ Stack padrão 100bb — ranges GTO padrão' :
                   '🚀 Deep stack — mãos especulativas valem mais (implied odds maiores)'}
                </p>
              </Card>

              {/* Botão iniciar */}
              <Button variant="gold" size="lg" onClick={startDrillSession} className="w-full">
                <Play size={16} />
                Iniciar Treino
              </Button>

              {/* Heatmap preview */}
              <Card className="p-4">
                <SectionHeader
                  title={scenario === 'bb_defense'
                    ? `BB Defense vs ${villainPosition}`
                    : scenario === 'call_rfi'
                    ? `Call vs Raise — ${position}`
                    : `Range ${isRandomPosition ? 'por posição' : position} — ${{
                        open_raise: 'Open Raise', push_fold: 'Push/Fold',
                        '3bet': '3-Bet', '4bet': '4-Bet', squeeze: 'Squeeze',
                        sb_vs_bb: 'SB vs BB (Raise)',
                      }[scenario as string] ?? scenario}`}
                  subtitle={(scenario === 'call_rfi' || scenario === 'bb_defense')
                    ? `${currentRange.filter(h => (THREE_BET_RANGES[rangePosition]||[]).includes(h)).length} mãos 3-Bet + ${currentRange.filter(h => !(THREE_BET_RANGES[rangePosition]||[]).includes(h)).length} mãos Call`
                    : `${currentRange.length} mãos (${formatPercent(currentRange.length / 169)})`}
                />
                <RangeGrid range={rangeMap} showLegend={scenario === 'call_rfi' || scenario === 'bb_defense'} cellSize="xs" />
                {(scenario === 'call_rfi' || scenario === 'bb_defense') && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    Verde = Call | Laranja = 3-Bet (mãos de valor + bluffs com bloqueadores)
                  </p>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- QUESTÃO ATIVA ---- */}
        <AnimatePresence>
          {isSessionActive && currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Contexto da mão */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="gold">{tableFormat}</Badge>
                    <Badge variant="blue">
                      {currentQuestion.position}{isRandomPosition ? ' 🎲' : ''}
                    </Badge>
                    <Badge variant="neutral">{currentQuestion.heroStack} BBs</Badge>
                    {questionSM2Type === 'review' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                        🔁 Revisão
                      </span>
                    )}
                    {questionSM2Type === 'new' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                        ⭐ Nova
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted">
                    {sessionStats.total + 1}ª mão
                  </div>
                </div>

                {/* Pergunta central */}
                <div className="text-center py-6">
                  <div className="text-xs text-text-muted font-body mb-2 uppercase tracking-wider">Sua mão</div>
                  <HandDisplay hand={currentQuestion.hand} className="text-5xl" />
                  <div className="text-[11px] text-text-muted mt-2 font-body">
                    {classifyHandStrength(currentQuestion.hand) === 'premium' ? '⭐ Premium' :
                     classifyHandStrength(currentQuestion.hand) === 'strong' ? '💪 Forte' :
                     classifyHandStrength(currentQuestion.hand) === 'medium' ? '📊 Médio' :
                     classifyHandStrength(currentQuestion.hand) === 'speculative' ? '🎲 Especulativa' : '📉 Fraca'}
                  </div>
                </div>

                {currentQuestion.villainAction && (
                  <div className="bg-bg-base rounded-lg p-3 text-center border border-border-subtle">
                    <span className="text-[11px] text-text-muted">Villain ({currentQuestion.villainPosition}) fez: </span>
                    <span className="font-mono font-bold text-orange-400 text-sm uppercase">{currentQuestion.villainAction}</span>
                  </div>
                )}
              </Card>

              {/* Botões de ação — filtrados por cenário */}
              {!showResult && (() => {
                const visibleActions = ACTIONS.filter(a =>
                  ACTIONS_BY_SCENARIO[currentQuestion.scenario as ScenarioType]?.includes(a.action) ?? true
                )
                // Tailwind purga classes dinâmicas → mapeamento estático garante inclusão
                const colsClass: Record<number, string> = {
                  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3',
                  4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-7',
                }
                return (
                  <div className={cn('grid gap-2', colsClass[visibleActions.length] || 'grid-cols-3')}>
                    {visibleActions.map(({ action, label, color, shortcut }) => (
                      <button
                        key={action}
                        onClick={() => handleAnswer(action)}
                        className={cn(
                          'py-3 rounded-xl text-xs font-display font-bold border transition-all active:scale-95',
                          color
                        )}
                      >
                        <div>{label}</div>
                        {mode !== 'exam' && <div className="text-[9px] opacity-50 mt-0.5">[{shortcut}]</div>}
                      </button>
                    ))}
                  </div>
                )
              })()}

              {/* Resultado e explicação */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Veredito */}
                    <Card className={cn(
                      'p-4 border-2',
                      userAnswer === currentQuestion.correctAction
                        ? 'border-accent-emerald/40 bg-accent-emerald/5'
                        : 'border-accent-crimson/40 bg-accent-crimson/5'
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        {userAnswer === currentQuestion.correctAction ? (
                          <CheckCircle size={20} className="text-accent-emerald flex-shrink-0" />
                        ) : (
                          <XCircle size={20} className="text-accent-crimson flex-shrink-0" />
                        )}
                        <div>
                          <div className={cn('text-sm font-display font-bold',
                            userAnswer === currentQuestion.correctAction ? 'text-accent-emerald' : 'text-accent-crimson'
                          )}>
                            {userAnswer === currentQuestion.correctAction ? 'Correto! 🎯' : 'Incorreto'}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            Jogada correta: <span className="text-text-primary font-mono font-bold">
                              {currentQuestion.correctAction.toUpperCase()}
                            </span>
                            {currentQuestion.correctFrequency < 1 && (
                              <span className="text-text-muted"> ({formatPercent(currentQuestion.correctFrequency)} freq.)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Explicação (modo estudo e drill) */}
                      {mode !== 'exam' && mode !== 'competition' && (
                        <p className="text-[11px] text-text-secondary font-body leading-relaxed">
                          {currentQuestion.explanation}
                        </p>
                      )}

                      {/* GTO Mix — frequências de mistura */}
                      {currentQuestion.gtoMix && mode !== 'exam' && mode !== 'competition' && (
                        <div className="mt-3 pt-3 border-t border-border-subtle">
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                            GTO Mixing <span className="normal-case text-text-muted/60">(frequências)</span>
                          </div>
                          <div className="space-y-1.5">
                            {Object.entries(currentQuestion.gtoMix)
                              .sort(([,a], [,b]) => b - a)
                              .map(([act, freq]) => {
                                const pct = Math.round((freq as number) * 100)
                                const isCorrect = act === currentQuestion.correctAction
                                const labels: Record<string, string> = {
                                  raise: 'Raise', fold: 'Fold', limp: 'Limp',
                                  call: 'Call', '3bet': '3-Bet', '4bet': '4-Bet', jam: 'Jam',
                                }
                                return (
                                  <div key={act} className="flex items-center gap-2">
                                    <span className={cn('text-[10px] font-mono w-16 font-bold',
                                      isCorrect ? 'text-accent-gold' : 'text-text-muted'
                                    )}>
                                      {labels[act] ?? act}
                                    </span>
                                    <div className="flex-1 h-2 bg-bg-overlay rounded-full overflow-hidden">
                                      <div
                                        className={cn('h-full rounded-full',
                                          isCorrect ? 'bg-accent-gold' : 'bg-bg-elevated'
                                        )}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className={cn('text-[10px] font-mono w-8 text-right',
                                      isCorrect ? 'text-accent-gold' : 'text-text-muted'
                                    )}>
                                      {pct}%
                                    </span>
                                  </div>
                                )
                              })}
                          </div>
                          <p className="text-[9px] text-text-muted/60 mt-2">
                            GTO mistura ações para não ser explorado. Ação primária mostrada acima.
                          </p>
                        </div>
                      )}

                      {/* EV Comparison */}
                      {currentQuestion.evComparison && mode !== 'exam' && (
                        <div className="mt-3 pt-3 border-t border-border-subtle">
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                            EV esperado por ação <span className="normal-case text-text-muted/60">(em Big Blinds)</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(currentQuestion.evComparison).map(([act, ev]) => {
                              const val = ev as number
                              const isPositive = val > 0
                              const isNegative = val < 0
                              const actionLabels: Record<string, string> = {
                                fold: 'Fold', call: 'Call', raise: 'Raise', '3bet': '3-Bet', jam: 'Jam'
                              }
                              return (
                                <div key={act} className={cn(
                                  'rounded-lg p-2 text-center border',
                                  isPositive
                                    ? 'bg-accent-emerald/8 border-accent-emerald/20'
                                    : isNegative
                                    ? 'bg-accent-crimson/8 border-accent-crimson/20'
                                    : 'bg-bg-overlay border-border-subtle'
                                )}>
                                  <div className="text-[10px] text-text-muted uppercase mb-0.5">
                                    {actionLabels[act] ?? act}
                                  </div>
                                  <div className={cn(
                                    'font-mono font-bold text-xs',
                                    isPositive ? 'text-accent-emerald' : isNegative ? 'text-accent-crimson' : 'text-text-secondary'
                                  )}>
                                    {isPositive ? '+' : ''}{val} BB
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-[9px] text-text-muted/60 mt-1.5 font-body">
                            EV = lucro médio em BBs a longo prazo. Fold = 0 BB é o ponto de referência.
                          </p>
                        </div>
                      )}
                    </Card>

                    {/* Range heatmap pós-resposta (mobile) — no desktop fica no painel esquerdo */}
                    {mode !== 'competition' && (showRange || mode === 'study') && (
                      <Card className="p-4 lg:hidden">
                        <SectionHeader
                          title={`Range Correto: ${currentQuestion.position}`}
                          subtitle={scenario === 'call_rfi' ? 'Verde=Call · Laranja=3-Bet' : undefined}
                        />
                        <RangeGrid
                          range={rangeMap}
                          highlightHand={currentQuestion.hand}
                          cellSize="xs"
                          showLegend={scenario === 'call_rfi'}
                        />
                      </Card>
                    )}

                    {/* Botões de continuação */}
                    <div className="flex gap-3">
                      {!showRange && mode !== 'study' && mode !== 'competition' && (
                        <Button variant="ghost" size="sm" onClick={() => setShowRange(true)} className="flex-1">
                          <Eye size={14} />
                          Ver Range
                        </Button>
                      )}
                      <Button variant="gold" size="md" onClick={generateQuestion} className="flex-1">
                        Próxima Mão →
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Barra de progresso da sessão */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>Precisão da sessão</span>
                  <span className="font-mono">
                    {sessionStats.correct}/{sessionStats.total}
                  </span>
                </div>
                <ProgressBar
                  value={sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}
                  color={sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.75 ? 'emerald' : 'gold'}
                />
              </div>

              {/* Encerrar sessão */}
              {mode === 'competition' ? (
                <Button variant="ghost" size="sm" onClick={() => endCompetitionSession(competitionTimeLeft)} className="w-full text-yellow-400">
                  <Trophy size={13} />
                  Encerrar Competição
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={endDrillSession} className="w-full text-text-muted">
                  <RotateCcw size={13} />
                  Encerrar Sessão
                </Button>
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </div>
        </div>
      </div>
    </div>
  )
}
