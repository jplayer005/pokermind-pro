// ============================================================
// POKERMIND PRO — COMPONENTE DE CARTA
// Renderização visual de cartas de baralho
// ============================================================

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card as CardType, Suit } from '@/types'
import { SUIT_SYMBOLS, SUIT_COLORS } from '@/lib/poker'

interface PlayingCardProps {
  card?: CardType
  faceDown?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  animate?: boolean
  delay?: number
}

const CARD_SIZES = {
  xs: { card: 'w-6 h-9', rank: 'text-[9px]', suit: 'text-[8px]' },
  sm: { card: 'w-9 h-14', rank: 'text-[11px]', suit: 'text-[10px]' },
  md: { card: 'w-12 h-[72px]', rank: 'text-sm', suit: 'text-xs' },
  lg: { card: 'w-16 h-24', rank: 'text-base', suit: 'text-sm' },
}

const SUIT_BG: Record<Suit, string> = {
  spades: 'from-gray-100 to-white',
  clubs: 'from-gray-100 to-white',
  hearts: 'from-red-50 to-white',
  diamonds: 'from-red-50 to-white',
}

export default function PlayingCard({
  card,
  faceDown = false,
  size = 'sm',
  className,
  animate = false,
  delay = 0,
}: PlayingCardProps) {
  const s = CARD_SIZES[size]

  const cardContent = (
    <div
      className={cn(
        'playing-card flex flex-col justify-between p-0.5 cursor-default select-none flex-shrink-0',
        s.card,
        !faceDown && card && `bg-gradient-to-br ${SUIT_BG[card.suit]}`,
        faceDown && 'bg-gradient-to-br from-blue-900 to-blue-950',
        className
      )}
    >
      {faceDown ? (
        // Dorso da carta
        <div className="w-full h-full flex items-center justify-center rounded-sm"
          style={{ background: 'repeating-linear-gradient(45deg, #1e3a6e, #1e3a6e 2px, #152d57 2px, #152d57 8px)' }}>
          <span className="text-blue-400 font-mono text-[8px] font-bold opacity-50">PM</span>
        </div>
      ) : card ? (
        <>
          {/* Canto superior esquerdo */}
          <div className="flex flex-col items-center leading-none" style={{ color: SUIT_COLORS[card.suit] }}>
            <span className={cn('font-display font-bold leading-none', s.rank)}>{card.rank}</span>
            <span className={cn(s.suit, 'leading-none mt-0.5')}>{SUIT_SYMBOLS[card.suit]}</span>
          </div>
          {/* Centro */}
          <div className="flex items-center justify-center">
            <span style={{ color: SUIT_COLORS[card.suit], fontSize: size === 'lg' ? '20px' : '12px' }}>
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
          {/* Canto inferior direito (rotacionado) */}
          <div className="flex flex-col items-center rotate-180 leading-none" style={{ color: SUIT_COLORS[card.suit] }}>
            <span className={cn('font-display font-bold leading-none', s.rank)}>{card.rank}</span>
            <span className={cn(s.suit, 'leading-none mt-0.5')}>{SUIT_SYMBOLS[card.suit]}</span>
          </div>
        </>
      ) : (
        // Slot vazio
        <div className="w-full h-full border-2 border-dashed border-white/20 rounded-md flex items-center justify-center">
          <span className="text-white/20 text-[10px]">?</span>
        </div>
      )}
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20, rotateX: 45 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ delay, duration: 0.3, ease: 'easeOut' }}
        style={{ perspective: 1000 }}
      >
        {cardContent}
      </motion.div>
    )
  }

  return cardContent
}

// ------- MÃO DO HERÓI (2 cartas) -------
export function HeroHand({ cards, size = 'sm' }: { cards: CardType[]; size?: PlayingCardProps['size'] }) {
  return (
    <div className="flex gap-1 items-center">
      {cards.map((card, i) => (
        <PlayingCard key={i} card={card} size={size} animate delay={i * 0.1} />
      ))}
    </div>
  )
}

// ------- BOARD (flop/turn/river) -------
export function Board({ cards, size = 'sm', maxCards = 5 }: {
  cards: CardType[]
  size?: PlayingCardProps['size']
  maxCards?: number
}) {
  return (
    <div className="flex gap-1 items-center justify-center">
      {Array.from({ length: maxCards }).map((_, i) => (
        <PlayingCard
          key={i}
          card={cards[i]}
          size={size}
          animate={!!cards[i]}
          delay={i * 0.08}
        />
      ))}
    </div>
  )
}

// ------- DISPLAY COMPACTO DE MÃO (texto) -------
export function HandDisplay({ hand, className }: { hand: string; className?: string }) {
  const isSuited = hand.endsWith('s')
  const isOffsuit = hand.endsWith('o')
  const isPair = hand.length === 2 && hand[0] === hand[1]

  return (
    <span className={cn(
      'font-mono font-bold text-sm',
      isSuited && 'text-accent-emerald',
      isOffsuit && 'text-text-secondary',
      isPair && 'text-accent-gold',
      className
    )}>
      {hand}
    </span>
  )
}
