// ============================================================
// POKERMIND PRO — GRID DE RANGE (HEATMAP 13x13)
// Visualização do range de mãos com cores por ação
// ============================================================

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { generateHandGrid, RANKS } from '@/lib/poker'
import { Action } from '@/types'

// Cores das ações no heatmap
const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  raise:   { bg: '#f5c842', text: '#07070d', label: 'Open Raise' },
  call:    { bg: '#00c47a', text: '#07070d', label: 'Call' },
  '3bet':  { bg: '#ff6b35', text: '#ffffff', label: '3-Bet' },
  '4bet':  { bg: '#ff3d5a', text: '#ffffff', label: '4-Bet' },
  jam:     { bg: '#ff3d5a', text: '#ffffff', label: 'Jam' },
  fold:    { bg: '#1a1a2e', text: '#505070', label: 'Fold' },
  mixed:   { bg: '#a855f7', text: '#ffffff', label: 'Misto' },
  default: { bg: '#14141f', text: '#505070', label: '' },
}

interface RangeGridProps {
  /** Range ativo: mapeamento de mão → ação */
  range?: Record<string, Action | 'mixed'>
  /** Mão em destaque (drill atual) */
  highlightHand?: string
  /** Callback ao clicar em uma mão */
  onHandClick?: (hand: string) => void
  /** Modo interativo (permite seleção) */
  interactive?: boolean
  /** Tamanho das células */
  cellSize?: 'xs' | 'sm' | 'md'
  /** Exibe legenda */
  showLegend?: boolean
  /** Exibe rótulos do eixo */
  showAxis?: boolean
}

const CELL_SIZES = {
  xs: 'text-[7px] leading-none',
  sm: 'text-[9px] leading-none',
  md: 'text-[11px] leading-tight',
}

const GRID = generateHandGrid()

export default function RangeGrid({
  range = {},
  highlightHand,
  onHandClick,
  interactive = false,
  cellSize = 'sm',
  showLegend = true,
  showAxis = false,
}: RangeGridProps) {
  const [hoveredHand, setHoveredHand] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ hand: string; action: string; x: number; y: number } | null>(null)

  // Calcula porcentagem do range
  const totalInRange = Object.values(range).filter(a => a !== 'fold').length
  const totalHands = 169
  const rangePercent = ((totalInRange / totalHands) * 100).toFixed(1)

  function getCellStyle(hand: string) {
    const action = range[hand]
    if (!action || action === 'fold') return ACTION_COLORS.fold
    return ACTION_COLORS[action] || ACTION_COLORS.default
  }

  function handleMouseEnter(e: React.MouseEvent, hand: string) {
    const action = range[hand] || 'fold'
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setHoveredHand(hand)
    setTooltip({ hand, action, x: rect.left, y: rect.top })
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Cabeçalho com % do range */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-body text-text-muted">Grid de Range</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-accent-emerald font-bold">{rangePercent}%</span>
          <span className="text-[10px] text-text-muted">das mãos</span>
        </div>
      </div>

      {/* Eixo X (ranks) */}
      {showAxis && (
        <div className="flex ml-5">
          {RANKS.map(r => (
            <div key={r} className="flex-1 text-center text-[8px] text-text-muted font-mono">{r}</div>
          ))}
        </div>
      )}

      {/* Grid 13x13 */}
      <div className="relative">
        <div className="grid gap-[1px]" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
          {GRID.map((row, i) =>
            row.map((hand, j) => {
              const style = getCellStyle(hand)
              const isHighlighted = hand === highlightHand
              const isHovered = hand === hoveredHand
              const isPair = i === j
              const isSuited = i < j
              const hasAction = range[hand] && range[hand] !== 'fold'

              return (
                <motion.div
                  key={hand}
                  className={cn(
                    'range-cell aspect-square flex items-center justify-center relative',
                    'border border-transparent',
                    interactive && 'cursor-pointer',
                    isHighlighted && 'ring-2 ring-white ring-offset-1 ring-offset-bg-base z-20',
                    CELL_SIZES[cellSize]
                  )}
                  style={{
                    backgroundColor: style.bg,
                    color: style.text,
                    borderRadius: '2px',
                    opacity: isHovered ? 1 : hasAction ? 0.95 : 0.7,
                    transform: isHighlighted ? 'scale(1.15)' : undefined,
                    zIndex: isHighlighted ? 20 : undefined,
                  }}
                  onClick={() => onHandClick?.(hand)}
                  onMouseEnter={(e) => handleMouseEnter(e, hand)}
                  onMouseLeave={() => { setHoveredHand(null); setTooltip(null) }}
                  whileHover={interactive ? { scale: 1.15, zIndex: 10 } : undefined}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hasAction ? 0.95 : 0.6 }}
                  transition={{ delay: (i * 13 + j) * 0.002, duration: 0.2 }}
                >
                  <span className="font-mono font-bold select-none">{hand}</span>

                  {/* Indicador de mão highlight */}
                  {isHighlighted && (
                    <motion.div
                      className="absolute inset-0 rounded-sm border-2 border-white"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Legenda */}
      {showLegend && (
        <div className="flex flex-wrap gap-2 mt-1">
          {Object.entries(ACTION_COLORS)
            .filter(([key]) => key !== 'default' && key !== 'fold')
            .map(([action, style]) => (
              <div key={action} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: style.bg }}
                />
                <span className="text-[9px] font-body text-text-muted">{style.label}</span>
              </div>
            ))}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-bg-overlay border border-border-subtle flex-shrink-0" />
            <span className="text-[9px] font-body text-text-muted">Fold</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ------- RANGE GRID SIMPLIFICADO (só mostra ranges sem interação) -------
export function RangeSummary({ range, label }: { range: Record<string, Action>; label: string }) {
  const count = Object.values(range).filter(a => a !== 'fold').length
  const percent = ((count / 169) * 100).toFixed(0)

  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center">
        <span className="text-base">📊</span>
      </div>
      <div>
        <div className="text-[11px] font-body text-text-muted">{label}</div>
        <div className="text-sm font-mono font-bold text-accent-emerald">{percent}% <span className="text-text-muted font-normal text-[10px]">das mãos</span></div>
      </div>
    </div>
  )
}
