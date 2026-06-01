// ============================================================
// POKERMIND PRO — TREINADOR PÓS-FLOP (REESCRITA COMPLETA)
// Treino real: hand + board + decisão GTO com feedback detalhado
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle, XCircle, Info, Play, RotateCcw, TrendingUp, AlertCircle } from 'lucide-react'
import { Button, Card, Badge, SectionHeader, ProgressBar } from '@/components/ui'
import PlayingCard, { Board } from '@/components/poker/PlayingCard'
import TrainingTable from '@/components/poker/TrainingTable'
import { cn, getDifficultyXPMultiplier } from '@/lib/utils'
import { Card as CardType, Action } from '@/types'
import { useUserStore, useTrainingStore, useUIStore, usePostflopReviewStore } from '@/store'
import type { PostflopSpotProfile } from '@/store'
import {
  evaluatePostflopHand, analyzeBoardTexture, getGTODecision,
  generateRandomCards, analyzeBoardAdvantage, analyzeBlockerEffects,
  classifyTurnCard, generateHandCombos, countCombos, runMonteCarloEquityPostflop,
} from '@/lib/poker'
import type { PostflopHandEval, BoardTexture, GtoDecision, BoardAdvantageAnalysis, BlockerEffect, TurnCardInfo, MonteCarloResult } from '@/lib/poker'
import { MARGINAL_HANDS, getHeroPreflopRangeByPosition, computeIPOOP } from '@/data/ranges'
import type { Position } from '@/types'

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

// Tailwind purga classes dinâmicas — mapeamento estático garante geração no build
const POSTFLOP_COLS_CLASS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3',
  4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
}

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

