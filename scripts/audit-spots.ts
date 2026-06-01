// ============================================================
// AUDITORIA AUTOMÁTICA DE SPOTS PRÉ-FLOP
// Percorre o banco de questões + simula spots aleatórios e reporta
// inconsistências entre grid, bank correctAction, fórmula e EV.
// Rodar: npm run audit
// ============================================================

import {
  DRILL_QUESTIONS,
  OPEN_RAISE_RANGES,
  THREE_BET_RANGES,
  BB_DEFENSE_RANGES,
  FOUR_BET_RANGES,
  SQUEEZE_RANGES,
  PUSH_FOLD_RANGES,
  SB_VS_BB_RAISE_RANGES,
  SB_VS_BB_LIMP_RANGES,
  BB_VS_SB_3BET_RANGES,
  MARGINAL_HANDS,
  getOpenRaiseRange,
  getIPDefenseRange,
} from '../src/data/ranges'

import { generateHandGrid } from '../src/lib/poker'
import type { Position, Action } from '../src/types'

type Scenario = 'open_raise' | 'push_fold' | '3bet' | 'bb_defense' | 'call_rfi' | '4bet' | 'squeeze' | 'sb_vs_bb'

const ALL_HANDS = generateHandGrid().flat()
const RNG = () => Math.random()
const randomFrom = <T>(arr: T[]) => arr[Math.floor(RNG() * arr.length)]

// ---- replicação da lógica do PreflopTrainer ----

function resolveBBDefenseRange(villainPos: Position): string[] {
  const direct = BB_DEFENSE_RANGES[villainPos] || []
  if (direct.length > 0) return direct
  return BB_DEFENSE_RANGES['UTG'] || []
}

// Espelho do applyStackAdjustment do PreflopTrainer
function applyStackAdjustment(range: string[], heroStack: number): string[] {
  if (heroStack >= 100) return range
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
  const removals = heroStack <= 40 ? removalsVeryShort
    : heroStack <= 60 ? removalsShort
    : heroStack <= 80 ? removalsMid : []
  return range.filter(h => !removals.includes(h))
}

function getRangeForScenario(
  scenario: Scenario,
  position: Position,
  stackDepth: number,
  villainPos: Position
): string[] {
  switch (scenario) {
    case 'open_raise':
      if (position === 'BB') return resolveBBDefenseRange(villainPos)
      return getOpenRaiseRange('6max', position)
    case 'push_fold': {
      const depth = stackDepth <= 12 ? 10 : 15
      return (PUSH_FOLD_RANGES[depth] ?? {})[position] || []
    }
    case '3bet': return THREE_BET_RANGES[position] || []
    case 'bb_defense': return resolveBBDefenseRange(villainPos)
    case 'call_rfi':
      if (position === 'BB') return resolveBBDefenseRange(villainPos)
      const ipDefense = getIPDefenseRange(position, villainPos)
      if (ipDefense) return ipDefense
      return getOpenRaiseRange('6max', position)
    case '4bet': return FOUR_BET_RANGES[position] || []
    case 'squeeze': return SQUEEZE_RANGES[position] || []
    case 'sb_vs_bb': return SB_VS_BB_RAISE_RANGES
    default: return []
  }
}

function getCorrectActionForScenario(
  scenario: Scenario,
  isInRange: boolean,
  hand: string,
  position: Position,
  villainPos?: Position
): Action {
  if (scenario === 'sb_vs_bb') {
    if (isInRange) return 'raise'
    if (SB_VS_BB_LIMP_RANGES.includes(hand)) return 'limp'
    return 'fold'
  }
  if (scenario === 'squeeze') {
    const squeezeRange = SQUEEZE_RANGES[position] || []
    if (squeezeRange.includes(hand)) return '3bet'
    const openRange = OPEN_RAISE_RANGES[position] || []
    if (openRange.includes(hand)) return 'call'
    return 'fold'
  }
  if (!isInRange) return 'fold'
  switch (scenario) {
    case 'push_fold': return 'jam'
    case '3bet': return '3bet'
    case '4bet': return '4bet'
    case 'bb_defense':
    case 'call_rfi': {
      const threeBetRange =
        (position === 'BB' && villainPos === 'SB') ? BB_VS_SB_3BET_RANGES
        : (THREE_BET_RANGES[position] || [])
      return threeBetRange.includes(hand) ? '3bet' : 'call'
    }
    default: return 'raise'
  }
}

// ---- TIPOS DE INCONSISTÊNCIA ----
interface Finding {
  severity: 'critical' | 'warning' | 'info'
  type: string
  hand: string
  position: Position
  villainPos?: Position
  scenario: Scenario
  details: string
}

const findings: Finding[] = []

function add(f: Finding) {
  findings.push(f)
}

// ============================================================
// AUDITORIA 1: BANK QUESTIONS vs FÓRMULA DINÂMICA
// ============================================================
console.log('🔍 Auditoria 1/3: Bank questions vs fórmula dinâmica...')

