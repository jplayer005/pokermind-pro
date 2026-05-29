// ============================================================
// POKERMIND PRO — TRAINING TABLE
// Mesa visual para os treinadores Pré-Flop e Pós-Flop.
// Versão web: mesa grande com posições e cartas.
// Versão mobile: compacta, embutida na tela de treino.
// ============================================================

import { motion, AnimatePresence } from 'framer-motion'
import PlayingCard from './PlayingCard'
import { Card as CardType } from '@/types'
import { cn } from '@/lib/utils'

// Coordenadas de cada assento (% do container)
const SEAT_COORDS: Record<string, { top: string; left: string }> = {
  UTG: { top: '8%',  left: '50%' },
  HJ:  { top: '20%', left: '76%' },
  CO:  { top: '52%', left: '87%' },
  BTN: { top: '76%', left: '74%' },
  SB:  { top: '76%', left: '26%' },
  BB:  { top: '20%', left: '24%' },
}

// Posições ativas por formato de mesa
const SEATS_BY_FORMAT: Record<string, string[]> = {
  HU:   ['BTN', 'BB'],
  '3max': ['BTN', 'SB', 'BB'],
  '4max': ['HJ', 'BTN', 'SB', 'BB'],
  '5max': ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '7max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '8max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '9max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
}

// Para pós-flop: IP = BTN, OOP = BB
const IP_OOP_TO_SEAT: Record<string, string> = { IP: 'BTN', OOP: 'BB' }

// Converte notação ("AKs", "QQ") em dois CardType para renderizar
function notationToCards(hand: string): [CardType, CardType] | null {
  if (!hand || hand.length < 2) return null
  const valid = 'AKQJT98765432'
  const r1 = hand[0] as CardType['rank']
  const r2 = hand[1] as CardType['rank']
  if (!valid.includes(r1) || !valid.includes(r2)) return null

  if (r1 === r2) {
    return [{ rank: r1, suit: 'spades' }, { rank: r2, suit: 'hearts' }]
  }
  const suited = hand.length > 2 && hand[2] === 's'
  return [
    { rank: r1, suit: 'spades' },
    { rank: r2, suit: suited ? 'spades' : 'hearts' },
  ]
}

// Cor do badge de ação
function actionBadgeClass(action: string): string {
  switch (action) {
    case 'fold':                     return 'bg-red-500/25 text-red-400 border-red-500/40'
    case 'call':                     return 'bg-emerald-500/25 text-emerald-400 border-emerald-500/40'
    case 'check':                    return 'bg-blue-500/25 text-blue-400 border-blue-500/40'
    case 'raise': case 'open':       return 'bg-yellow-500/25 text-yellow-400 border-yellow-500/40'
    case '3bet':                     return 'bg-orange-500/25 text-orange-400 border-orange-500/40'
    case '4bet':                     return 'bg-purple-500/25 text-purple-400 border-purple-500/40'
    case 'jam':                      return 'bg-red-600/30 text-red-300 border-red-600/40'
    case 'limp':                     return 'bg-blue-500/25 text-blue-400 border-blue-500/40'
    default:                         return 'bg-bg-elevated text-text-muted border-border-subtle'
  }
}

// Label legível para ação do villain por cenário
function villainActionLabel(scenario: string): string | null {
  switch (scenario) {
    case '3bet':       return '3-Bet'
    case '4bet':       return '4-Bet'
    case 'bb_defense': return 'Raise'
    case 'squeeze':    return 'Raise'
    case 'call_rfi':   return 'Raise'
    default:           return null
  }
}

// Label legível do cenário pré-flop
function scenarioLabel(scenario: string): string {
  const MAP: Record<string, string> = {
    open_raise:  'Open Raise',
    push_fold:   'Push / Fold',
    '3bet':      '3-Bet',
    '4bet':      '4-Bet',
    bb_defense:  'BB Defense',
    squeeze:     'Squeeze',
    call_rfi:    'vs Raise (RFI)',
    sb_vs_bb:    'SB vs BB',
  }
  return MAP[scenario] ?? scenario
}

