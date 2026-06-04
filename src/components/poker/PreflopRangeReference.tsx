// ============================================================
// POKERMIND PRO — PAINEL DE CONSULTA DE RANGE PRÉ-FLOP
// Consulta rápida de ranges por cenário, posição e stack.
// Read-only — não modifica nenhum estado de treino.
// ============================================================

import { useState, useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import RangeGrid from './RangeGrid'
import {
  THREE_BET_RANGES,
  FOUR_BET_RANGES,
  SQUEEZE_RANGES,
  PUSH_FOLD_RANGES,
  BB_DEFENSE_RANGES,
  SB_VS_BB_RAISE_RANGES,
  SB_VS_BB_LIMP_RANGES,
  getOpenRaiseRange,
  getIPDefenseRange,
} from '@/data/ranges'
import type { Position, Action, TableFormat } from '@/types'

type RefScenario =
  | 'open_raise'
  | '3bet'
  | '4bet'
  | 'bb_defense'
  | 'vs_raise'
  | 'push_fold'
  | 'squeeze'
  | 'sb_vs_bb'

const SCENARIO_LABELS: Record<RefScenario, string> = {
  open_raise: 'Open Raise',
  '3bet':     '3-Bet',
  '4bet':     '4-Bet',
  bb_defense: 'BB Defense',
  vs_raise:   'IP Defense',
  push_fold:  'Push/Fold',
  squeeze:    'Squeeze',
  sb_vs_bb:   'SB vs BB',
}

const POSITIONS_BY_SCENARIO: Record<RefScenario, Position[]> = {
  open_raise: ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  '3bet':     ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '4bet':     ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  bb_defense: ['BB'],
  vs_raise:   ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  push_fold:  ['UTG', 'HJ', 'CO', 'BTN', 'SB'],
  squeeze:    ['HJ', 'CO', 'BTN', 'SB', 'BB'],
  sb_vs_bb:   ['SB'],
}

const VILLAIN_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB']

const NEEDS_VILLAIN: RefScenario[] = ['bb_defense', 'vs_raise']
const NEEDS_STACK: RefScenario[] = ['push_fold']
const FIXED_POSITION: RefScenario[] = ['bb_defense', 'sb_vs_bb']

function buildRangeMap(
  scenario: RefScenario,
  position: Position,
  villainPos: Position,
  stackIsShort: boolean,
  tableFormat: TableFormat,
): Record<string, Action> {
  const map: Record<string, Action> = {}

  switch (scenario) {
    case 'open_raise': {
      getOpenRaiseRange(tableFormat, position).forEach(h => { map[h] = 'raise' })
      break
    }
    case '3bet': {
      ;(THREE_BET_RANGES[position] ?? []).forEach(h => { map[h] = '3bet' })
      break
    }
    case '4bet': {
      ;(FOUR_BET_RANGES[position] ?? []).forEach(h => { map[h] = '4bet' })
      break
    }
    case 'push_fold': {
      const depth = stackIsShort ? 10 : 15
      ;((PUSH_FOLD_RANGES[depth] ?? {})[position] ?? []).forEach(h => { map[h] = 'raise' })
      break
    }
    case 'bb_defense': {
      const defense = BB_DEFENSE_RANGES[villainPos] ?? BB_DEFENSE_RANGES['UTG'] ?? []
      const threeBet = THREE_BET_RANGES['BB'] ?? []
      defense.forEach(h => { map[h] = threeBet.includes(h) ? '3bet' : 'call' })
      break
    }
    case 'vs_raise': {
      if (position === 'BB') {
        const defense = BB_DEFENSE_RANGES[villainPos] ?? BB_DEFENSE_RANGES['UTG'] ?? []
        const threeBet = THREE_BET_RANGES['BB'] ?? []
        defense.forEach(h => { map[h] = threeBet.includes(h) ? '3bet' : 'call' })
      } else {
        const ipDefense = getIPDefenseRange(position, villainPos) ?? []
        const threeBet = THREE_BET_RANGES[position] ?? []
        ipDefense.forEach(h => { map[h] = threeBet.includes(h) ? '3bet' : 'call' })
      }
      break
    }
    case 'squeeze': {
      ;(SQUEEZE_RANGES[position] ?? []).forEach(h => { map[h] = '3bet' })
      break
    }
    case 'sb_vs_bb': {
      SB_VS_BB_RAISE_RANGES.forEach(h => { map[h] = 'raise' })
      SB_VS_BB_LIMP_RANGES.forEach(h => { map[h] = 'call' })
      break
    }
  }

  return map
}

interface Props {
  tableFormat?: TableFormat
}

export default function PreflopRangeReference({ tableFormat = '6max' }: Props) {
  const [scenario, setScenario] = useState<RefScenario>('open_raise')
  const [heroPos, setHeroPos] = useState<Position>('BTN')
  const [villainPos, setVillainPos] = useState<Position>('BTN')
  const [stackIsShort, setStackIsShort] = useState(true) // true = ≤12 BB (usa 10), false = 13-20 BB (usa 15)

  const validHeroPositions = POSITIONS_BY_SCENARIO[scenario]
  const effectiveHeroPos: Position = validHeroPositions.includes(heroPos)
    ? heroPos
    : validHeroPositions[0]

  const rangeMap = useMemo(
    () => buildRangeMap(scenario, effectiveHeroPos, villainPos, stackIsShort, tableFormat),
    [scenario, effectiveHeroPos, villainPos, stackIsShort, tableFormat],
  )

  const showVillain = NEEDS_VILLAIN.includes(scenario)
  const showStack = NEEDS_STACK.includes(scenario)
  const fixedPosition = FIXED_POSITION.includes(scenario)

  function handleScenarioChange(s: RefScenario) {
    setScenario(s)
    // Reset hero position to first valid for new scenario
    const valid = POSITIONS_BY_SCENARIO[s]
    if (!valid.includes(heroPos)) setHeroPos(valid[0])
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BookOpen size={13} className="text-accent-gold flex-shrink-0" />
        <span className="text-[11px] font-body font-semibold text-text-secondary uppercase tracking-wider">
          Consulta de Range
        </span>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Cenário</span>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(SCENARIO_LABELS) as RefScenario[]).map(s => (
            <button
              key={s}
              onClick={() => handleScenarioChange(s)}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-body font-medium transition-colors text-left truncate',
                scenario === s
                  ? 'bg-accent-gold text-bg-base'
                  : 'bg-bg-overlay text-text-muted hover:text-text-primary hover:bg-bg-elevated border border-border-subtle',
              )}
            >
              {SCENARIO_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Hero position (hidden when fixed) */}
      {!fixedPosition && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Posição Hero</span>
          <div className="flex flex-wrap gap-1">
            {validHeroPositions.map(pos => (
              <button
                key={pos}
                onClick={() => setHeroPos(pos)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors',
                  effectiveHeroPos === pos
                    ? 'bg-accent-gold text-bg-base'
                    : 'bg-bg-overlay text-text-muted hover:text-text-primary border border-border-subtle',
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Villain position (only when needed) */}
      {showVillain && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Villain abriu de</span>
          <div className="flex flex-wrap gap-1">
            {VILLAIN_POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => setVillainPos(pos)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors',
                  villainPos === pos
                    ? 'bg-accent-crimson/80 text-white'
                    : 'bg-bg-overlay text-text-muted hover:text-text-primary border border-border-subtle',
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stack depth (push/fold only) */}
      {showStack && (
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Stack</span>
          <div className="flex gap-1">
            <button
              onClick={() => setStackIsShort(true)}
              className={cn(
                'flex-1 py-0.5 rounded text-[10px] font-mono font-bold transition-colors',
                stackIsShort
                  ? 'bg-accent-gold text-bg-base'
                  : 'bg-bg-overlay text-text-muted hover:text-text-primary border border-border-subtle',
              )}
            >
              ≤12 BB
            </button>
            <button
              onClick={() => setStackIsShort(false)}
              className={cn(
                'flex-1 py-0.5 rounded text-[10px] font-mono font-bold transition-colors',
                !stackIsShort
                  ? 'bg-accent-gold text-bg-base'
                  : 'bg-bg-overlay text-text-muted hover:text-text-primary border border-border-subtle',
              )}
            >
              13–20 BB
            </button>
          </div>
        </div>
      )}

      {/* Range grid */}
      <div className="mt-1">
        <RangeGrid
          range={rangeMap}
          cellSize="xs"
          showLegend={true}
        />
      </div>
    </div>
  )
}
