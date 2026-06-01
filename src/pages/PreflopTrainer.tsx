// ============================================================
// POKERMIND PRO â€” TREINADOR PRÃ‰-FLOP
// Sistema completo de drill com ranges, heatmaps e anÃ¡lise GTO
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
import { DRILL_QUESTIONS, OPEN_RAISE_RANGES, PUSH_FOLD_RANGES, THREE_BET_RANGES, BB_DEFENSE_RANGES, FOUR_BET_RANGES, SQUEEZE_RANGES, POSITIONS_BY_FORMAT, getOpenRaiseRange, SB_VS_BB_RAISE_RANGES, SB_VS_BB_LIMP_RANGES, MARGINAL_HANDS, getIPDefenseRange, BB_VS_SB_3BET_RANGES, getValidVillainPositions, getValidHeroPositions } from '@/data/ranges'
import { randomHand, classifyHandStrength, generateHandGrid } from '@/lib/poker'
import { formatPercent, shuffle, getDifficultyXPMultiplier } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Action, Position, PreflopDrillQuestion, TableFormat } from '@/types'

// ---- TIPOS DE MODO ----
type DrillMode = 'study' | 'drill' | 'exam' | 'competition'

const COMPETITION_DURATION = 180 // 3 minutos

function competitionRank(accuracy: number): { label: string; color: string; emoji: string } {
  if (accuracy >= 85) return { label: 'Platina', color: 'text-cyan-400', emoji: 'ðŸ’Ž' }
  if (accuracy >= 70) return { label: 'Ouro', color: 'text-accent-gold', emoji: 'ðŸ¥‡' }
  if (accuracy >= 50) return { label: 'Prata', color: 'text-slate-300', emoji: 'ðŸ¥ˆ' }
  return { label: 'Bronze', color: 'text-orange-400', emoji: 'ðŸ¥‰' }
}
type ScenarioType = 'open_raise' | 'push_fold' | '3bet' | 'bb_defense' | 'vs_raise' | '4bet' | 'squeeze' | 'sb_vs_bb'

const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']