// ============================================================
export interface TrainingTableProps {
  // --- Pré-Flop ---
  heroPosition?: string          // 'BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'
  villainPosition?: string
  handNotation?: string          // 'AKs', 'QQ', etc.
  scenario?: string
  stackDepth?: number
  heroAction?: string
  tableFormat?: string

  // --- Pós-Flop ---
  position?: 'IP' | 'OOP'
  heroCards?: CardType[]
  boardCards?: CardType[]
  boardPhase?: 'flop' | 'turn' | 'river'
  potSize?: number

  // --- Layout ---
  compact?: boolean
  className?: string
}

export default function TrainingTable({
  heroPosition,
  villainPosition,
  handNotation,
  scenario,
  stackDepth,
  heroAction,
  tableFormat = '6max',
  position,
  heroCards,
  boardCards,
  boardPhase = 'flop',
  potSize,
  compact = false,
  className,
}: TrainingTableProps) {
  const isPostflop = !!position

  // Mapeia herói e villain para assentos
  const heroSeat   = isPostflop ? IP_OOP_TO_SEAT[position!] : (heroPosition ?? 'BTN')
  const villainSeat = isPostflop
    ? (position === 'IP' ? 'BB' : 'BTN')
    : villainPosition

  // Assentos ativos para o formato de mesa
  const activeSeats = SEATS_BY_FORMAT[tableFormat] ?? SEATS_BY_FORMAT['6max']

  // Cartas do herói
  const heroCardPair: [CardType, CardType] | null = isPostflop
    ? (heroCards && heroCards.length >= 2 ? [heroCards[0], heroCards[1]] : null)
    : (handNotation ? notationToCards(handNotation) : null)

  // Board cards baseado na fase
  const boardCount = boardPhase === 'flop' ? 3 : boardPhase === 'turn' ? 4 : 5
  const visibleBoard = boardCards?.slice(0, boardCount) ?? []

  // Ação do villain pré-flop
  const vAction = scenario ? villainActionLabel(scenario) : null

  // Assentos "fantasma" para postflop (CO e SB aparecem faded para dar profundidade)
  const ghostSeats = isPostflop ? ['CO', 'SB'] : []

  const cardSize = compact ? 'xs' : 'xs'
  const tableAspect = compact ? '52%' : '58%'

  return (
    <div className={cn('space-y-3', className)}>

      {/* Context badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {scenario && (
          <span className="text-[10px] font-mono font-bold text-accent-gold bg-accent-gold/10 border border-accent-gold/20 px-2 py-0.5 rounded-full tracking-wide">
            {scenarioLabel(scenario)}
          </span>
        )}
        {position && (
          <span className={cn(
            'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border tracking-wide',
            position === 'IP'
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : 'text-red-400 bg-red-500/10 border-red-500/30'
          )}>
            {position === 'IP' ? 'IP' : 'OOP'}
          </span>
        )}
        {stackDepth != null && (
          <span className="text-[10px] font-mono text-text-muted bg-bg-elevated border border-border-subtle px-2 py-0.5 rounded-full">
            {stackDepth} BB
          </span>
        )}
        {potSize != null && (
          <span className="text-[10px] font-mono text-accent-gold font-bold bg-accent-gold/5 border border-accent-gold/10 px-2 py-0.5 rounded-full ml-auto">
            Pot {potSize} BB
          </span>
        )}
      </div>

      {/* Mesa */}
      <div className="relative w-full" style={{ paddingBottom: tableAspect }}>
        {/* Felt */}
        <div
          className="absolute inset-0 rounded-[50%] border-[3px] border-[#1a3a2a] shadow-2xl shadow-black/50 overflow-hidden"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e4d35 0%, #0f2d1c 55%, #071510 100%)' }}
        >
          {/* Textura sutil */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,255,255,1) 3px,rgba(255,255,255,1) 4px)' }}
          />
          {/* Anel interno */}
          <div className="absolute inset-[12%] rounded-[50%] border border-[#2d6a4f]/40" />

          {/* Centro: board cards (pós-flop) + pot */}
          <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10">
            {isPostflop && visibleBoard.length > 0 && (
              <div className="flex gap-0.5">
                {visibleBoard.map((card, i) => (
                  <motion.div
                    key={`${card.rank}${card.suit}`}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.35, delay: i * 0.07 }}
                    style={{ perspective: 600 }}
                  >
                    <PlayingCard card={card} size={compact ? 'xs' : 'sm'} />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Pot */}
            {potSize != null && (
              <div className="text-center">
                <div className="text-[8px] text-emerald-400/50 font-mono tracking-widest">POT</div>
                <motion.div
                  key={potSize}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn('font-bold font-mono text-yellow-400', compact ? 'text-[11px]' : 'text-sm')}
                >
                  {potSize} BB
                </motion.div>
              </div>
            )}

            {/* Logo mark quando não há nada no centro */}
            {!isPostflop && !potSize && (
              <div className="text-[9px] text-emerald-400/20 font-mono font-bold tracking-[4px]">PM</div>
            )}
          </div>
        </div>

        {/* Assentos */}
        {Object.entries(SEAT_COORDS).map(([seatId, coords]) => {
          const isHero    = seatId === heroSeat
          const isVillain = seatId === villainSeat
          const isActive  = activeSeats.includes(seatId)
          const isGhost   = ghostSeats.includes(seatId)

          // Esconde assentos que não estão no formato (exceto herói)
          if (!isHero && !isVillain && !isActive && !isGhost) return null

          const opacity = isHero || isVillain ? 1 : isActive ? 0.22 : 0.10

          return (
            <div
              key={seatId}
              className="absolute z-20"
              style={{
                top: coords.top,
                left: coords.left,
                transform: 'translate(-50%, -50%)',
                opacity,
              }}
            >
              <motion.div
                initial={isHero ? { scale: 0.8, opacity: 0 } : false}
                animate={isHero ? { scale: 1, opacity: 1 } : undefined}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="flex flex-col items-center gap-0.5"
              >
                {/* Cartas do assento */}
                <div className="flex gap-0.5 mb-0.5">
                  {isHero && heroCardPair ? (
                    heroCardPair.map((card, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.2 }}
                      >
                        <PlayingCard card={card} size={cardSize} />
                      </motion.div>
                    ))
                  ) : (
                    <>
                      <PlayingCard size={cardSize} faceDown />
                      <PlayingCard size={cardSize} faceDown />
                    </>
                  )}
                </div>

                {/* Placa do assento */}
                <div className={cn(
                  'px-2 py-0.5 rounded-lg text-center border min-w-[44px] transition-all',
                  isHero
                    ? 'bg-yellow-500/25 border-yellow-500/60 ring-1 ring-yellow-400/20'
                    : isVillain
                    ? 'bg-red-500/15 border-red-500/40'
                    : 'bg-bg-elevated/40 border-border-subtle/30'
                )}>
                  <div className={cn(
                    'text-[9px] font-bold leading-none',
                    isHero ? 'text-yellow-300' : isVillain ? 'text-red-400' : 'text-text-muted/40'
                  )}>
                    {isHero ? 'Você' : isVillain ? 'Villain' : seatId}
                  </div>
                  <div className={cn(
                    'text-[8px] font-mono leading-none mt-0.5',
                    isHero ? 'text-yellow-400/60' : isVillain ? 'text-red-400/50' : 'text-text-muted/20'
                  )}>
                    {seatId}
                  </div>
                </div>

                {/* Badge de ação */}
                <AnimatePresence>
                  {((isHero && heroAction) || (isVillain && vAction)) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className={cn(
                        'px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border tracking-wide',
                        isHero && heroAction ? actionBadgeClass(heroAction) : 'bg-red-500/25 text-red-400 border-red-500/40'
                      )}
                    >
                      {isHero ? heroAction : vAction}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Info rodapé */}
      {!compact && (
        <div className="flex items-center justify-between text-[10px] text-text-muted/50 font-mono">
          <span>{isPostflop ? `${boardPhase?.toUpperCase() ?? 'FLOP'}` : (tableFormat ?? '6max').toUpperCase()}</span>
          {heroSeat && <span>Você: {heroSeat}</span>}
        </div>
      )}
    </div>
  )
}