for (const q of DRILL_QUESTIONS) {
  const sc = q.scenario as Scenario
  const villainPos = (q.villainPosition || 'BTN') as Position
  const range = getRangeForScenario(sc, q.position, q.heroStack, villainPos)
  const isInRange = range.includes(q.hand)
  const dynamicAction = getCorrectActionForScenario(sc, isInRange, q.hand, q.position, villainPos)

  // Diferença entre bank e fórmula
  if (q.correctAction !== dynamicAction) {
    // Aceitável se for spot de mistura (correctFrequency < 0.85)
    const isMix = (q.correctFrequency ?? 1) < 0.85
    add({
      severity: isMix ? 'info' : 'warning',
      type: 'bank_vs_formula_mismatch',
      hand: q.hand, position: q.position, villainPos,
      scenario: sc,
      details: `Bank correctAction=${q.correctAction} (freq ${q.correctFrequency}), fórmula diz ${dynamicAction}. ${isMix ? 'Mix GTO esperado.' : '⚠️ Conflito hard.'}`,
    })
  }

  // EV data contradiz o próprio correctAction
  if (q.evComparison) {
    const evs = Object.entries(q.evComparison)
    const sorted = evs.sort(([, a], [, b]) => (b as number) - (a as number))
    const topAction = sorted[0][0]
    const topEv = sorted[0][1] as number
    // Mapeamento bank EV → action
    const evToAction: Record<string, string> = { raise: '3bet|4bet|raise|jam', call: 'call', fold: 'fold' }
    const matchesPattern = (corrAction: string, evKey: string) => {
      const accepted = (evToAction[evKey] ?? evKey).split('|')
      return accepted.includes(corrAction)
    }
    if (!matchesPattern(q.correctAction, topAction) && topEv > 0 && (q.correctFrequency ?? 1) >= 0.85) {
      add({
        severity: 'warning',
        type: 'bank_ev_inconsistent',
        hand: q.hand, position: q.position, villainPos,
        scenario: sc,
        details: `correctAction=${q.correctAction}, mas EV max é "${topAction}" com +${topEv} BB e freq ${q.correctFrequency} (>=0.85 → não é mix).`,
      })
    }
  }
}

// ============================================================
// AUDITORIA 2: GRID COLORING vs CORRECT ACTION (call_rfi/bb_defense)
// ============================================================
console.log('🔍 Auditoria 2/3: Grid coloring vs correctAction...')

const RFI_SCENARIOS: Scenario[] = ['call_rfi', 'bb_defense']
const HERO_POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
const OPENERS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB']

for (const scenario of RFI_SCENARIOS) {
  const validHeroes: Position[] = scenario === 'bb_defense' ? ['BB'] : HERO_POSITIONS
  for (const hero of validHeroes) {
    for (const villainPos of OPENERS) {
      if (hero === villainPos) continue
      const range = getRangeForScenario(scenario, hero, 100, villainPos)
      for (const hand of range) {
        const threeBetRange =
          (hero === 'BB' && villainPos === 'SB') ? BB_VS_SB_3BET_RANGES
          : (THREE_BET_RANGES[hero] || [])
        const gridColor: Action = threeBetRange.includes(hand) ? '3bet' : 'call'
        const dynamicAction = getCorrectActionForScenario(scenario, true, hand, hero, villainPos)
        if (gridColor !== dynamicAction) {
          add({
            severity: 'critical',
            type: 'grid_vs_action_mismatch',
            hand, position: hero, villainPos, scenario,
            details: `Grid colore como ${gridColor}, mas getCorrectActionForScenario retorna ${dynamicAction}.`,
          })
        }
      }
    }
  }
}

// ============================================================
// AUDITORIA 2.5: STACK ADJUSTMENT — confere que TODOS os cenários
// (exceto push_fold) usam applyStackAdjustment para ajustar com heroStack
// ============================================================
console.log('🔍 Auditoria 2.5/4: Stack adjustment em todos os cenários...')

// Replica EXATAMENTE o path do PreflopTrainer.
// Se o effective range em 50bb for IGUAL ao em 100bb (e tiver mãos especulativas),
// significa que esse cenário NÃO está aplicando stack adjustment.
function preflopTrainerEffectiveRange(scenario: Scenario, position: Position, villainPos: Position, heroStack: number): string[] {
  const base = getRangeForScenario(scenario, position, 100, villainPos)
  return scenario !== 'push_fold' ? applyStackAdjustment(base, heroStack) : base
}

// Mãos especulativas que SOMEM em stack 50bb (per applyStackAdjustment)
const SHALLOW_STACK_VICTIMS = ['A4s','A5s','22','33','44','76s','87s','65s','K5s','K6s']

