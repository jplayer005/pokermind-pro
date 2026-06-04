// ============================================================
// POKERMIND PRO — PAINEL DE CONSULTA DE RANGE PRÉ-FLOP
// Consulta rápida de ranges por cenário, posição e stack.
// Read-only — não modifica nenhum estado de treino.
// ============================================================

import { useState, useMemo } from 'react'
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
const NEEDS_PUSH_FOLD_STACK: RefScenario[] = ['push_fold']
const FIXED_POSITION: RefScenario[] = ['bb_defense', 'sb_vs_bb']
const STACK_OPTIONS = [25, 40, 50, 75, 100, 150, 200]

// Mãos especulativas removidas do open range conforme stack diminui
function applyStackAdjustment(range: string[], heroStack: number): string[] {
  if (heroStack >= 100) return range
  const mid  = ['K2s','K3s','K4s','Q6s','Q7s','J6s','J7s','T5s','T6s','95s','96s','85s','86s','74s','75s','63s','64s','52s','53s','54s','A2s','A3s']
  const sht  = [...mid,  '22','33','44','K5s','K6s','Q8s','J8s','T7s','97s','87s','76s','65s','A4s','A5s','A8o','A9o','KTo','QTo','JTo','Q9o','J9o']
  const vsht = [...sht,  '55','K7s','K8s','Q9s','J9s','T8s','T9s','98s','88']
  const rm   = heroStack <= 40 ? vsht : heroStack <= 60 ? sht : heroStack <= 80 ? mid : []
  return range.filter(h => !rm.includes(h))
}