// Mini componente de exibição de equity. Reusado no flop/turn/river.
function EquityCard({ equity, street, villainPos }: {
  equity: MonteCarloResult
  street: 'flop' | 'turn' | 'river'
  villainPos: Position
}) {
  const eqPct = Math.round(equity.equity * 100)
  const eqColor = eqPct >= 60 ? 'text-emerald-400' : eqPct >= 40 ? 'text-yellow-400' : 'text-red-400'
  const eqBar = eqPct >= 60 ? 'bg-emerald-500' : eqPct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  const streetLabel = street === 'flop' ? 'no flop' : street === 'turn' ? 'no turn' : 'no river'
  const rangeLabel = `range estimado do villain (${villainPos})`

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted uppercase tracking-wider">Equity {streetLabel}</span>
        <span className={cn('text-base font-mono font-bold', eqColor)}>{eqPct}%</span>
      </div>
      <div className="h-2 bg-bg-overlay rounded-full overflow-hidden mb-3 flex">
        <motion.div
          className={cn('h-full', eqBar)}
          initial={{ width: 0 }}
          animate={{ width: `${equity.heroWinPct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {equity.tiePct > 0 && (
          <motion.div
            className="h-full bg-text-muted/40"
            initial={{ width: 0 }}
            animate={{ width: `${equity.tiePct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          />
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg p-2">
          <div className="text-[10px] text-text-muted uppercase">Win</div>
          <div className="text-xs font-mono font-bold text-emerald-400">{equity.heroWinPct}%</div>
        </div>
        <div className="bg-bg-overlay border border-border-subtle rounded-lg p-2">
          <div className="text-[10px] text-text-muted uppercase">Tie</div>
          <div className="text-xs font-mono font-bold text-text-secondary">{equity.tiePct}%</div>
        </div>
        <div className="bg-red-500/8 border border-red-500/20 rounded-lg p-2">
          <div className="text-[10px] text-text-muted uppercase">Loss</div>
          <div className="text-xs font-mono font-bold text-red-400">{equity.lossPct}%</div>
        </div>
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed">
        Vs {rangeLabel}. {equity.totalRuns} simulações Monte Carlo.
      </p>
    </Card>
  )
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

// Filtros de categoria — restringe quais spots o usuário quer treinar
type HandCategoryFilter = 'any' | 'nutted' | 'strong' | 'medium' | 'draws' | 'weak' | 'air'
type TextureFilter = 'any' | 'dry' | 'wet' | 'paired' | 'monotone'

// Agrupamento de categorias do PostflopHandCategory em buckets jogáveis
const CATEGORY_GROUPS: Record<HandCategoryFilter, string[]> = {
  any:     [],
  nutted:  ['quads', 'full_house', 'flush', 'straight', 'set'],
  strong:  ['trips', 'two_pair', 'overpair', 'tptk', 'tpgk'],
  medium:  ['tpwk', 'middle_pair', 'underpair'],
  draws:   ['draw_strong', 'draw_medium', 'draw_weak'],
  weak:    ['bottom_pair'],
  air:     ['overcards', 'air'],
}

const CATEGORY_FILTER_OPTIONS: { id: HandCategoryFilter; label: string; icon: string; sub: string }[] = [
  { id: 'any',     label: 'Qualquer',  icon: '🎲', sub: 'Todas as mãos'             },
  { id: 'nutted',  label: 'Nutadas',   icon: '🏆', sub: 'Set, straight, flush, FH'  },
  { id: 'strong',  label: 'Fortes',    icon: '💪', sub: 'TPTK, two pair, overpair'  },
  { id: 'medium',  label: 'Médias',    icon: '📊', sub: 'TPWK, middle pair, under'  },
  { id: 'draws',   label: 'Draws',     icon: '🎯', sub: 'FD, OESD, gutshot'         },
  { id: 'weak',    label: 'Fracas',    icon: '📉', sub: 'Par baixo'                 },
  { id: 'air',     label: 'Ar',        icon: '💨', sub: 'Overcards, nada'           },
]

const TEXTURE_FILTER_OPTIONS: { id: TextureFilter; label: string; icon: string }[] = [
  { id: 'any',      label: 'Qualquer',  icon: '🎲' },
  { id: 'dry',      label: 'Seco',      icon: '🟢' },
  { id: 'wet',      label: 'Molhado',   icon: '🟠' },
  { id: 'paired',   label: 'Pareado',   icon: '🔵' },
  { id: 'monotone', label: 'Monotone',  icon: '🔴' },
]

interface SetupConfig {
  position: HeroPos                       // derivado de hero/villain preflop positions
  heroPreflopPosition: Position
  villainPreflopPosition: Position
  potType: PotType
  scenario: FacingScenario
  potSize: number
  effectiveStack: number
  streetMode: StreetMode
  handCategoryFilter: HandCategoryFilter
  textureFilter: TextureFilter
}

// Posições preflop disponíveis no seletor (6-max, mais comum)
const PREFLOP_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']

function SetupPanel({ onStart, initialConfig }: { onStart: (cfg: SetupConfig) => void; initialConfig?: Partial<SetupConfig> }) {
  // Defaults inteligentes baseados em IP/OOP recebido (compat com Dashboard navigation)
  const defaultHero: Position = initialConfig?.heroPreflopPosition
    ?? (initialConfig?.position === 'OOP' ? 'BB' : 'BTN')
  const defaultVillain: Position = initialConfig?.villainPreflopPosition
    ?? (initialConfig?.position === 'OOP' ? 'BTN' : 'BB')

  const [heroPreflopPosition, setHeroPreflopPosition] = useState<Position>(defaultHero)
  const [villainPreflopPosition, setVillainPreflopPosition] = useState<Position>(defaultVillain)
  const [potType, setPotType] = useState<PotType>(initialConfig?.potType ?? 'SRP')
  const [scenario, setScenario] = useState<FacingScenario>(initialConfig?.scenario ?? 'first_to_act')
  const [potSize, setPotSize] = useState(initialConfig?.potSize ?? 10)
  const [effectiveStack, setEffectiveStack] = useState(initialConfig?.effectiveStack ?? 100)
  const [streetMode, setStreetMode] = useState<StreetMode>(initialConfig?.streetMode ?? 'full')
  const [handCategoryFilter, setHandCategoryFilter] = useState<HandCategoryFilter>(initialConfig?.handCategoryFilter ?? 'any')
  const [textureFilter, setTextureFilter] = useState<TextureFilter>(initialConfig?.textureFilter ?? 'any')

  // IP/OOP derivado das posições preflop
  const derivedPosition: HeroPos = computeIPOOP(heroPreflopPosition, villainPreflopPosition)

  // Se hero e villain forem a mesma posição, força villain para próximo válido
  if (heroPreflopPosition === villainPreflopPosition) {
    const alternative = PREFLOP_POSITIONS.find(p => p !== heroPreflopPosition) ?? 'BB'
    setTimeout(() => setVillainPreflopPosition(alternative), 0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Posições preflop (hero + villain) */}
      <Card className="p-4 space-y-3">
        <div>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Sua Posição (Preflop)</div>
          <div className="grid grid-cols-6 gap-1">
            {PREFLOP_POSITIONS.map(pos => {
              const isDisabled = pos === villainPreflopPosition
              const isSelected = heroPreflopPosition === pos
              return (
                <button
                  key={`hero-${pos}`}
                  onClick={() => !isDisabled && setHeroPreflopPosition(pos)}
                  disabled={isDisabled}
                  title={isDisabled ? 'Mesma posição que o villain' : undefined}
                  className={cn(
                    'py-2 rounded-lg text-[11px] font-mono font-bold border transition-all',
                    isSelected
                      ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
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
        </div>
        <div>
          <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Posição do Villain</div>
          <div className="grid grid-cols-6 gap-1">
            {PREFLOP_POSITIONS.map(pos => {
              const isDisabled = pos === heroPreflopPosition
              return (
                <button
                  key={`villain-${pos}`}
                  onClick={() => !isDisabled && setVillainPreflopPosition(pos)}
                  disabled={isDisabled}
                  title={isDisabled ? 'Mesma posição que o hero' : undefined}
                  className={cn(
                    'py-2 rounded-lg text-[11px] font-mono font-bold border transition-all',
                    villainPreflopPosition === pos
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
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
          <span className="text-[10px] text-text-muted uppercase tracking-wider">No postflop:</span>
          <span className={cn(
            'text-xs font-mono font-bold px-2 py-0.5 rounded border',
            derivedPosition === 'IP'
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/15 text-red-400 border-red-500/30'
          )}>
            {derivedPosition === 'IP' ? '✅ Você = IP' : '❌ Você = OOP'}
          </span>
          <span className="text-[10px] text-text-muted ml-auto font-body">
            Ranges amostrados pela posição real
          </span>
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

      {/* Filtro: Categoria de mão */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-text-muted uppercase tracking-wider">Categoria de Mão</div>
          {handCategoryFilter !== 'any' && (
            <button
              onClick={() => setHandCategoryFilter('any')}
              className="text-[10px] text-accent-blue underline"
            >
              limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORY_FILTER_OPTIONS.map(({ id, label, icon, sub }) => (
            <button
              key={id}
              onClick={() => setHandCategoryFilter(id)}
              className={cn(
                'py-2 px-2 rounded-xl text-xs font-bold border text-left transition-all',
                handCategoryFilter === id
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                  : 'bg-bg-overlay border-border-subtle text-text-muted hover:border-border-default'
              )}
            >
              <div>{icon} {label}</div>
              <div className="text-[9px] font-normal opacity-70 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>
        {handCategoryFilter !== 'any' && (
          <p className="text-[10px] text-text-muted mt-2 font-body">
            Só serão geradas mãos da categoria <span className="text-purple-300 font-semibold">{CATEGORY_FILTER_OPTIONS.find(o => o.id === handCategoryFilter)?.label}</span>.
          </p>
        )}
      </Card>

      {/* Filtro: Textura do board */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-text-muted uppercase tracking-wider">Textura do Board</div>
          {textureFilter !== 'any' && (
            <button
              onClick={() => setTextureFilter('any')}
              className="text-[10px] text-accent-blue underline"
            >
              limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {TEXTURE_FILTER_OPTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTextureFilter(id)}
              className={cn(
                'py-2 rounded-xl text-[11px] font-bold border transition-all',
                textureFilter === id
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-bg-overlay border-border-subtle text-text-muted hover:border-border-default'
              )}
            >
              <div className="text-sm">{icon}</div>
              <div>{label}</div>
            </button>
          ))}
        </div>
        {textureFilter !== 'any' && (
          <p className="text-[10px] text-text-muted mt-2 font-body">
            Só boards com textura <span className="text-cyan-300 font-semibold">{TEXTURE_FILTER_OPTIONS.find(o => o.id === textureFilter)?.label}</span>.
          </p>
        )}
      </Card>

      <Button
        variant="gold"
        size="lg"
        onClick={() => onStart({
          position: derivedPosition,
          heroPreflopPosition,
          villainPreflopPosition,
          potType, scenario, potSize, effectiveStack, streetMode,
          handCategoryFilter, textureFilter,
        })}
        className="w-full"
      >
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
  // Equity Monte Carlo vs range estimado do villain por rua
  flopEquity?: MonteCarloResult
  turnEquity?: MonteCarloResult
  riverEquity?: MonteCarloResult
}

function estimateTurnPot(flopPot: number, flopAction: PostflopAction | null): number {
  if (!flopAction) return flopPot
  // Multiplicadores assumindo villain chama bets/raises (estimativa pedagógica)
  const multipliers: Partial<Record<PostflopAction, number>> = {
    bet_33: 1 + 0.33 * 2,    // hero bet 33% + villain call
    bet_50: 2,               // hero bet 50% + villain call
    bet_67: 1 + 0.67 * 2,    // hero bet 67% + villain call
    bet_75: 1 + 0.75 * 2,    // hero bet 75% + villain call
    bet_pot: 3,              // hero bet pot + villain call
    check: 1,                // sem mudança no pot
    fold: 1,                 // fold encerra a mão (não chega aqui)
    call: 2,                 // facing_bet: villain apostou 50% (assumido) + hero call → ~2×
    raise: 1 + 0.67 * 2 + 0.67 * 2, // facing bet → hero re-raise ~3× (estimado)
    check_raise: 1 + 0.5 * 2 + 0.67 * 2, // check, villain bet 50%, hero raise → grande
  }
  return Math.round(flopPot * (multipliers[flopAction] ?? 1))
}

// ---- HELPERS PARA REVIEW QUEUE ----
type TextureClass = 'dry' | 'wet' | 'paired' | 'monotone' | 'neutral'

function textureToClass(texture: BoardTexture): TextureClass {
  if (texture.monotone) return 'monotone'
  if (texture.paired) return 'paired'
  if (texture.wet) return 'wet'
  if (texture.dry) return 'dry'
  return 'neutral'
}

function spotKey(
  category: string,
  position: 'IP' | 'OOP',
  potType: 'SRP' | '3bet',
  street: 'flop' | 'turn' | 'river',
  textureClass: TextureClass
): string {
  return `${category}_${position}_${potType}_${street}_${textureClass}`
}

// Retorna range estimado do villain para o spot — usado no cálculo de equity.
// Agora usa a função dinâmica por posição (villain vs hero, com positions trocadas).
function getVillainRange(cfg: SetupConfig): string[] {
  return getHeroPreflopRangeByPosition(cfg.villainPreflopPosition, cfg.heroPreflopPosition, cfg.potType)
}

// Equity Monte Carlo com 400 iterações (~80-150ms — snappy o suficiente).
function computeEquity(heroCards: [CardType, CardType], board: CardType[], cfg: SetupConfig): MonteCarloResult {
  const villainRange = getVillainRange(cfg)
  return runMonteCarloEquityPostflop(heroCards, board, villainRange, 400)
}

// Helpers de filtro — checam se um candidato passa pelos filtros da config
function matchesCategoryFilter(handCategory: string, filter: HandCategoryFilter): boolean {
  if (filter === 'any') return true
  return CATEGORY_GROUPS[filter].includes(handCategory)
}

function matchesTextureFilter(texture: BoardTexture, filter: TextureFilter): boolean {
  if (filter === 'any') return true
  if (filter === 'dry') return texture.dry
  if (filter === 'wet') return texture.wet
  if (filter === 'paired') return texture.paired
  if (filter === 'monotone') return texture.monotone
  return false
}

// Score de "interesse" para sort de candidatos. Quanto maior, mais o spot
// merece ser mostrado agora (o usuário precisa praticar essa categoria).
function scoreCandidate(profile: PostflopSpotProfile | null): number {
  let score = 1

  if (!profile) {
    // Nunca viu esse tipo de spot — boost moderado para descoberta
    score += 0.5
  } else {
    // Boost por erros (diminishing — 1 erro = 0.51, 5 erros = 1.69, 20 erros = 1.96)
    if (profile.mistakes > 0) {
      score += 2 * (1 - Math.exp(-profile.mistakes / 3))
    }
    // Boost extra se erro foi recente
    if (profile.lastMissedAt) {
      const hoursSince = (Date.now() - profile.lastMissedAt) / (1000 * 60 * 60)
      if (hoursSince < 24) score += 1.5
      else if (hoursSince < 168) score += 0.5 // 1 semana
    }
    // Despriorisa spots já dominados (>90% acerto após 5+ tentativas)
    const accuracy = 1 - (profile.mistakes / profile.attempts)
    if (accuracy > 0.9 && profile.attempts > 5) {
      score -= 0.4
    }
  }

  // Tie-break aleatório para variedade
  score += Math.random() * 0.3
  return score
}

// ---- AMOSTRAGEM REALISTA DE CARTAS DO HERÓI ----
// Em vez de 2 cartas 100% aleatórias, o herói recebe uma mão amostrada do
// range pré-flop que chegaria àquele spot (SRP IP, SRP OOP, 3bet IP, 3bet OOP).
// Isso evita situações irrealistas como 72o em pote 3-bet.
//
// Estratégia:
//   • 75% das vezes — mão do range pré-flop típico, com MARGINAIS-in boostadas 3×
//   • 25% das vezes — mão MARGINAL fora do range típico, para variar e ensinar
//     o usuário a reconhecer situações onde "essa mão não deveria estar aqui"
function pickHeroCardsFromRange(cfg: SetupConfig, boardCards: CardType[]): [CardType, CardType] {
  const range = getHeroPreflopRangeByPosition(cfg.heroPreflopPosition, cfg.villainPreflopPosition, cfg.potType)
  const rangeSet = new Set<string>(range)

  // Pool ponderado:
  //   - mão IN range: peso por combos × 3 se marginal, × 1 se premium
  //   - mão MARGINAL OUT of range: peso adicional (~25% do total) — ensina spots "raros"
  const weighted: string[] = []
  for (const hand of range) {
    const w = countCombos(hand)
    const baseWeight = Math.ceil(w / 4)
    const boost = MARGINAL_HANDS.has(hand) ? 3 : 1
    for (let i = 0; i < baseWeight * boost; i++) weighted.push(hand)
  }
  // Adiciona marginais OUT of range com peso menor mas presente
  const marginalOut = [...MARGINAL_HANDS].filter(h => !rangeSet.has(h))
  // Calibra peso para que ~25% do pool seja marginal-out
  const targetMarginalOut = Math.floor(weighted.length / 3)
  const perHandOut = marginalOut.length > 0 ? Math.max(1, Math.floor(targetMarginalOut / marginalOut.length)) : 0
  for (const hand of marginalOut) {
    for (let i = 0; i < perHandOut; i++) weighted.push(hand)
  }

  if (weighted.length === 0) {
    return generateRandomCards(2, boardCards) as [CardType, CardType]
  }
  // Tenta até 8× encontrar uma mão com combo disponível (não bloqueada pelo board)
  for (let attempts = 0; attempts < 8; attempts++) {
    const handStr = weighted[Math.floor(Math.random() * weighted.length)]
    const combos = generateHandCombos(handStr, boardCards)
    if (combos.length > 0) {
      return combos[Math.floor(Math.random() * combos.length)]
    }
  }
  // Fallback final: cartas aleatórias
  return generateRandomCards(2, boardCards) as [CardType, CardType]
}

// Gera UM candidato de drill state (board + hero + análise de flop + equity)
function generateOneCandidate(cfg: SetupConfig): DrillState {
  const boardCards = generateRandomCards(3) as [CardType, CardType, CardType]
  const heroCards = pickHeroCardsFromRange(cfg, boardCards)
  const texture = analyzeBoardTexture(boardCards)
  const handEval = evaluatePostflopHand(heroCards, boardCards)
  const flopSPR = cfg.potSize > 0 ? Math.round((cfg.effectiveStack / cfg.potSize) * 10) / 10 : 10
  const gtoDecision = getGTODecision(handEval, texture, cfg.position, cfg.potType, cfg.scenario === 'facing_bet', 'flop', flopSPR)
  const boardAdvantage = analyzeBoardAdvantage(texture, cfg.potType, cfg.position)
  const blockerEffects = analyzeBlockerEffects(heroCards)
  const flopEquity = computeEquity(heroCards, boardCards, cfg)
  return {
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
    flopEquity,
  }
}

// Verifica se um candidato passa pelos filtros da config (categoria + textura).
// Para turn_only/river_only, o "spot relevante" é o da rua final.
function candidatePassesFilters(candidate: DrillState, cfg: SetupConfig, street: 'flop' | 'turn' | 'river'): boolean {
  const handEval =
    street === 'turn'  ? candidate.turnHandEval :
    street === 'river' ? candidate.riverHandEval :
                         candidate.handEval
  if (!handEval) return false
  if (!matchesCategoryFilter(handEval.category, cfg.handCategoryFilter)) return false
  // Texture: para flop usa drill.texture, para turn/river recomputa
  let texture: BoardTexture
  if (street === 'flop') {
    texture = candidate.texture
  } else if (street === 'turn' && candidate.turnCard) {
    texture = analyzeBoardTexture([...candidate.board, candidate.turnCard])
  } else if (street === 'river' && candidate.riverCard) {
    const board = [...candidate.board, ...(candidate.turnCard ? [candidate.turnCard] : []), candidate.riverCard]
    texture = analyzeBoardTexture(board)
  } else {
    return false
  }
  return matchesTextureFilter(texture, cfg.textureFilter)
}

// Geração principal: candidate sampling enviesado pelo review queue + filtros.
// 1. Gera até MAX_ATTEMPTS candidatos brutos
// 2. Mantém só os que passam pelos filtros de categoria/textura da config
// 3. Para os filtrados, calcula "interest score" via review queue
// 4. Escolhe o de maior score
// Se filtros excluem tudo (filtro muito restritivo), fallback: ignora filtros.
function generateDrillState(cfg: SetupConfig): DrillState {
  const MAX_ATTEMPTS = 80
  const TARGET_CANDIDATES = 5
  const filtersActive = cfg.handCategoryFilter !== 'any' || cfg.textureFilter !== 'any'

  // ---- Modos turn_only/river_only: gera candidatos avançados até turn/river ----
  if (cfg.streetMode === 'turn_only' || cfg.streetMode === 'river_only') {
    const street: 'turn' | 'river' = cfg.streetMode === 'turn_only' ? 'turn' : 'river'
    const candidates: DrillState[] = []
    let attempts = 0
    while (candidates.length < TARGET_CANDIDATES && attempts < MAX_ATTEMPTS) {
      attempts++
      let cand = generateOneCandidate(cfg)
      cand = advanceTurn(cand, cfg)
      if (street === 'river') cand = advanceRiver(cand, cfg)
      if (!filtersActive || candidatePassesFilters(cand, cfg, street)) {
        candidates.push(cand)
      }
    }
    if (candidates.length === 0) {
      // Fallback: ignora filtros
      let fallback = generateOneCandidate(cfg)
      fallback = advanceTurn(fallback, cfg)
      if (street === 'river') fallback = advanceRiver(fallback, cfg)
      return street === 'turn'
        ? { ...fallback, answered: true }
        : { ...fallback, answered: true, turnAnswered: true }
    }
    // Escolhe melhor por score (baseado na rua relevante)
    let bestIdx = 0, bestScore = -Infinity
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i]
      const eval_ = street === 'turn' ? c.turnHandEval : c.riverHandEval
      if (!eval_) continue
      const board = street === 'turn' ? [...c.board, c.turnCard!] : [...c.board, c.turnCard!, c.riverCard!]
      const texture = analyzeBoardTexture(board)
      const key = spotKey(eval_.category, cfg.position, cfg.potType, street, textureToClass(texture))
      const s = scoreCandidate(usePostflopReviewStore.getState().getProfile(key))
      if (s > bestScore) { bestScore = s; bestIdx = i }
    }
    const best = candidates[bestIdx]
    return street === 'turn'
      ? { ...best, answered: true }
      : { ...best, answered: true, turnAnswered: true }
  }

  // ---- Modo full / flop_only: candidate sampling sobre o FLOP ----
  const candidates: DrillState[] = []
  let attempts = 0
  while (candidates.length < TARGET_CANDIDATES && attempts < MAX_ATTEMPTS) {
    attempts++
    const c = generateOneCandidate(cfg)
    if (!filtersActive || candidatePassesFilters(c, cfg, 'flop')) {
      candidates.push(c)
    }
  }

  // Filtros excluíram tudo? Fallback: gera 1 candidato sem filtro
  if (candidates.length === 0) {
    return generateOneCandidate(cfg)
  }

  // Score cada candidato e escolhe o melhor
  let bestIdx = 0, bestScore = -Infinity
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const key = spotKey(c.handEval.category, cfg.position, cfg.potType, 'flop', textureToClass(c.texture))
    const s = scoreCandidate(usePostflopReviewStore.getState().getProfile(key))
    if (s > bestScore) { bestScore = s; bestIdx = i }
  }
  return candidates[bestIdx]
}

function advanceTurn(drill: DrillState, cfg: SetupConfig): DrillState {
  const turnCard = generateRandomCards(1, [...drill.heroCards, ...drill.board])[0] as CardType
  const fullBoard = [...drill.board, turnCard]
  const turnInfo = classifyTurnCard(drill.heroCards, drill.board, turnCard, drill.handEval)
  const turnHandEval = evaluatePostflopHand(drill.heroCards, fullBoard)
  const turnTexture = analyzeBoardTexture(fullBoard)
  const turnEstimatedPot = estimateTurnPot(cfg.potSize, drill.userAction)
  // SPR usa stack restante (effectiveStack - investimento no flop estimado por jogador)
  // pot cresceu de cfg.potSize → turnEstimatedPot, ambos jogadores contribuíram metade
  const flopInvestmentPerPlayer = Math.max(0, (turnEstimatedPot - cfg.potSize) / 2)
  const turnRemainingStack = Math.max(1, cfg.effectiveStack - flopInvestmentPerPlayer)
  const turnSPR = turnEstimatedPot > 0 ? Math.round((turnRemainingStack / turnEstimatedPot) * 10) / 10 : 10
  // facing_bet só é o estado inicial do flop — no turn/river hero atua primeiro após villain check
  const turnGtoDecision = getGTODecision(turnHandEval, turnTexture, cfg.position, cfg.potType, false, 'turn', turnSPR)
  const turnEquity = computeEquity(drill.heroCards, fullBoard, cfg)
  return {
    ...drill,
    phase: 'turn',
    turnCard, turnInfo, turnHandEval, turnGtoDecision, turnEstimatedPot,
    turnAnswered: false, turnUserAction: null, turnResultType: null,
    turnEquity,
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
  const riverEstimatedPot = estimateTurnPot(drill.turnEstimatedPot, drill.turnUserAction)
  // Stack restante: desconta investimento aproximado de cada jogador acumulado nas ruas anteriores
  const totalInvestmentPerPlayer = Math.max(0, (riverEstimatedPot - cfg.potSize) / 2)
  const riverRemainingStack = Math.max(1, cfg.effectiveStack - totalInvestmentPerPlayer)
  const riverSPR = riverEstimatedPot > 0 ? Math.round((riverRemainingStack / riverEstimatedPot) * 10) / 10 : 10
  const riverGtoDecision = getGTODecision(riverHandEval, riverTexture, cfg.position, cfg.potType, false, 'river', riverSPR)
  const riverEquity = computeEquity(drill.heroCards, fullBoard, cfg)
  return {
    ...drill,
    phase: 'river',
    riverCard, riverInfo, riverHandEval, riverGtoDecision, riverEstimatedPot,
    riverAnswered: false, riverUserAction: null, riverResultType: null,
    riverEquity,
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
  const location = useLocation()
  const navigate = useNavigate()

  // Estado vindo do Dashboard "Pontos Fracos Pós-Flop" — pré-aplica config + auto-start
  const navState = location.state as null | {
    fromWeakSpot?: boolean
    position?: HeroPos
    potType?: PotType
    streetMode?: StreetMode
    handCategoryFilter?: HandCategoryFilter
    textureFilter?: TextureFilter
    autoStart?: boolean
  }
  const initialConfig: Partial<SetupConfig> | undefined = navState?.fromWeakSpot ? {
    position: navState.position,
    potType: navState.potType,
    streetMode: navState.streetMode,
    handCategoryFilter: navState.handCategoryFilter,
    textureFilter: navState.textureFilter,
  } : undefined

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

  // Auto-start quando vem do Dashboard "Pontos Fracos" — usa defaults para campos não setados
  useEffect(() => {
    if (navState?.autoStart && !config) {
      const ipOop = navState.position ?? 'IP'
      // Defaults inteligentes: IP=BTN vs BB, OOP=BB vs BTN (combos mais comuns)
      const heroPos: Position = ipOop === 'IP' ? 'BTN' : 'BB'
      const villainPos: Position = ipOop === 'IP' ? 'BB' : 'BTN'
      const cfg: SetupConfig = {
        position: ipOop,
        heroPreflopPosition: heroPos,
        villainPreflopPosition: villainPos,
        potType: navState.potType ?? 'SRP',
        scenario: 'first_to_act',
        potSize: 10,
        effectiveStack: 100,
        streetMode: navState.streetMode ?? 'flop_only',
        handCategoryFilter: navState.handCategoryFilter ?? 'any',
        textureFilter: navState.textureFilter ?? 'any',
      }
      setConfig(cfg)
      setDrill(generateDrillState(cfg))
      setSessionStats({ total: 0, correct: 0 })
      startSession('drill', 'postflop')
      // Limpa o state pra não re-iniciar em reloads
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [navState?.autoStart]) // eslint-disable-line react-hooks/exhaustive-deps

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

    // Helper para gravar o spot no review queue (bias futuro)
    const recordSpot = (
      street: 'flop' | 'turn' | 'river',
      handEval: PostflopHandEval,
      texture: BoardTexture,
      isMistake: boolean,
    ) => {
      const textureClass = textureToClass(texture)
      const key = spotKey(handEval.category, config.position, config.potType, street, textureClass)
      usePostflopReviewStore.getState().recordSpot(
        key,
        { category: handEval.category, position: config.position, potType: config.potType, street, textureClass },
        isMistake,
      )
    }

    if (drill.phase === 'flop') {
      const gto = drill.gtoDecision
      const resultType: 'correct' | 'alternative' | 'wrong' =
        action === gto.primaryAction ? 'correct' :
        (gto.alternativeAction && action === gto.alternativeAction) ? 'alternative' :
        (gto.alsoAcceptable && gto.alsoAcceptable.includes(action)) ? 'alternative' : 'wrong'
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
      recordSpot('flop', drill.handEval, drill.texture, resultType === 'wrong')
    } else if (drill.phase === 'turn') {
      const gto = drill.turnGtoDecision!
      const resultType: 'correct' | 'alternative' | 'wrong' =
        action === gto.primaryAction ? 'correct' :
        (gto.alternativeAction && action === gto.alternativeAction) ? 'alternative' :
        (gto.alsoAcceptable && gto.alsoAcceptable.includes(action)) ? 'alternative' : 'wrong'
      setDrill(prev => prev ? { ...prev, turnAnswered: true, turnUserAction: action, turnResultType: resultType } : prev)
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (resultType === 'correct' ? 1 : resultType === 'alternative' ? 0.5 : 0),
      }))
      const xp = resultType === 'correct' ? 10 : resultType === 'alternative' ? 5 : 0
      if (xp > 0) addXP(Math.round(xp * getDifficultyXPMultiplier(defaultDifficulty)))
      answerQuestion({
        questionId: `postflop_turn_${Date.now()}`,
        hand: drill.heroCards.map(c => `${c.rank}${c.suit[0]}`).join(''),
        userAction: toAction(action),
        correctAction: toAction(gto.primaryAction),
        isCorrect: resultType === 'correct',
        timeMs: 0,
        timestamp: Date.now(),
      })
      if (drill.turnHandEval && drill.turnCard) {
        const turnTexture = analyzeBoardTexture([...drill.board, drill.turnCard])
        recordSpot('turn', drill.turnHandEval, turnTexture, resultType === 'wrong')
      }
    } else {
      // River
      const gto = drill.riverGtoDecision!
      const resultType: 'correct' | 'alternative' | 'wrong' =
        action === gto.primaryAction ? 'correct' :
        (gto.alternativeAction && action === gto.alternativeAction) ? 'alternative' :
        (gto.alsoAcceptable && gto.alsoAcceptable.includes(action)) ? 'alternative' : 'wrong'
      setDrill(prev => prev ? { ...prev, riverAnswered: true, riverUserAction: action, riverResultType: resultType } : prev)
      setSessionStats(prev => ({
        total: prev.total + 1,
        correct: prev.correct + (resultType === 'correct' ? 1 : resultType === 'alternative' ? 0.5 : 0),
      }))
      const xp = resultType === 'correct' ? 10 : resultType === 'alternative' ? 5 : 0
      if (xp > 0) addXP(Math.round(xp * getDifficultyXPMultiplier(defaultDifficulty)))
      answerQuestion({
        questionId: `postflop_river_${Date.now()}`,
        hand: drill.heroCards.map(c => `${c.rank}${c.suit[0]}`).join(''),
        userAction: toAction(action),
        correctAction: toAction(gto.primaryAction),
        isCorrect: resultType === 'correct',
        timeMs: 0,
        timestamp: Date.now(),
      })
      if (drill.riverHandEval && drill.riverCard) {
        const riverBoard = [...drill.board, ...(drill.turnCard ? [drill.turnCard] : []), drill.riverCard]
        const riverTexture = analyzeBoardTexture(riverBoard)
        recordSpot('river', drill.riverHandEval, riverTexture, resultType === 'wrong')
      }
    }
  }, [drill, config, addXP, answerQuestion, defaultDifficulty])

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
      ? Math.max(1, Math.round((Date.now() - currentSession.startedAt) / 60000))
      : 0
    endSession()
    if (sessionStats.total > 0) {
      const s = useUserStore.getState().profile.stats
      const newTotal = s.totalQuestions + sessionStats.total
      const newCorrect = s.totalCorrect + Math.round(sessionStats.correct)
      updateStats({
        totalQuestions: newTotal,
        totalCorrect: newCorrect,
        accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
        studyTimeMinutes: s.studyTimeMinutes + sessionDuration,
        totalSessions: s.totalSessions + 1,
      })
      updateStreak()
      syncAchievements(useTrainingStore.getState().sessionHistory, useTrainingStore.getState().competitionHighScores)
    }
    setSessionStats({ total: 0, correct: 0 })
    startSession('drill', 'postflop')
    setDrill(generateDrillState(config))
  }, [config, currentSession, endSession, updateStats, updateStreak, syncAchievements, startSession, sessionStats])

  const handleEnd = useCallback(() => {
    if (sessionStats.total > 0) {
      const sessionDuration = currentSession
        ? Math.max(1, Math.round((Date.now() - currentSession.startedAt) / 60000))
        : 0
      endSession()
      const s = useUserStore.getState().profile.stats
      const newTotal = s.totalQuestions + sessionStats.total
      const newCorrect = s.totalCorrect + Math.round(sessionStats.correct)
      updateStats({
        totalQuestions: newTotal,
        totalCorrect: newCorrect,
        accuracy: newTotal > 0 ? newCorrect / newTotal : 0,
        studyTimeMinutes: s.studyTimeMinutes + sessionDuration,
        totalSessions: s.totalSessions + 1,
      })
      updateStreak()
      syncAchievements(useTrainingStore.getState().sessionHistory, useTrainingStore.getState().competitionHighScores)
    } else {
      endSession()
    }
    setConfig(null)
    setDrill(null)
  }, [sessionStats, currentSession, endSession, updateStats, updateStreak, syncAchievements])

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
              <SetupPanel onStart={handleStart} initialConfig={initialConfig} />
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
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-accent-gold/15 text-accent-gold border border-accent-gold/30">
                    {config.heroPreflopPosition} vs {config.villainPreflopPosition}
                  </span>
                  <Badge variant="blue">{config.potType}</Badge>
                  <Badge variant="neutral">{config.scenario === 'facing_bet' ? 'Villain Apostou' : 'Primeiro a Agir'}</Badge>
                  <Badge variant="gold">{config.potSize} BB pot</Badge>
                  <Badge variant="neutral">{config.effectiveStack} BB stack</Badge>
                  {config.handCategoryFilter !== 'any' && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {CATEGORY_FILTER_OPTIONS.find(o => o.id === config.handCategoryFilter)?.icon} {CATEGORY_FILTER_OPTIONS.find(o => o.id === config.handCategoryFilter)?.label}
                    </span>
                  )}
                  {config.textureFilter !== 'any' && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {TEXTURE_FILTER_OPTIONS.find(o => o.id === config.textureFilter)?.icon} {TEXTURE_FILTER_OPTIONS.find(o => o.id === config.textureFilter)?.label}
                    </span>
                  )}
                  {config.streetMode !== 'full' && (
                    <Badge variant="neutral">
                      {config.streetMode === 'flop_only' ? 'Flop' : config.streetMode === 'turn_only' ? 'Turn' : 'River'}
                    </Badge>
                  )}
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
                          {drill.gtoDecision.alsoAcceptable && drill.gtoDecision.alsoAcceptable.length > 0 && (
                            <div className="text-[11px] text-text-muted/80 mt-0.5">
                              Também aceitáveis:{' '}
                              <span className="font-mono text-text-secondary">
                                {drill.gtoDecision.alsoAcceptable.map(a => ACTION_LABELS[a as PostflopAction]).join(' · ')}
                              </span>
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

                    {/* Equity vs range estimado do villain */}
                    {drill.flopEquity && (
                      <EquityCard equity={drill.flopEquity} street="flop" villainPos={config.villainPreflopPosition} />
                    )}

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
                                  config.position === 'IP' ? 'text-text-secondary' : 'text-text-muted/60'
                                )}>
                                  {config.position === 'IP' ? 'Checked ✓' : 'Aguardando...'}
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
                      <div className={cn('grid gap-2', POSTFLOP_COLS_CLASS[actions.length] || 'grid-cols-3')}>
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
                                {drill.turnGtoDecision.alsoAcceptable && drill.turnGtoDecision.alsoAcceptable.length > 0 && (
                                  <div className="text-[11px] text-text-muted/80 mt-0.5">
                                    Também aceitáveis:{' '}
                                    <span className="font-mono text-text-secondary">
                                      {drill.turnGtoDecision.alsoAcceptable.map(a => ACTION_LABELS[a as PostflopAction]).join(' · ')}
                                    </span>
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

                          {/* Equity vs range no turn */}
                          {drill.turnEquity && (
                            <EquityCard equity={drill.turnEquity} street="turn" villainPos={config.villainPreflopPosition} />
                          )}

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
                          Pot estimado: ~{drill.riverEstimatedPot} BB • SPR ≈ {Math.max(0, (config.effectiveStack - (drill.riverEstimatedPot - config.potSize) / 2) / drill.riverEstimatedPot).toFixed(1)}
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
                                  config.position === 'IP' ? 'text-text-secondary' : 'text-text-muted/60'
                                )}>
                                  {config.position === 'IP' ? 'Checked ✓' : 'Aguardando...'}
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
                      <div className={cn('grid gap-2', POSTFLOP_COLS_CLASS[actions.length] || 'grid-cols-3')}>
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
                                {drill.riverGtoDecision.alternativeAction && (
                                  <div className="text-xs text-text-muted mt-0.5">
                                    Alt: <span className="font-mono text-text-secondary">{ACTION_LABELS[drill.riverGtoDecision.alternativeAction as PostflopAction]}</span>
                                    {' '}({Math.round((drill.riverGtoDecision.alternativeFrequency ?? 0) * 100)}%)
                                  </div>
                                )}
                                {drill.riverGtoDecision.alsoAcceptable && drill.riverGtoDecision.alsoAcceptable.length > 0 && (
                                  <div className="text-[11px] text-text-muted/80 mt-0.5">
                                    Também aceitáveis:{' '}
                                    <span className="font-mono text-text-secondary">
                                      {drill.riverGtoDecision.alsoAcceptable.map(a => ACTION_LABELS[a as PostflopAction]).join(' · ')}
                                    </span>
                                  </div>
                                )}
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

                          {/* Equity final vs range no river */}
                          {drill.riverEquity && (
                            <EquityCard equity={drill.riverEquity} street="river" villainPos={config.villainPreflopPosition} />
                          )}

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
                              { label: 'Turn', pot: drill.turnEstimatedPot, stack: Math.max(1, config.effectiveStack - (drill.turnEstimatedPot - config.potSize) / 2) },
                              { label: 'River', pot: drill.riverEstimatedPot, stack: Math.max(1, config.effectiveStack - (drill.riverEstimatedPot - config.potSize) / 2) },
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
                                const finalStackRemaining = Math.max(0, config.effectiveStack - (drill.riverEstimatedPot - config.potSize) / 2)
                                const finalSpr = drill.riverEstimatedPot > 0 ? finalStackRemaining / drill.riverEstimatedPot : 0
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