// ---- HELPER: range correto por cenÃ¡rio + formato ----
// villainPosition: usado em bb_defense (range varia conforme quem abriu)
// PosiÃ§Ãµes early sem range prÃ³prio (UTG+1/UTG+2/LJ) fazem fallback para UTG.
function resolveBBDefenseRange(villainPos: Position): string[] {
  const direct = BB_DEFENSE_RANGES[villainPos] || []
  if (direct.length > 0) return direct
  // Fallback: posiÃ§Ãµes early sem range prÃ³prio usam range vs UTG (mais tight)
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
    case 'vs_raise':
      if (position === 'BB') return resolveBBDefenseRange(villainPosition)
      // IP defense ranges (BTN/CO/HJ) variam por opener â€” vs UTG Ã© muito tight, vs CO Ã© wide
      const ipDefense = getIPDefenseRange(position, villainPosition)
      if (ipDefense) return ipDefense
      // Fallback: open range (comportamento antigo) se nÃ£o hÃ¡ range especÃ­fica
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

// PosiÃ§Ãµes disponÃ­veis por cenÃ¡rio (inclui posiÃ§Ãµes de 9max para suporte completo)
const POSITIONS_BY_SCENARIO: Record<ScenarioType, Position[]> = {
  open_raise: ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
  push_fold:  ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB'],
  '3bet':     ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  bb_defense: ['BB'],
  vs_raise:   ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '4bet':     ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  squeeze:    ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  sb_vs_bb:   ['SB'], // SB Ã© o Ãºnico hero no SB vs BB
}

// ---- HELPER: aÃ§Ã£o correta por cenÃ¡rio ----
function getCorrectActionForScenario(
  scenario: ScenarioType,
  isInRaiseRange: boolean,
  hand?: string,
  position?: Position,
  villainPosition?: Position
): Action {
  if (scenario === 'sb_vs_bb') {
    if (isInRaiseRange) return 'raise'
    if (hand && SB_VS_BB_LIMP_RANGES.includes(hand)) return 'limp'
    return 'fold'
  }
  // Para squeeze: hand pode estar OU no squeeze range (â†’ 3bet) OU no open range
  // do hero (â†’ flat call, multiway). Apenas hand fora de ambos Ã© fold.
  if (scenario === 'squeeze') {
    const squeezeRange = position ? (SQUEEZE_RANGES[position] || []) : []
    if (hand && squeezeRange.includes(hand)) return '3bet'
    // Verifica se estÃ¡ no open range (flat call)
    const openRange = position ? (OPEN_RAISE_RANGES[position] || []) : []
    if (hand && openRange.includes(hand)) return 'call'
    return 'fold'
  }
  // Para 3bet/4bet: se hand nÃ£o estÃ¡ no aggression range, mas estÃ¡ na "defense range"
  // (BB_DEFENSE para 3bet, open range para 4bet do hero), call ainda Ã© GTO-vÃ¡lido.
  if (scenario === '3bet' && hand && position) {
    const threeBet = THREE_BET_RANGES[position] || []
    if (threeBet.includes(hand)) return '3bet'
    // Hero estÃ¡ OOP defendendo de uma open. Se hand estÃ¡ em BB_DEFENSE (ou similar IP defense),
    // call Ã© a opÃ§Ã£o GTO.
    const defenseRange = position === 'BB'
      ? (BB_DEFENSE_RANGES[villainPosition ?? 'BTN'] || [])
      : (getIPDefenseRange(position, villainPosition ?? 'BTN') || [])
    if (defenseRange.includes(hand)) return 'call'
    return 'fold'
  }
  if (scenario === '4bet' && hand && position) {
    const fourBet = FOUR_BET_RANGES[position] || []
    if (fourBet.includes(hand)) return '4bet'
    // Hero abriu, villain 3-betou. Se hand estÃ¡ no open range do hero, call ao 3-bet
    // Ã© a alternativa GTO (continua na mÃ£o sem 4-betar).
    const openRange = OPEN_RAISE_RANGES[position] || []
    if (openRange.includes(hand)) return 'call'
    return 'fold'
  }
  if (!isInRaiseRange) return 'fold'
  switch (scenario) {
    case 'push_fold':  return 'jam'
    case '3bet':       return '3bet'
    case '4bet':       return '4bet'
    // bb_defense e vs_raise: diferenciar call vs 3bet usando THREE_BET_RANGES.
    // Caso especial: BB vs SB usa BB_VS_SB_3BET_RANGES (mais wide que o range padrÃ£o BB).
    case 'bb_defense':
    case 'vs_raise': {
      if (hand && position) {
        const threeBetRange =
          (position === 'BB' && villainPosition === 'SB')
            ? BB_VS_SB_3BET_RANGES
            : (THREE_BET_RANGES[position] || [])
        return threeBetRange.includes(hand) ? '3bet' : 'call'
      }
      return 'call'
    }
    default:           return 'raise'
  }
}

// ---- HELPER: ajuste de range por profundidade de stack ----
// MÃ£os especulativas (implied odds) perdem valor em stacks curtos
function applyStackAdjustment(range: string[], heroStack: number): string[] {
  if (heroStack >= 100) return range
  // MÃ£os que exigem implied odds (deep stack) â€” removidas gradualmente com stack menor
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

// ---- HELPER: constrÃ³i pool com cobertura total + boost de marginais ----
// Garante que TODAS as 169 mÃ£os do grid apareÃ§am pelo menos 1Ã— (cobertura total),
// mas com pesos diferenciados para focar o aprendizado nas mÃ£os da fronteira:
//
// Categoria                              | Peso
// ---------------------------------------|------
// Marginal IN range  (ex: 22, A5s BTN)   | 3-4Ã—  â† "primeiras dentro do range"
// Marginal OUT range (ex: K2o vs UTG)    | 3-4Ã—  â† "quase entrou mas nÃ£o"
// Premium IN range   (AA, KK, AKs, etc.) | 1Ã—    â† decisÃ£o fÃ¡cil, pouca repetiÃ§Ã£o
// Trash OUT range    (72o, 83o, etc.)    | 1Ã—    â† fold trivial, pouca repetiÃ§Ã£o
//
// Resultado: o usuÃ¡rio vÃª CADA mÃ£o pelo menos uma vez (para reconhecimento),
// mas passa a maior parte do tempo decidindo nas mÃ£os marginais.
function buildWeightedPool(range: string[], allHands: string[], difficulty: 'easy' | 'medium' | 'hard' = 'medium'): string[] {
  const pool: string[] = []
  const rangeSet = new Set(range)

  // Boost de marginais â€” mais alto em hard (treino mais focado em borderline)
  const marginalBoost = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 5 : 4

  // Cobertura TOTAL: itera as 169 mÃ£os do grid
  for (const hand of allHands) {
    const isMarginal = MARGINAL_HANDS.has(hand)
    const isInRange = rangeSet.has(hand)

    // Peso base: 1 (toda mÃ£o aparece pelo menos uma vez)
    // Marginal recebe boost forte; mÃ£o in-range premium ganha +1 sobre trash
    let weight = 1
    if (isMarginal) weight = marginalBoost
    else if (isInRange) weight = 2

    for (let i = 0; i < weight; i++) pool.push(hand)
  }

  // Fisher-Yates shuffle
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

// AÃ§Ãµes visÃ­veis por cenÃ¡rio (evita mostrar todos os botÃµes sempre)
const ACTIONS_BY_SCENARIO: Record<ScenarioType, Action[]> = {
  open_raise: ['fold', 'raise'],
  push_fold:  ['fold', 'jam'],
  '3bet':     ['fold', 'call', '3bet'],
  bb_defense: ['fold', 'call', '3bet'],
  vs_raise:   ['fold', 'call', '3bet'],
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

  // PrÃ©-seleciona cenÃ¡rio se vier da navegaÃ§Ã£o (Dashboard â†’ Pontos a Melhorar / Treinar Agora)
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
  const [stackDepth, setStackDepth] = useState(15) // push/fold especÃ­fico (5-25bb)
  const [heroStack, setHeroStack] = useState(100)    // stack geral da sessÃ£o (25-200bb)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isRandomPosition, setIsRandomPosition] = useState(true)
  const [poolPosition, setPoolPosition] = useState<Position>('BTN')

  // PosiÃ§Ãµes do villain: SEMPRE mostra todas, desabilita visualmente as invÃ¡lidas.
  // - bb_defense: hero=BB, villain qualquer opener exceto BB.
  // - vs_raise/3bet/squeeze: villain age ANTES do hero (preflop order).
  // - 4bet: villain (3-bettor) age DEPOIS do hero (que abriu).
  const ALL_VILLAIN_POSITIONS_BY_FORMAT: Position[] = (
    tableFormat === '9max'
      ? ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']
      : tableFormat === 'HU'
      ? ['BTN', 'BB']
      : ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
  )
  // Quando hero Ã© aleatÃ³rio, o seletor de villain deve aceitar qualquer posiÃ§Ã£o que seja
  // vÃ¡lida para PELO MENOS UM hero possÃ­vel no cenÃ¡rio â€” evita bloquear todos os botÃµes.
  const VALID_VILLAIN_SET = new Set(
    isRandomPosition
      ? ALL_VILLAIN_POSITIONS_BY_FORMAT.filter(pos =>
          (POSITIONS_BY_FORMAT[tableFormat] ?? [])
            .filter(p => POSITIONS_BY_SCENARIO[scenario].includes(p))
            .some(heroP => getValidVillainPositions(scenario, heroP, tableFormat).includes(pos))
        )
      : getValidVillainPositions(scenario, position, tableFormat)
  )
  const VILLAIN_OPEN_POSITIONS: Position[] = [...VALID_VILLAIN_SET] // mantÃ©m compat para outros usos
  // CenÃ¡rios onde o seletor de villain faz sentido
  const SHOWS_VILLAIN_SELECTOR = ['bb_defense', 'vs_raise', '3bet', '4bet', 'squeeze'].includes(scenario)
  // Set de posiÃ§Ãµes vÃ¡lidas para hero (filtro dual: scenario + villain)
  const VALID_HERO_SET = new Set(
    SHOWS_VILLAIN_SELECTOR
      ? getValidHeroPositions(scenario, villainPosition, tableFormat, POSITIONS_BY_SCENARIO[scenario])
      : POSITIONS_BY_SCENARIO[scenario]
  )

  const STACK_OPTIONS = [25, 40, 50, 75, 100, 150, 200]

  // Ao mudar formato de mesa, ajusta posiÃ§Ãµes vÃ¡lidas
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

  // Ao mudar cenÃ¡rio, garante que a posiÃ§Ã£o seja vÃ¡lida para o novo cenÃ¡rio
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

  // Pool de mÃ£os para rotaÃ§Ã£o sistemÃ¡tica
  const [handPool, setHandPool] = useState<string[]>([])
  const allHandsList = generateHandGrid().flat()

  // Estado da questÃ£o atual
  const [currentQuestion, setCurrentQuestion] = useState<PreflopDrillQuestion | null>(null)
  const [userAnswer, setUserAnswer] = useState<Action | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showRange, setShowRange] = useState(false)
  const [questionStart, setQuestionStart] = useState(0)
  // Buffer das Ãºltimas N questÃµes para evitar repetiÃ§Ã£o imediata (anti-loop)
  const recentQuestionsRef = useRef<string[]>([])
  const RECENT_BUFFER = 5
  // Contador de questÃµes â€” usado como display key para forÃ§ar re-animaÃ§Ã£o mesmo quando o ID se repete
  const [questionSequence, setQuestionSequence] = useState(0)

  // EstatÃ­sticas da sessÃ£o atual
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0 })
  // Tipo SM-2 da questÃ£o atual: 'review' = revisÃ£o agendada, 'new' = primeira vez, null = do pool dinÃ¢mico
  const [questionSM2Type, setQuestionSM2Type] = useState<'review' | 'new' | null>(null)

  // --- CompetiÃ§Ã£o ---
  const [competitionTimeLeft, setCompetitionTimeLeft] = useState(COMPETITION_DURATION)
  const [competitionResult, setCompetitionResult] = useState<CompetitionScore | null>(null)
  const competitionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-correÃ§Ã£o: se villainPosition virou invÃ¡lida (apÃ³s mudanÃ§a de hero/scenario/format),
  // troca para a primeira posiÃ§Ã£o vÃ¡lida. TambÃ©m garante que o villain escolhido
  // nÃ£o deixe zero posiÃ§Ãµes de hero vÃ¡lidas (evita bloqueio total do seletor de hero).
  useEffect(() => {
    if (VILLAIN_OPEN_POSITIONS.length === 0) {
      // Hero atual nÃ£o tem villain vÃ¡lido nenhum (ex: UTG em vs_raise 6max).
      // Resetar hero para a primeira posiÃ§Ã£o do cenÃ¡rio que tenha ao menos 1 villain disponÃ­vel.
      if (!isRandomPosition) {
        const formatPos = POSITIONS_BY_FORMAT[tableFormat] ?? []
        const scenarioPos = POSITIONS_BY_SCENARIO[scenario] ?? []
        const firstValid = formatPos.find(p =>
          scenarioPos.includes(p) &&
          getValidVillainPositions(scenario, p, tableFormat).length > 0
        )
        if (firstValid) setPosition(firstValid)
      }
      return
    }
    const pickFirstValid = () => setVillainPosition(VILLAIN_OPEN_POSITIONS[0])
    if (!VILLAIN_OPEN_POSITIONS.includes(villainPosition)) {
      pickFirstValid()
      return
    }
    // Villain estÃ¡ na lista vÃ¡lida, mas pode ainda deixar hero sem opÃ§Ãµes (ex: villain=UTG em 4-bet)
    const validHero = getValidHeroPositions(scenario, villainPosition, tableFormat, POSITIONS_BY_SCENARIO[scenario])
    if (validHero.length === 0) {
      // Tenta encontrar um villain que deixe pelo menos uma posiÃ§Ã£o de hero vÃ¡lida
      const betterVillain = VILLAIN_OPEN_POSITIONS.find(vp => {
        const vh = getValidHeroPositions(scenario, vp, tableFormat, POSITIONS_BY_SCENARIO[scenario])
        return vh.length > 0
      })
      if (betterVillain) setVillainPosition(betterVillain)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, scenario, tableFormat, isRandomPosition])

  // ---- GERAÃ‡ÃƒO DE QUESTÃƒO (lÃ³gica reestruturada) ----
  //
  // PRINCÃPIO: A FILA DE MÃƒOS Ã© a fonte da verdade.
  //   - ConstruÃ­da uma vez por scenario+position, embaralhada via buildWeightedPool
  //     (todas as 169 mÃ£os com boost nas marginais)
  //   - Cada chamada consome 1 mÃ£o da fila â†’ garante rotaÃ§Ã£o sem repetiÃ§Ã£o
  //   - Quando a fila esvazia â†’ reconstrÃ³i
  //
  // SM-2 (revisÃ£o): atua como BIAS SUAVE, nÃ£o override:
  //   - MÃ£os correspondentes a questÃµes due ganham peso extra no pool de construÃ§Ã£o
  //   - A mÃ£o due aparece no fluxo da rotaÃ§Ã£o (nÃ£o a forÃ§a infinitamente)
  //
  // ANTI-LOOP: a Ãºltima mÃ£o mostrada NUNCA aparece consecutivamente.
  const generateQuestion = useCallback(() => {
    // ---- 1. Determina posiÃ§Ã£o efetiva ----
    let effectivePos = position
    if (isRandomPosition) {
      const formatPos = POSITIONS_BY_FORMAT[tableFormat]
      const scenarioPos = POSITIONS_BY_SCENARIO[scenario]
      let validPos = formatPos.filter(p => scenarioPos.includes(p))
      // Para cenÃ¡rios com villain, filtra hero por compatibilidade com villainPosition
      // (hero != villain, e ordem de aÃ§Ã£o preflop respeitada).
      if (['vs_raise', 'bb_defense', '3bet', '4bet', 'squeeze'].includes(scenario)) {
        const valid = getValidHeroPositions(scenario, villainPosition, tableFormat, scenarioPos)
        if (valid.length > 0) validPos = valid
      }
      if (validPos.length > 0) {
        effectivePos = validPos[Math.floor(Math.random() * validPos.length)]
      }
    }

    // ---- 2. Range (com ajuste de stack) ----
    const baseRange = getRangeForScenario(scenario, effectivePos, stackDepth, tableFormat, villainPosition)
    // Stack adjustment se aplica a TODOS os cenÃ¡rios exceto push_fold (que usa
    // stackDepth prÃ³prio via PUSH_FOLD_RANGES[10|15]). MÃ£os especulativas
    // (SC's marginais, low pairs sem implied odds) caem do range conforme stack diminui.
    const range = scenario !== 'push_fold' ? applyStackAdjustment(baseRange, heroStack) : baseRange

    // ---- 3. Identifica mÃ£os com bank questions e questÃµes due (SM-2) ----
    const bankByHand = new Map<string, PreflopDrillQuestion[]>()
    for (const q of DRILL_QUESTIONS) {
      if (q.scenario !== scenario) continue
      if (q.position !== effectivePos) continue
      if (scenario === 'bb_defense' && q.villainPosition && q.villainPosition !== villainPosition) continue
      const arr = bankByHand.get(q.hand) ?? []
      arr.push(q)
      bankByHand.set(q.hand, arr)
    }

    const dueIds = new Set(getDueQuestions())
    const dueHands = new Set<string>()
    for (const [hand, qs] of bankByHand) {
      if (qs.some(q => dueIds.has(q.id))) dueHands.add(hand)
    }

    // ---- 4. ReconstrÃ³i a fila se posiÃ§Ã£o mudou ou estÃ¡ vazia ----
    let pool = (poolPosition === effectivePos) ? handPool : []
    if (pool.length === 0) {
      pool = buildWeightedPool(range, allHandsList, defaultDifficulty)
      // Bias SM-2: mÃ£os com questÃ£o due aparecem 2Ã— extras na fila
      for (const dueHand of dueHands) {
        pool.push(dueHand, dueHand)
      }
      // Re-embaralha apÃ³s adicionar SM-2
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
      }
      setPoolPosition(effectivePos)
    }

    // ---- 5. Pop prÃ³xima mÃ£o da fila â€” pulando a mÃ£o imediatamente anterior ----
    const lastHand = recentQuestionsRef.current[0] ?? null
    let hand = pool[0] ?? randomHand()
    let remainingPool = pool.slice(1)

    // Se a prÃ³xima mÃ£o Ã© igual Ã  Ãºltima mostrada e hÃ¡ outras na fila, troca de posiÃ§Ã£o
    if (hand === lastHand && remainingPool.length > 0) {
      const swapHand = remainingPool[0]
      remainingPool = [hand, ...remainingPool.slice(1)]
      hand = swapHand
    }
    setHandPool(remainingPool)

    // ---- 6. Para essa mÃ£o, escolhe questÃ£o do banco (se existir) ou gera dinÃ¢mica ----
    const matchingBank = bankByHand.get(hand) ?? []
    let question: PreflopDrillQuestion

    if (matchingBank.length > 0) {
      // Prefere questÃ£o due dentro das matches; senÃ£o, sorteia
      const dueMatches = matchingBank.filter(q => dueIds.has(q.id))
      question = dueMatches.length > 0
        ? dueMatches[Math.floor(Math.random() * dueMatches.length)]
        : matchingBank[Math.floor(Math.random() * matchingBank.length)]
      setQuestionSM2Type(dueMatches.length > 0 ? 'review' : (useSpacedRepetitionStore.getState().getQuestionStats(question.id) ? null : 'new'))
    } else {
      // Gera questÃ£o dinÃ¢mica para essa mÃ£o
      setQuestionSM2Type(null)
      const isInRange = range.includes(hand)
      const correctAction = getCorrectActionForScenario(scenario, isInRange, hand, effectivePos, villainPosition)

      const scenarioLabels: Record<ScenarioType, string> = {
        open_raise: 'open raise', push_fold: 'push/fold', '3bet': '3-bet', '4bet': '4-bet',
        squeeze: 'squeeze', bb_defense: 'defesa do BB', vs_raise: 'call vs raise', sb_vs_bb: 'SB vs BB',
      }
      const actionLabels: Record<string, string> = {
        raise: 'RAISE (abrir o pot)', fold: 'FOLD (descartar)', jam: 'JAM (all-in)',
        '3bet': '3-BET (reraise)', '4bet': '4-BET (re-reraise)', call: 'CALL (chamar)', limp: 'LIMP (completar BB)',
      }
      const stackNote = scenario !== 'push_fold' && heroStack < 100
        ? ` [Range ajustada para ${heroStack}bb â€” mÃ£os especulativas removidas]`
        : ''

      question = {
        id: `gen_${Date.now()}_${hand}`,
        hand,
        position: effectivePos,
        heroStack,
        scenario,
        correctAction,
        correctFrequency: 1.0,
        explanation: isInRange
          ? `${hand} estÃ¡ dentro do range de ${scenarioLabels[scenario]} do ${effectivePos}.${stackNote} A jogada correta Ã© ${actionLabels[correctAction] ?? correctAction}.`
          : `${hand} estÃ¡ fora do range de ${scenarioLabels[scenario]} do ${effectivePos}.${stackNote} A mÃ£o nÃ£o tem equity suficiente nesta situaÃ§Ã£o â€” FOLD Ã© a jogada correta.`,
      }
    }

    // ---- 7. Atualiza buffer anti-loop (usando a MÃƒO, nÃ£o o id) ----
    const nextRecent = [hand, ...recentQuestionsRef.current.filter(h => h !== hand)].slice(0, RECENT_BUFFER)
    recentQuestionsRef.current = nextRecent

    setCurrentQuestion(question)
    setUserAnswer(null)
    setShowResult(false)
    setShowRange(false)
    setQuestionStart(Date.now())
    setQuestionSequence(s => s + 1)
  }, [scenario, position, isRandomPosition, stackDepth, heroStack, handPool, poolPosition, allHandsList, villainPosition, tableFormat, getDueQuestions, defaultDifficulty])

  // Verifica se a aÃ§Ã£o Ã© GTO-vÃ¡lida alÃ©m do correctAction exato:
  // 1. Match exato com correctAction â†’ correto
  // 2. Em gtoMix com freq >= 15% â†’ tambÃ©m vÃ¡lido (mistura GTO conhecida)
  // 3. Spots de mistura (correctFrequency < 0.9) onde a aÃ§Ã£o alternativa
  //    natural tambÃ©m Ã© GTO-correta (ex: A5s BTN vs_raise â€” pode ser call OU 3bet)
  function isAlsoValidAction(action: Action, q: PreflopDrillQuestion): boolean {
    if (action === q.correctAction) return false // jÃ¡ Ã© exato, nÃ£o "tambÃ©m"
    // Mistura GTO explÃ­cita no banco
    if (q.gtoMix && (q.gtoMix[action] ?? 0) >= 0.15) return true
    // Spots com correctFrequency < 0.9 = mistura â€” aceita aÃ§Ã£o complementar plausÃ­vel
    if ((q.correctFrequency ?? 1) < 0.9) {
      const sc = q.scenario as ScenarioType
      // bb_defense / vs_raise: alternativa entre call e 3bet
      if (sc === 'bb_defense' || sc === 'vs_raise') {
        const threeBetRange = THREE_BET_RANGES[q.position] || []
        const inDefenseRange = sc === 'bb_defense'
          ? (BB_DEFENSE_RANGES[q.villainPosition ?? 'BTN'] || []).includes(q.hand)
          : true
        if (action === '3bet' && threeBetRange.includes(q.hand)) return true
        if (action === 'call' && inDefenseRange && !threeBetRange.includes(q.hand)) return true
        // Quando correctAction='call' mas a mÃ£o tambÃ©m estÃ¡ em 3bet range = mix
        if (action === 'call' && q.correctAction === '3bet') return true
        if (action === '3bet' && q.correctAction === 'call' && threeBetRange.includes(q.hand)) return true
      }
      // 4bet: aceita call quando correctAction='4bet' (e vice-versa) em spots de mistura
      if (sc === '4bet') {
        if ((action === 'call' && q.correctAction === '4bet') ||
            (action === '4bet' && q.correctAction === 'call')) return true
      }
      // sb_vs_bb: aceita raise/limp/fold conforme gtoMix (jÃ¡ coberto acima)
    }
    return false
  }

  // ---- RESPOSTA DO USUÃRIO ----
  const handleAnswer = useCallback((action: Action) => {
    if (!currentQuestion || showResult) return

    const timeMs = Date.now() - questionStart
    const exactMatch = action === currentQuestion.correctAction
    const alsoValid = !exactMatch && isAlsoValidAction(action, currentQuestion)
    const isCorrect = exactMatch || alsoValid
    setUserAnswer(action)
    setShowResult(true)

    // Atualiza stats da sessÃ£o
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

    // Atualiza SM-2 apenas para questÃµes do banco (com ID fixo, nÃ£o geradas dinamicamente)
    if (!currentQuestion.id.startsWith('gen_')) {
      updateSM2(currentQuestion.id, isCorrect)
    }

    // No modo exam/competition, passa automaticamente apÃ³s 1.5s/1s
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

  // ---- INICIA SESSÃƒO ----
  function startDrillSession() {
    startSession(mode, scenario)
    setSessionStats({ total: 0, correct: 0 })
    setHandPool([]) // forÃ§a reconstruÃ§Ã£o do pool com cenÃ¡rio/posiÃ§Ã£o atuais
    setIsSessionActive(true)
    generateQuestion()
  }

  // Auto-start: se vier com location.state.autoStart, inicia direto no drill
  useEffect(() => {
    if (location.state?.autoStart && !isSessionActive) {
      startDrillSession()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only â€” usa closure do estado inicial

  // ---- TIMER DE COMPETIÃ‡ÃƒO ----
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

  // Quando timer chega a 0, encerra automaticamente a competiÃ§Ã£o
  useEffect(() => {
    if (competitionTimeLeft === 0 && mode === 'competition' && isSessionActive) {
      endCompetitionSession(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionTimeLeft])

  // ---- ENCERRA SESSÃƒO ----
  function endDrillSession() {
    // Calcular duraÃ§Ã£o ANTES de endSession() que zera currentSession
    const sessionDuration = currentSession
      ? Math.max(1, Math.round((Date.now() - currentSession.startedAt) / 60000))
      : 0
    endSession()
    const s = useUserStore.getState().profile.stats
    const newTotal = s.totalQuestions + sessionStats.total
    const newCorrect = s.totalCorrect + sessionStats.correct
    updateStats({
      totalQuestions: newTotal,
      totalCorrect: newCorrect,
      accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
      studyTimeMinutes: s.studyTimeMinutes + sessionDuration,
      totalSessions: s.totalSessions + 1,
    })
    updateStreak()
    syncAchievements(useTrainingStore.getState().sessionHistory)
    setIsSessionActive(false)
    setCurrentQuestion(null)
  }

  // ---- ENCERRA COMPETIÃ‡ÃƒO ----
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
    // Finaliza sessÃ£o normalmente para registrar no histÃ³rico
    const sessionDuration = currentSession
      ? Math.max(1, Math.round((Date.now() - currentSession.startedAt) / 60000))
      : 0
    endSession()
    const s = useUserStore.getState().profile.stats
    const newTotal = s.totalQuestions + sessionStats.total
    const newCorrect = s.totalCorrect + sessionStats.correct
    updateStats({
      totalQuestions: newTotal,
      totalCorrect: newCorrect,
      accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
      studyTimeMinutes: s.studyTimeMinutes + sessionDuration,
      totalSessions: s.totalSessions + 1,
      competitionGamesPlayed: (s.competitionGamesPlayed || 0) + 1,
      competitionBestScore: Math.max(score, s.competitionBestScore || 0),
    })
    updateStreak()
    const { sessionHistory: sh, competitionHighScores: chs } = useTrainingStore.getState()
    syncAchievements(sh, chs)
    setIsSessionActive(false)
    setCurrentQuestion(null)
    if (accuracy > 0) addXP(Math.round(score * getDifficultyXPMultiplier(defaultDifficulty)))
  }

  // Monta range para o heatmap. Stack adjustment se aplica a todos os cenÃ¡rios
  // exceto push_fold (que usa stackDepth prÃ³prio). Em modo aleatÃ³rio, usa a
  // posiÃ§Ã£o da questÃ£o atual (nÃ£o o estado `position` que pode ser BTN).
  const rangePosition = currentQuestion?.position ?? position
  const currentRange = (() => {
    const base = getRangeForScenario(scenario, rangePosition, stackDepth, tableFormat, villainPosition)
    return scenario !== 'push_fold' ? applyStackAdjustment(base, heroStack) : base
  })()
  const heatmapAction: Action =
    scenario === 'push_fold'  ? 'jam'   :
    scenario === '3bet'       ? '3bet'  :
    scenario === 'squeeze'    ? '3bet'  :
    scenario === '4bet'       ? '4bet'  :
    scenario === 'bb_defense' ? 'call'  :
    scenario === 'sb_vs_bb'   ? 'raise' : 'raise'

  // vs_raise e bb_defense: diferencia call (verde) vs 3bet (laranja) no grid.
  // Caso especial: BB vs SB usa BB_VS_SB_3BET_RANGES (mais wide).
  const rangeMap: Record<string, Action | 'mixed'> = {}
  if (scenario === 'vs_raise' || scenario === 'bb_defense') {
    const threeBetHands =
      (rangePosition === 'BB' && villainPosition === 'SB')
        ? BB_VS_SB_3BET_RANGES
        : (THREE_BET_RANGES[rangePosition] || [])
    currentRange.forEach(h => { rangeMap[h] = threeBetHands.includes(h) ? '3bet' : 'call' })
  } else {
    currentRange.forEach(h => { rangeMap[h] = heatmapAction })
  }

  // ---- TELA DE RESULTADO DA COMPETIÃ‡ÃƒO ----
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
            <p className="text-xs text-text-muted mt-1">Resultado da CompetiÃ§Ã£o</p>
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
                <div className="text-[10px] text-text-muted">precisÃ£o</div>
              </div>
            </div>
          </Card>

          {isNewBest && (
            <Card className="p-3 border-accent-gold/30 bg-accent-gold/5 text-center">
              <span className="text-xs text-accent-gold font-bold">ðŸŽ‰ Novo recorde pessoal!</span>
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
                    <span className="text-[10px] text-text-muted">{s.accuracy}% Â· {s.date}</span>
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

        {/* ===== PAINEL ESQUERDO: mesa de poker (desktop only, sÃ³ durante sessÃ£o ativa) ===== */}
        {isSessionActive && (
        <div className="hidden lg:flex lg:flex-col lg:w-[380px] xl:w-[420px] lg:shrink-0 lg:border-r lg:border-border-subtle lg:p-6 lg:overflow-y-auto">
          <TrainingTable
            heroPosition={currentQuestion ? currentQuestion.position : (isRandomPosition ? poolPosition : position)}
            villainPosition={['bb_defense', '3bet', '4bet', 'squeeze', 'vs_raise'].includes(scenario) ? villainPosition : undefined}
            handNotation={currentQuestion ? currentQuestion.hand : undefined}
            scenario={scenario}
            stackDepth={heroStack}
            tableFormat={tableFormat}
            heroAction={showResult && userAnswer ? userAnswer : undefined}
          />
          {/* Range heatmap no painel esquerdo (apÃ³s resposta) */}
          {isSessionActive && currentQuestion && showResult && mode !== 'competition' && (showRange || mode === 'study') && (
            <div className="mt-6 pt-5 border-t border-border-subtle">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-3 font-body">
                Range correto â€” {currentQuestion.position}
              </div>
              <RangeGrid
                range={rangeMap}
                highlightHand={currentQuestion.hand}
                cellSize="xs"
                showLegend={scenario === 'vs_raise' || scenario === 'bb_defense'}
              />
            </div>
          )}
        </div>
        )}

        {/* ===== PAINEL DIREITO: conteÃºdo (mobile: tela inteira) ===== */}
        <div className="flex-1 min-w-0">
      <div className="px-4 py-4 pb-6 lg:px-6 space-y-4">

        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-text-primary">Treinador PrÃ©-Flop</h1>
            <p className="text-xs text-text-muted mt-0.5">Ranges, GTO e decisÃµes corretas</p>
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
                  {sessionStats.total > 0 ? formatPercent(sessionStats.correct / sessionStats.total) : 'â€”'}
                </div>
                <div className="text-[10px] text-text-muted">{sessionStats.total} mÃ£os</div>
              </div>
            </div>
          )}
        </div>

        {/* ---- CONFIGURAÃ‡Ã•ES (quando nÃ£o ativo) ---- */}
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
                      {m === 'study' ? 'ðŸ“– Estudo' : m === 'drill' ? 'ðŸŽ¯ Drill' : 'ðŸ“ Exame'}
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
                  <Trophy size={13} /> ðŸ† CompetiÃ§Ã£o â€” 3 min, sem dicas
                </button>
                <p className="text-[10px] text-text-muted mt-2 font-body">
                  {mode === 'study' ? 'Veja o range completo e explicaÃ§Ãµes detalhadas apÃ³s cada resposta'
                    : mode === 'drill' ? 'Treino focado com feedback imediato e anÃ¡lise'
                    : mode === 'exam' ? 'Modo exame: sem dicas, avanÃ§a automaticamente'
                    : 'CompetiÃ§Ã£o: 3 min cronometrados, sem hints. Score = acertos Ã— 10 + bÃ´nus de tempo.'}
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
                  {tableFormat === 'HU' ? 'HU MTT: BTN abre ~65% das mÃ£os â€” dinÃ¢mica heads-up' :
                   tableFormat === '6max' ? '6-max MTT: formato mais comum em torneios online' :
                   '9-max MTT: full ring, UTG very tight (~10%) â€” simula mesas de torneio ao vivo'}
                </p>
              </Card>

              {/* CenÃ¡rio e PosiÃ§Ã£o */}
              <Card className="p-4">
                <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">CenÃ¡rio</div>
                <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
                  {([
                    { key: 'open_raise', label: 'Open Raise', icon: 'â†—' },
                    { key: 'push_fold',  label: 'Push/Fold',  icon: 'âš¡' },
                    { key: 'sb_vs_bb',   label: 'SB vs BB',   icon: 'âš”' },
                    { key: '3bet',       label: '3-Bet',      icon: 'ðŸ”¥' },
                    { key: '4bet',       label: '4-Bet',      icon: 'â™Ÿ' },
                    { key: 'squeeze',    label: 'Squeeze',    icon: 'ðŸ—œ' },
                    { key: 'bb_defense', label: 'BB Defense', icon: 'ðŸ›¡' },
                    { key: 'vs_raise',   label: 'vs Raise',   icon: 'ðŸŽ¯' },
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

                {/* PosiÃ§Ã£o */}
                <div className="text-xs text-text-muted font-body mb-2 uppercase tracking-wider">PosiÃ§Ã£o HeroÃ­na</div>
                <div className="flex gap-1.5 flex-wrap">
                  {/* BotÃ£o AleatÃ³ria */}
                  <button
                    onClick={() => setIsRandomPosition(true)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border flex items-center gap-1',
                      isRandomPosition
                        ? 'bg-accent-crimson/15 border-accent-crimson/40 text-accent-crimson'
                        : 'bg-bg-overlay border-border-subtle text-text-muted'
                    )}
                  >
                    ðŸŽ² AleatÃ³ria
                  </button>
                  {/* PosiÃ§Ãµes manuais â€” desabilita as incompatÃ­veis com villainPosition */}
                  {(() => {
                    const formatPos = POSITIONS_BY_FORMAT[tableFormat]
                    const scenarioPos = POSITIONS_BY_SCENARIO[scenario]
                    return formatPos.filter(p => scenarioPos.includes(p))
                  })().map(pos => {
                    const isHeroDisabled = !isRandomPosition && SHOWS_VILLAIN_SELECTOR && (
                      !VALID_HERO_SET.has(pos) ||
                      getValidVillainPositions(scenario, pos, tableFormat).length === 0
                    )
                    const isSelected = !isRandomPosition && position === pos
                    return (
                      <button
                        key={pos}
                        disabled={isHeroDisabled}
                        title={isHeroDisabled
                          ? (pos === villainPosition ? 'Mesma posiÃ§Ã£o que o villain' : 'Ordem de aÃ§Ã£o preflop incompatÃ­vel com villain atual')
                          : undefined}
                        onClick={() => { if (!isHeroDisabled) { setIsRandomPosition(false); setPosition(pos); setHandPool([]) } }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border',
                          isSelected
                            ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                            : isHeroDisabled
                            ? 'bg-bg-overlay/40 border-border-subtle/30 text-text-muted/30 cursor-not-allowed line-through'
                            : isRandomPosition
                            ? 'bg-bg-overlay border-border-subtle text-text-muted/40'
                            : 'bg-bg-overlay border-border-subtle text-text-muted hover:border-border-default'
                        )}
                      >
                        {pos}
                      </button>
                    )
                  })}
                </div>
                {isRandomPosition && (
                  <p className="text-[10px] text-accent-crimson/70 mt-1.5 font-body">
                    PosiÃ§Ã£o, mÃ£o e contexto variam a cada rodada â€” simula tomada de decisÃ£o real.
                  </p>
                )}
                {/* Seletor de posiÃ§Ã£o do villain para bb_defense, vs_raise, 3bet, 4bet, squeeze */}
                {SHOWS_VILLAIN_SELECTOR && (
                  <div className="mt-3">
                    <div className="text-xs text-text-muted font-body mb-2 uppercase tracking-wider">
                      {scenario === '4bet' ? 'Villain 3-betou de:' : 'Villain abriu de:'}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {ALL_VILLAIN_POSITIONS_BY_FORMAT.map(pos => {
                        const isValid = VALID_VILLAIN_SET.has(pos)
                        const isDisabled = !isValid
                        const isSelected = villainPosition === pos
                        return (
                          <button
                            key={pos}
                            onClick={() => { if (!isDisabled) { setVillainPosition(pos); setHandPool([]) } }}
                            disabled={isDisabled}
                            title={isDisabled
                              ? (pos === position ? 'Mesma posiÃ§Ã£o que o herÃ³i' : 'Ordem de aÃ§Ã£o preflop incompatÃ­vel')
                              : undefined}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all border',
                              isSelected
                                ? 'bg-accent-crimson/15 border-accent-crimson/40 text-accent-crimson'
                                : isDisabled
                                ? 'bg-bg-overlay/40 border-border-subtle/30 text-text-muted/30 cursor-not-allowed line-through'
                                : 'bg-bg-overlay border-border-subtle text-text-muted hover:border-border-default'
                            )}
                          >
                            {pos}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-text-muted mt-2 font-body">
                      {scenario === 'bb_defense'
                        ? 'Range de defesa varia conforme a posiÃ§Ã£o do opener â€” quanto mais late, mais wide o range adversÃ¡rio e mais mÃ£os vocÃª pode defender.'
                        : 'Range de call e 3-bet vs raise varia conforme a posiÃ§Ã£o do opener â€” vs UTG vocÃª defende mais tight, verde = Call / laranja = 3-Bet.'}
                    </p>
                  </div>
                )}
                {scenario === '4bet' && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    4-Bet: vocÃª abriu, villain 3-betou. Range polarizado: AA/KK/QQ/AK para valor + A5s-A2s como bluff com bloqueadores. AÃ§Ã£o: fold, call ou 4-bet.
                  </p>
                )}
                {scenario === 'squeeze' && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    Squeeze: houve um open raise + 1 caller antes de vocÃª. Range mais tight que 3-bet HU â€” precisa bater 2 players. AÃ§Ã£o: fold, call ou squeeze (3-bet).
                  </p>
                )}
                {scenario === 'sb_vs_bb' && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    SB vs BB: todos foldaram, vocÃª estÃ¡ no SB. Pode FOLD, LIMP (completar BB por 0.5bb extra) ou RAISE (2.5x). GTO mistura limp e raise com muitas mÃ£os â€” heatmap mostra range de raise.
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
                <div className="text-xs text-text-muted font-body mb-3 uppercase tracking-wider">Stack do HerÃ³i</div>
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
                  {heroStack <= 25 ? 'âš¡ Push/fold territory â€” quase tudo Ã© all-in ou fold' :
                   heroStack <= 50 ? 'âš  Short stack â€” evite calls especulativos, valorize fold equity' :
                   heroStack <= 75 ? 'ðŸ“Š Mid stack â€” ranges ajustadas, 3-bets menores em valor de stack' :
                   heroStack === 100 ? 'âœ… Stack padrÃ£o 100bb â€” ranges GTO padrÃ£o' :
                   'ðŸš€ Deep stack â€” mÃ£os especulativas valem mais (implied odds maiores)'}
                </p>
              </Card>

              {/* BotÃ£o iniciar */}
              <Button variant="gold" size="lg" onClick={startDrillSession} className="w-full">
                <Play size={16} />
                Iniciar Treino
              </Button>

              {/* Heatmap preview */}
              <Card className="p-4">
                <SectionHeader
                  title={scenario === 'bb_defense'
                    ? `BB Defense vs ${villainPosition}`
                    : scenario === 'vs_raise'
                    ? `Call vs Raise â€” ${position}`
                    : `Range ${isRandomPosition ? 'por posiÃ§Ã£o' : position} â€” ${{
                        open_raise: 'Open Raise', push_fold: 'Push/Fold',
                        '3bet': '3-Bet', '4bet': '4-Bet', squeeze: 'Squeeze',
                        sb_vs_bb: 'SB vs BB (Raise)',
                      }[scenario as string] ?? scenario}`}
                  subtitle={(scenario === 'vs_raise' || scenario === 'bb_defense')
                    ? `${currentRange.filter(h => (THREE_BET_RANGES[rangePosition]||[]).includes(h)).length} mÃ£os 3-Bet + ${currentRange.filter(h => !(THREE_BET_RANGES[rangePosition]||[]).includes(h)).length} mÃ£os Call`
                    : `${currentRange.length} mÃ£os (${formatPercent(currentRange.length / 169)})`}
                />
                <RangeGrid range={rangeMap} showLegend={scenario === 'vs_raise' || scenario === 'bb_defense'} cellSize="xs" />
                {(scenario === 'vs_raise' || scenario === 'bb_defense') && (
                  <p className="text-[10px] text-text-muted mt-2 font-body">
                    Verde = Call | Laranja = 3-Bet (mÃ£os de valor + bluffs com bloqueadores)
                  </p>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- QUESTÃƒO ATIVA ---- */}
        <AnimatePresence>
          {isSessionActive && currentQuestion && (
            <motion.div
              // sequÃªncia garante re-mount/re-animaÃ§Ã£o mesmo quando o id da questÃ£o se repete
              key={`${currentQuestion.id}-${questionSequence}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Contexto da mÃ£o */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="gold">{tableFormat}</Badge>
                    <Badge variant="blue">
                      {currentQuestion.position}{isRandomPosition ? ' ðŸŽ²' : ''}
                    </Badge>
                    <Badge variant="neutral">{currentQuestion.heroStack} BBs</Badge>
                    <Badge variant="neutral">
                      {({'open_raise':'Open Raise','push_fold':'Push/Fold','3bet':'3-Bet','4bet':'4-Bet','squeeze':'Squeeze','bb_defense':'BB Defense','vs_raise':'Call RFI','sb_vs_bb':'SB vs BB'} as Record<string,string>)[currentQuestion.scenario] ?? currentQuestion.scenario}
                    </Badge>
                    {SHOWS_VILLAIN_SELECTOR && villainPosition && (
                      <Badge variant="neutral">vs {villainPosition}</Badge>
                    )}
                    {questionSM2Type === 'review' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                        ðŸ” RevisÃ£o
                      </span>
                    )}
                    {questionSM2Type === 'new' && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-blue/15 text-accent-blue border border-accent-blue/30">
                        â­ Nova
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-text-muted">
                    {sessionStats.total + 1}Âª mÃ£o
                  </div>
                </div>

                {/* Pergunta central */}
                <div className="text-center py-6">
                  <div className="text-xs text-text-muted font-body mb-2 uppercase tracking-wider">Sua mÃ£o</div>
                  <HandDisplay hand={currentQuestion.hand} className="text-5xl" />
                  <div className="text-[11px] text-text-muted mt-2 font-body">
                    {classifyHandStrength(currentQuestion.hand) === 'premium' ? 'â­ Premium' :
                     classifyHandStrength(currentQuestion.hand) === 'strong' ? 'ðŸ’ª Forte' :
                     classifyHandStrength(currentQuestion.hand) === 'medium' ? 'ðŸ“Š MÃ©dio' :
                     classifyHandStrength(currentQuestion.hand) === 'speculative' ? 'ðŸŽ² Especulativa' : 'ðŸ“‰ Fraca'}
                  </div>
                </div>

                {currentQuestion.villainAction && (
                  <div className="bg-bg-base rounded-lg p-3 text-center border border-border-subtle">
                    <span className="text-[11px] text-text-muted">Villain ({currentQuestion.villainPosition}) fez: </span>
                    <span className="font-mono font-bold text-orange-400 text-sm uppercase">{currentQuestion.villainAction}</span>
                  </div>
                )}
              </Card>

              {/* BotÃµes de aÃ§Ã£o â€” filtrados por cenÃ¡rio */}
              {!showResult && (() => {
                const visibleActions = ACTIONS.filter(a =>
                  ACTIONS_BY_SCENARIO[currentQuestion.scenario as ScenarioType]?.includes(a.action) ?? true
                )
                // Tailwind purga classes dinÃ¢micas â†’ mapeamento estÃ¡tico garante inclusÃ£o
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

              {/* Resultado e explicaÃ§Ã£o */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    {/* Veredito */}
                    {(() => {
                      const exactMatch = userAnswer === currentQuestion.correctAction
                      const alsoValid = !exactMatch && !!userAnswer && isAlsoValidAction(userAnswer, currentQuestion)
                      const isCorrect = exactMatch || alsoValid
                      return (
                    <Card className={cn(
                      'p-4 border-2',
                      isCorrect
                        ? alsoValid
                          ? 'border-yellow-500/40 bg-yellow-500/5'
                          : 'border-accent-emerald/40 bg-accent-emerald/5'
                        : 'border-accent-crimson/40 bg-accent-crimson/5'
                    )}>
                      <div className="flex items-center gap-3 mb-3">
                        {isCorrect ? (
                          <CheckCircle size={20} className={cn('flex-shrink-0', alsoValid ? 'text-yellow-400' : 'text-accent-emerald')} />
                        ) : (
                          <XCircle size={20} className="text-accent-crimson flex-shrink-0" />
                        )}
                        <div>
                          <div className={cn('text-sm font-display font-bold',
                            isCorrect ? (alsoValid ? 'text-yellow-400' : 'text-accent-emerald') : 'text-accent-crimson'
                          )}>
                            {exactMatch ? 'Correto! ðŸŽ¯' : alsoValid ? 'TambÃ©m vÃ¡lido (mistura GTO)' : 'Incorreto'}
                          </div>
                          <div className="text-[11px] text-text-muted">
                            {alsoValid ? 'AÃ§Ã£o mais frequente: ' : 'Jogada correta: '}
                            <span className="text-text-primary font-mono font-bold">
                              {currentQuestion.correctAction.toUpperCase()}
                            </span>
                            {currentQuestion.correctFrequency < 1 && (
                              <span className="text-text-muted"> ({formatPercent(currentQuestion.correctFrequency)} freq.)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ExplicaÃ§Ã£o (modo estudo e drill) */}
                      {mode !== 'exam' && mode !== 'competition' && (
                        <p className="text-[11px] text-text-secondary font-body leading-relaxed">
                          {currentQuestion.explanation}
                        </p>
                      )}

                      {/* GTO Mix â€” frequÃªncias de mistura */}
                      {currentQuestion.gtoMix && mode !== 'exam' && mode !== 'competition' && (
                        <div className="mt-3 pt-3 border-t border-border-subtle">
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                            GTO Mixing <span className="normal-case text-text-muted/60">(frequÃªncias)</span>
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
                            GTO mistura aÃ§Ãµes para nÃ£o ser explorado. AÃ§Ã£o primÃ¡ria mostrada acima.
                          </p>
                        </div>
                      )}

                      {/* EV Comparison */}
                      {currentQuestion.evComparison && mode !== 'exam' && (
                        <div className="mt-3 pt-3 border-t border-border-subtle">
                          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
                            EV esperado por aÃ§Ã£o <span className="normal-case text-text-muted/60">(em Big Blinds)</span>
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
                            EV = lucro mÃ©dio em BBs a longo prazo. Fold = 0 BB Ã© o ponto de referÃªncia.
                          </p>
                        </div>
                      )}
                    </Card>
                      )
                    })()}

                    {/* Range heatmap pÃ³s-resposta (mobile) â€” no desktop fica no painel esquerdo */}
                    {mode !== 'competition' && (showRange || mode === 'study') && (
                      <Card className="p-4 lg:hidden">
                        <SectionHeader
                          title={`Range Correto: ${currentQuestion.position}`}
                          subtitle={scenario === 'vs_raise' ? 'Verde=Call Â· Laranja=3-Bet' : undefined}
                        />
                        <RangeGrid
                          range={rangeMap}
                          highlightHand={currentQuestion.hand}
                          cellSize="xs"
                          showLegend={scenario === 'vs_raise'}
                        />
                      </Card>
                    )}

                    {/* BotÃµes de continuaÃ§Ã£o */}
                    <div className="flex gap-3">
                      {!showRange && mode !== 'study' && mode !== 'competition' && (
                        <Button variant="ghost" size="sm" onClick={() => setShowRange(true)} className="flex-1">
                          <Eye size={14} />
                          Ver Range
                        </Button>
                      )}
                      <Button variant="gold" size="md" onClick={generateQuestion} className="flex-1">
                        PrÃ³xima MÃ£o â†’
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Barra de progresso da sessÃ£o */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-text-muted">
                  <span>PrecisÃ£o da sessÃ£o</span>
                  <span className="font-mono">
                    {sessionStats.correct}/{sessionStats.total}
                  </span>
                </div>
                <ProgressBar
                  value={sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}
                  color={sessionStats.total > 0 && sessionStats.correct / sessionStats.total >= 0.75 ? 'emerald' : 'gold'}
                />
              </div>

              {/* Encerrar sessÃ£o */}
              {mode === 'competition' ? (
                <Button variant="ghost" size="sm" onClick={() => endCompetitionSession(competitionTimeLeft)} className="w-full text-yellow-400">
                  <Trophy size={13} />
                  Encerrar CompetiÃ§Ã£o
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={endDrillSession} className="w-full text-text-muted">
                  <RotateCcw size={13} />
                  Encerrar SessÃ£o
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