function buildRangeMap(
  scenario: RefScenario,
  position: Position,
  villainPos: Position,
  stackIsShort: boolean,
  heroStack: number,
  tableFormat: TableFormat,
): Record<string, Action> {
  const map: Record<string, Action> = {}
  switch (scenario) {
    case 'open_raise': {
      const raw = getOpenRaiseRange(tableFormat, position)
      applyStackAdjustment(raw, heroStack).forEach(h => { map[h] = 'raise' })
      break
    }
    case '3bet':
      ;(THREE_BET_RANGES[position] ?? []).forEach(h => { map[h] = '3bet' })
      break
    case '4bet':
      ;(FOUR_BET_RANGES[position] ?? []).forEach(h => { map[h] = '4bet' })
      break
    case 'push_fold': {
      const depth = stackIsShort ? 10 : 15
      ;((PUSH_FOLD_RANGES[depth] ?? {})[position] ?? []).forEach(h => { map[h] = 'raise' })
      break
    }
    case 'bb_defense': {
      const defense = BB_DEFENSE_RANGES[villainPos] ?? BB_DEFENSE_RANGES['UTG'] ?? []
      const tb = THREE_BET_RANGES['BB'] ?? []
      defense.forEach(h => { map[h] = tb.includes(h) ? '3bet' : 'call' })
      break
    }
    case 'vs_raise':
      if (position === 'BB') {
        const defense = BB_DEFENSE_RANGES[villainPos] ?? BB_DEFENSE_RANGES['UTG'] ?? []
        const tb = THREE_BET_RANGES['BB'] ?? []
        defense.forEach(h => { map[h] = tb.includes(h) ? '3bet' : 'call' })
      } else {
        const ip = getIPDefenseRange(position, villainPos) ?? []
        const tb = THREE_BET_RANGES[position] ?? []
        ip.forEach(h => { map[h] = tb.includes(h) ? '3bet' : 'call' })
      }
      break
    case 'squeeze':
      ;(SQUEEZE_RANGES[position] ?? []).forEach(h => { map[h] = '3bet' })
      break
    case 'sb_vs_bb':
      SB_VS_BB_RAISE_RANGES.forEach(h => { map[h] = 'raise' })
      SB_VS_BB_LIMP_RANGES.forEach(h => { map[h] = 'call' })
      break
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
  const [stackIsShort, setStackIsShort] = useState(true) // push/fold: ≤12BB vs 13-20BB
  const [heroStack, setHeroStack] = useState(100)        // stack geral (open raise etc.)

  const validHeroPositions = POSITIONS_BY_SCENARIO[scenario]
  const effectiveHeroPos: Position = validHeroPositions.includes(heroPos) ? heroPos : validHeroPositions[0]

  const showVillain = NEEDS_VILLAIN.includes(scenario)
  const showPushFoldStack = NEEDS_PUSH_FOLD_STACK.includes(scenario)
  const showGeneralStack = !showPushFoldStack  // stack geral p/ todos exceto push/fold
  const fixedPosition = FIXED_POSITION.includes(scenario)

  const rangeMap = useMemo(
    () => buildRangeMap(scenario, effectiveHeroPos, villainPos, stackIsShort, heroStack, tableFormat),
    [scenario, effectiveHeroPos, villainPos, stackIsShort, heroStack, tableFormat],
  )

  function handleScenarioChange(s: RefScenario) {
    setScenario(s)
    const valid = POSITIONS_BY_SCENARIO[s]
    if (!valid.includes(heroPos)) setHeroPos(valid[0])
  }

  const filters = (
    <div className="flex flex-col gap-3">
      {/* Cenário */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Cenário</span>
        <div className="grid grid-cols-2 gap-1">
          {(Object.keys(SCENARIO_LABELS) as RefScenario[]).map(s => (
            <button
              key={s}
              onClick={() => handleScenarioChange(s)}
              className={cn(
                'px-2 py-1.5 rounded text-[10px] font-body font-medium transition-colors text-left truncate',
                scenario === s
                  ? 'bg-accent-gold text-bg-base'
                  : 'bg-bg-base text-text-muted hover:text-text-primary hover:bg-bg-overlay border border-border-subtle',
              )}
            >
              {SCENARIO_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Posição Hero */}
      {!fixedPosition && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Posição Hero</span>
          <div className="flex flex-wrap gap-1">
            {validHeroPositions.map(pos => (
              <button
                key={pos}
                onClick={() => setHeroPos(pos)}
                className={cn(
                  'px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors',
                  effectiveHeroPos === pos
                    ? 'bg-accent-gold text-bg-base'
                    : 'bg-bg-base text-text-muted hover:text-text-primary border border-border-subtle',
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stack geral (todos exceto push/fold) */}
      {showGeneralStack && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">
            Stack Hero
            {scenario === 'open_raise' && heroStack < 100 && (
              <span className="ml-1 text-accent-gold normal-case">— range ajustado</span>
            )}
          </span>
          <div className="flex flex-wrap gap-1">
            {STACK_OPTIONS.map(s => (
              <button
                key={s}
                onClick={() => setHeroStack(s)}
                className={cn(
                  'px-2 py-1 rounded text-[10px] font-mono font-bold transition-colors',
                  heroStack === s
                    ? 'bg-accent-emerald/80 text-bg-base'
                    : 'bg-bg-base text-text-muted hover:text-text-primary border border-border-subtle',
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-text-muted font-body">BBs</span>
        </div>
      )}

      {/* Villain */}
      {showVillain && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Villain abriu de</span>
          <div className="flex flex-wrap gap-1">
            {VILLAIN_POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => setVillainPos(pos)}
                className={cn(
                  'px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors',
                  villainPos === pos
                    ? 'bg-accent-crimson/80 text-white'
                    : 'bg-bg-base text-text-muted hover:text-text-primary border border-border-subtle',
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stack Push/Fold */}
      {showPushFoldStack && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] text-text-muted uppercase tracking-wider font-body">Stack Push/Fold</span>
          <div className="flex gap-1">
            <button
              onClick={() => setStackIsShort(true)}
              className={cn(
                'flex-1 py-1 rounded text-[10px] font-mono font-bold transition-colors',
                stackIsShort
                  ? 'bg-accent-gold text-bg-base'
                  : 'bg-bg-base text-text-muted hover:text-text-primary border border-border-subtle',
              )}
            >
              ≤12 BB
            </button>
            <button
              onClick={() => setStackIsShort(false)}
              className={cn(
                'flex-1 py-1 rounded text-[10px] font-mono font-bold transition-colors',
                !stackIsShort
                  ? 'bg-accent-gold text-bg-base'
                  : 'bg-bg-base text-text-muted hover:text-text-primary border border-border-subtle',
              )}
            >
              13–20 BB
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile (<md): grid em cima, filtros embaixo */}
      <div className="md:hidden flex flex-col gap-4">
        <RangeGrid range={rangeMap} cellSize="xs" showLegend={true} />
        <div className="border-t border-border-subtle pt-4">
          {filters}
        </div>
      </div>

      {/* Tablet + Desktop (md+): grid à esquerda, filtros à direita */}
      <div className="hidden md:flex md:gap-6 md:items-start">
        <div className="flex-1 min-w-0">
          <RangeGrid range={rangeMap} cellSize="sm" showLegend={true} />
        </div>
        <div className="w-[210px] shrink-0 border-l border-border-subtle pl-5">
          {filters}
        </div>
      </div>
    </>
  )
}