const STACK_CHECK_SCENARIOS: Scenario[] = ['open_raise', '3bet', '4bet', 'bb_defense', 'call_rfi', 'squeeze', 'sb_vs_bb']
for (const scenario of STACK_CHECK_SCENARIOS) {
  const positions: Position[] = scenario === 'bb_defense' ? ['BB']
    : scenario === 'sb_vs_bb' ? ['SB']
    : ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
  for (const hero of positions) {
    for (const villainPos of ['UTG', 'CO', 'BTN'] as Position[]) {
      const r100 = preflopTrainerEffectiveRange(scenario, hero, villainPos, 100)
      const r50 = preflopTrainerEffectiveRange(scenario, hero, villainPos, 50)
      // Se range em 50bb é IDÊNTICO ao de 100bb E o range tinha mãos especulativas,
      // o stack adjustment NÃO foi aplicado.
      const hadSpec = r100.some(h => SHALLOW_STACK_VICTIMS.includes(h))
      const unchanged = r100.length === r50.length && r100.every(h => r50.includes(h))
      if (hadSpec && unchanged) {
        add({
          severity: 'critical',
          type: 'stack_adjustment_missing',
          hand: 'N/A', position: hero, villainPos, scenario,
          details: `${scenario} ${hero} vs ${villainPos}: range em 50bb é idêntico ao 100bb — stack adjustment não aplicado.`,
        })
      }
    }
  }
}

// ============================================================
// AUDITORIA 3: 100 SPOTS ALEATÓRIOS (cobre paths não testados acima)
// ============================================================
console.log('🔍 Auditoria 3/3: 100 spots aleatórios...')

const SAMPLE_COUNT = 100
const SAMPLE_SCENARIOS: Scenario[] = ['open_raise', 'push_fold', '3bet', '4bet', 'bb_defense', 'call_rfi', 'squeeze', 'sb_vs_bb']

for (let i = 0; i < SAMPLE_COUNT; i++) {
  const scenario = randomFrom(SAMPLE_SCENARIOS)
  let heroPos: Position
  let villainPos: Position = randomFrom(OPENERS)

  if (scenario === 'bb_defense') heroPos = 'BB'
  else if (scenario === 'sb_vs_bb') { heroPos = 'SB'; villainPos = 'BB' }
  else heroPos = randomFrom(HERO_POSITIONS)

  const hand = randomFrom(ALL_HANDS)
  const stack = scenario === 'push_fold' ? randomFrom([8, 10, 12, 15, 20]) : 100
  const range = getRangeForScenario(scenario, heroPos, stack, villainPos)
  const isInRange = range.includes(hand)
  const dynamicAction = getCorrectActionForScenario(scenario, isInRange, hand, heroPos, villainPos)

  // Procura por bank questions equivalentes
  const matching = DRILL_QUESTIONS.find(q =>
    q.scenario === scenario && q.position === heroPos && q.hand === hand &&
    (!q.villainPosition || q.villainPosition === villainPos)
  )
  if (matching && matching.correctAction !== dynamicAction) {
    const isMix = (matching.correctFrequency ?? 1) < 0.85
    add({
      severity: isMix ? 'info' : 'critical',
      type: 'sampled_bank_dynamic_mismatch',
      hand, position: heroPos, villainPos, scenario,
      details: `Sample #${i}: bank ${matching.id} diz ${matching.correctAction} (freq ${matching.correctFrequency}), fórmula diz ${dynamicAction}.`,
    })
  }
}

// ============================================================
// RELATÓRIO FINAL
// ============================================================
console.log('\n' + '='.repeat(70))
console.log('📊 RELATÓRIO DE AUDITORIA')
console.log('='.repeat(70))

const byType = findings.reduce<Record<string, Finding[]>>((acc, f) => {
  acc[f.type] = acc[f.type] || []
  acc[f.type].push(f)
  return acc
}, {})

const bySeverity = findings.reduce<Record<string, number>>((acc, f) => {
  acc[f.severity] = (acc[f.severity] || 0) + 1
  return acc
}, {})

console.log(`\nTotal: ${findings.length} findings`)
console.log(`  Critical: ${bySeverity.critical || 0}`)
console.log(`  Warning:  ${bySeverity.warning || 0}`)
console.log(`  Info:     ${bySeverity.info || 0}`)

for (const [type, items] of Object.entries(byType)) {
  console.log(`\n--- ${type} (${items.length}) ---`)
  for (const f of items.slice(0, 15)) {
    const sev = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵'
    console.log(`${sev} [${f.scenario}] ${f.hand} ${f.position}${f.villainPos ? ` vs ${f.villainPos}` : ''}`)
    console.log(`   ${f.details}`)
  }
  if (items.length > 15) console.log(`   ... e mais ${items.length - 15} casos`)
}

console.log('\n' + '='.repeat(70))
console.log(findings.length === 0 ? '✅ Tudo consistente!' : `⚠️ ${findings.length} inconsistências encontradas`)
console.log('='.repeat(70))
