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
  getValidVillainPositions,
  preflopIdx,
} from '../src/data/ranges'

import {
  generateHandGrid,
  generateRandomCards,
  evaluatePostflopHand,
  analyzeBoardTexture,
  getGTODecision,
} from '../src/lib/poker'
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
  if (scenario === '3bet') {
    const threeBet = THREE_BET_RANGES[position] || []
    if (threeBet.includes(hand)) return '3bet'
    const defenseRange = position === 'BB'
      ? (BB_DEFENSE_RANGES[villainPos ?? 'BTN'] || [])
      : (getIPDefenseRange(position, villainPos ?? 'BTN') || [])
    if (defenseRange.includes(hand)) return 'call'
    return 'fold'
  }
  if (scenario === '4bet') {
    const fourBet = FOUR_BET_RANGES[position] || []
    if (fourBet.includes(hand)) return '4bet'
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
console.log('🔍 Auditoria 1/6: Bank questions vs fórmula dinâmica (pré-flop)...')

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
console.log('🔍 Auditoria 2/6: Grid coloring vs correctAction (pré-flop)...')

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
// AUDITORIA 2.3: VALIDADE DE COMBOS hero/villain
// Hero != villain. Para call_rfi/3bet/squeeze, hero age depois do villain.
// Para 4bet, hero age antes do villain.
// ============================================================
console.log('🔍 Auditoria 3/6: Validade hero/villain (mesma posição? ordem preflop?)...')

const SCENARIOS_WITH_VILLAIN = ['call_rfi', 'bb_defense', '3bet', '4bet', 'squeeze']

// 1. Auditoria dos bank questions
for (const q of DRILL_QUESTIONS) {
  if (!SCENARIOS_WITH_VILLAIN.includes(q.scenario as string)) continue
  if (!q.villainPosition) continue

  // Mesma posição?
  if (q.position === q.villainPosition) {
    add({
      severity: 'critical',
      type: 'hero_villain_same_position',
      hand: q.hand, position: q.position, villainPos: q.villainPosition,
      scenario: q.scenario as Scenario,
      details: `Bank ${q.id}: hero e villain ambos em ${q.position}.`,
    })
    continue
  }

  // Ordem preflop correta?
  const heroIdx = preflopIdx(q.position)
  const vilIdx = preflopIdx(q.villainPosition)
  if (q.scenario === 'call_rfi' || q.scenario === '3bet' || q.scenario === 'squeeze') {
    // Hero deve agir DEPOIS do villain
    if (heroIdx <= vilIdx) {
      add({
        severity: 'critical',
        type: 'hero_villain_invalid_order',
        hand: q.hand, position: q.position, villainPos: q.villainPosition,
        scenario: q.scenario as Scenario,
        details: `Bank ${q.id}: hero ${q.position} (preflop idx ${heroIdx}) deveria agir DEPOIS do villain ${q.villainPosition} (idx ${vilIdx}).`,
      })
    }
  } else if (q.scenario === '4bet') {
    // Hero abriu, villain 3-betou — villain age depois
    if (vilIdx <= heroIdx) {
      add({
        severity: 'critical',
        type: 'hero_villain_invalid_order',
        hand: q.hand, position: q.position, villainPos: q.villainPosition,
        scenario: q.scenario as Scenario,
        details: `Bank ${q.id}: 4bet — villain ${q.villainPosition} (idx ${vilIdx}) deveria agir DEPOIS do hero ${q.position} (idx ${heroIdx}).`,
      })
    }
  } else if (q.scenario === 'bb_defense') {
    if (q.position !== 'BB') {
      add({
        severity: 'critical', type: 'bb_defense_wrong_hero',
        hand: q.hand, position: q.position, villainPos: q.villainPosition,
        scenario: q.scenario as Scenario,
        details: `Bank ${q.id}: bb_defense exige hero=BB, mas hero=${q.position}.`,
      })
    }
    if (q.villainPosition === 'BB') {
      add({
        severity: 'critical', type: 'bb_defense_wrong_villain',
        hand: q.hand, position: q.position, villainPos: q.villainPosition,
        scenario: q.scenario as Scenario,
        details: `Bank ${q.id}: bb_defense exige villain ≠ BB.`,
      })
    }
  }
}

// 2. Sampling: gera 50 combos aleatórios e verifica se getValidVillainPositions cobre todos
let invalidCombosFound = 0
for (let i = 0; i < 50; i++) {
  const scenario = SCENARIOS_WITH_VILLAIN[Math.floor(Math.random() * SCENARIOS_WITH_VILLAIN.length)]
  const heroPositions: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
  const hero = heroPositions[Math.floor(Math.random() * heroPositions.length)]
  const validVillains = getValidVillainPositions(scenario, hero, '6max')
  if (validVillains.includes(hero)) {
    invalidCombosFound++
    add({
      severity: 'critical', type: 'helper_returns_same_position',
      hand: 'N/A', position: hero, villainPos: hero,
      scenario: scenario as Scenario,
      details: `getValidVillainPositions retornou ${hero} (mesmo que hero) para ${scenario} hero=${hero}.`,
    })
  }
}

// ============================================================
// AUDITORIA 2.5: STACK ADJUSTMENT — confere que TODOS os cenários
// (exceto push_fold) usam applyStackAdjustment para ajustar com heroStack
// ============================================================
console.log('🔍 Auditoria 4/6: Stack adjustment em todos os cenários (pré-flop)...')

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
console.log('🔍 Auditoria 5/6: 100 spots aleatórios (pré-flop)...')

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
// AUDITORIA 4: PÓS-FLOP — vulnerabilidades de board + sizing GTO
// Gera 300 spots aleatórios e verifica:
//  - Vulnerability flags disparam quando deveriam (straight/flush/FH on board)
//  - Mão "nutada" em board vulnerável NÃO recomenda bet_pot/bet_75
//  - primaryAction sempre tem freq >= alternativeAction (após normalizeGtoDecision)
//  - alsoAcceptable não duplica primary/alternative
// ============================================================
console.log('🔍 Auditoria 6/6: Pós-flop (vulnerabilidades + sizing GTO)...')

const POSTFLOP_VULNERABLE_CATEGORIES = ['set', 'trips', 'two_pair', 'overpair', 'tptk', 'tpgk', 'tpwk']
const DANGEROUS_NUT_SIZINGS: string[] = ['bet_75', 'bet_pot']  // não devem aparecer como primary em spots vulneráveis

let postflopChecks = 0
const POSTFLOP_SAMPLE = 300

for (let i = 0; i < POSTFLOP_SAMPLE; i++) {
  const board = generateRandomCards(5)
  if (board.length < 5) continue
  const heroCards = generateRandomCards(2, board) as any
  if (heroCards.length < 2) continue

  const texture = analyzeBoardTexture(board)
  const handEval = evaluatePostflopHand([heroCards[0], heroCards[1]], board)
  const heroPosition: 'IP' | 'OOP' = Math.random() < 0.5 ? 'IP' : 'OOP'
  const potType: 'SRP' | '3bet' = Math.random() < 0.5 ? 'SRP' : '3bet'
  const facingBet = Math.random() < 0.5
  const decision = getGTODecision(handEval, texture, heroPosition, potType, facingBet, 'river', 10)
  postflopChecks++

  // ---- 1. Normalização primary/alternative ----
  // Após normalizeGtoDecision, primaryFrequency deve ser >= alternativeFrequency
  if (decision.alternativeAction && (decision.alternativeFrequency ?? 0) > decision.primaryFrequency) {
    add({
      severity: 'critical',
      type: 'postflop_freq_inverted',
      hand: `${heroCards[0].rank}${heroCards[0].suit}-${heroCards[1].rank}${heroCards[1].suit}`,
      position: heroPosition as any,
      scenario: 'open_raise' as Scenario,
      details: `[postflop] primary=${decision.primaryAction} ${decision.primaryFrequency}, alt=${decision.alternativeAction} ${decision.alternativeFrequency}. Normalize falhou.`,
    })
  }

  // ---- 2. alsoAcceptable não pode incluir primary nem alternative ----
  if (decision.alsoAcceptable) {
    for (const acc of decision.alsoAcceptable) {
      if (acc === decision.primaryAction || acc === decision.alternativeAction) {
        add({
          severity: 'warning',
          type: 'postflop_also_duplicates',
          hand: `${heroCards[0].rank}-${heroCards[1].rank}`,
          position: heroPosition as any,
          scenario: 'open_raise' as Scenario,
          details: `[postflop] alsoAcceptable inclui ${acc} que já é primary/alt.`,
        })
        break
      }
    }
  }

  // ---- 3. Spots vulneráveis NÃO devem recomendar bet grande pra hero abaixo de FH ----
  const isVulnBoard = texture.straightOnBoard || texture.monotone || texture.boardTrips || texture.boardDoublePaired
  const heroBelowFH = POSTFLOP_VULNERABLE_CATEGORIES.includes(handEval.category)
  if (isVulnBoard && heroBelowFH && DANGEROUS_NUT_SIZINGS.includes(decision.primaryAction)) {
    const why = texture.straightOnBoard ? 'straight no board'
      : texture.monotone ? 'monotone'
      : texture.boardTrips ? 'trinca no board'
      : 'duplo pareado'
    add({
      severity: 'critical',
      type: 'postflop_pot_bet_on_vuln_board',
      hand: `${heroCards[0].rank}${heroCards[1].rank} (${handEval.category})`,
      position: heroPosition as any,
      scenario: 'open_raise' as Scenario,
      details: `[postflop] ${heroPosition} ${potType} — board ${why}, hero ${handEval.category}, mas primary=${decision.primaryAction}. Pot control esperado (bet_33/50/check).`,
    })
  }

  // ---- 4. handEval.vulnerableFH só pode ser true se categoria é full_house ----
  if (handEval.vulnerableFH && handEval.category !== 'full_house') {
    add({
      severity: 'warning',
      type: 'postflop_vulnerable_fh_wrong_category',
      hand: `${heroCards[0].rank}-${heroCards[1].rank}`,
      position: heroPosition as any,
      scenario: 'open_raise' as Scenario,
      details: `[postflop] vulnerableFH=true mas category=${handEval.category}, esperado full_house.`,
    })
  }
}

console.log(`   ${postflopChecks} spots pós-flop checados.`)

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
  // Ordena por severidade: critical → warning → info, depois alfabético
  const ordered = items.slice().sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 } as const
    const sa = sev[a.severity], sb = sev[b.severity]
    return sa - sb || a.scenario.localeCompare(b.scenario)
  })
  console.log(`\n--- ${type} (${items.length}) ---`)
  const showLimit = items.some(i => i.severity !== 'info') ? items.length : 15
  for (const f of ordered.slice(0, showLimit)) {
    const sev = f.severity === 'critical' ? '🔴' : f.severity === 'warning' ? '🟡' : '🔵'
    console.log(`${sev} [${f.scenario}] ${f.hand} ${f.position}${f.villainPos ? ` vs ${f.villainPos}` : ''}`)
    console.log(`   ${f.details}`)
  }
  if (ordered.length > showLimit) console.log(`   ... e mais ${ordered.length - showLimit} casos (info)`)
}

console.log('\n' + '='.repeat(70))
console.log(findings.length === 0 ? '✅ Tudo consistente!' : `⚠️ ${findings.length} inconsistências encontradas`)
console.log('='.repeat(70))
