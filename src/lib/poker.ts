// ============================================================
// POKERMIND PRO — BIBLIOTECA DE LÓGICA DE POKER
// Funções core: combos, ranges, equities, EV, ICM
// ============================================================

import { Rank, Suit, Card, Action, RangeMatrix } from '@/types'

// ------- CONSTANTES -------
export const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣'
}
export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#c8d0e8', hearts: '#ff3d5a', diamonds: '#ff3d5a', clubs: '#c8d0e8'
}

// ------- RANK UTILS -------
export const rankIndex = (r: Rank): number => RANKS.indexOf(r)
export const rankValue = (r: Rank): number => RANKS.length - RANKS.indexOf(r) // A=13, 2=1

// ------- CONTAGEM DE COMBOS -------
/**
 * Retorna o número de combos de uma mão específica
 * Pares: 6 combos | Suited: 4 combos | Offsuit: 12 combos
 */
export function countCombos(hand: string): number {
  if (hand.length === 2) return 6       // Par (ex: AA)
  if (hand.endsWith('s')) return 4      // Suited (ex: AKs)
  if (hand.endsWith('o')) return 12     // Offsuit (ex: AKo)
  return 16                             // Ambos (suited + offsuit)
}

/**
 * Total de combos de um array de mãos
 */
export function totalCombos(hands: string[]): number {
  return hands.reduce((acc, h) => acc + countCombos(h), 0)
}

// ------- PARSER DE RANGES -------
/**
 * Converte string de range em array de mãos
 * Ex: "AA,KK,AKs,AKo" → ["AA","KK","AKs","AKo"]
 * Ex: "66+" → ["66","77","88","99","TT","JJ","QQ","KK","AA"]
 */
export function parseRange(rangeStr: string): string[] {
  if (!rangeStr) return []
  const hands: string[] = []
  const parts = rangeStr.split(',').map(s => s.trim())

  for (const part of parts) {
    if (part.includes('+')) {
      const base = part.replace('+', '')
      const expanded = expandPlus(base)
      hands.push(...expanded)
    } else if (part.includes('-')) {
      const [start, end] = part.split('-')
      const expanded = expandRange(start, end)
      hands.push(...expanded)
    } else {
      hands.push(part)
    }
  }

  return [...new Set(hands)]
}

function expandPlus(hand: string): string[] {
  const results: string[] = []
  if (hand.length === 2 && hand[0] === hand[1]) {
    // Par: 66+ → 66,77,88,...,AA
    const idx = RANKS.indexOf(hand[0] as Rank)
    for (let i = idx; i >= 0; i--) {
      results.push(RANKS[i] + RANKS[i])
    }
  } else {
    // Suited/offsuit: A2s+ → A2s,A3s,...,AKs
    // RANKS está em ordem decrescente (A=0, K=1, ..., 2=12). r2Idx > r1Idx.
    // Iteramos de r2Idx (carta menor) descendo até r1Idx+1 (carta maior que r1 é o próprio r1).
    const suffix = hand.slice(-1) === 's' || hand.slice(-1) === 'o' ? hand.slice(-1) : ''
    const r1 = hand[0] as Rank
    const r2 = hand[1] as Rank
    const r2Idx = RANKS.indexOf(r2)
    const r1Idx = RANKS.indexOf(r1)
    // Iteração correta: de r2Idx descendo até r1Idx+1 (exclui r1, mesma carta)
    for (let i = r2Idx; i > r1Idx; i--) {
      results.push(r1 + RANKS[i] + suffix)
    }
  }
  return results
}

function expandRange(start: string, end: string): string[] {
  const results: string[] = []
  // Caso especial: pares "66-99" (ambas cartas iguais em start e end)
  if (start.length === 2 && start[0] === start[1] && end.length === 2 && end[0] === end[1]) {
    const startIdx = RANKS.indexOf(start[0] as Rank)
    const endIdx = RANKS.indexOf(end[0] as Rank)
    for (let i = Math.min(startIdx, endIdx); i <= Math.max(startIdx, endIdx); i++) {
      results.push(RANKS[i] + RANKS[i])
    }
    return results
  }
  const suffix = start.slice(-1) === 's' || start.slice(-1) === 'o' ? start.slice(-1) : ''
  const startR2 = start[1] as Rank
  const endR2 = end[1] as Rank
  const r1 = start[0] as Rank
  const startIdx = RANKS.indexOf(startR2)
  const endIdx = RANKS.indexOf(endR2)

  for (let i = Math.min(startIdx, endIdx); i <= Math.max(startIdx, endIdx); i++) {
    results.push(r1 + RANKS[i] + suffix)
  }
  return results
}

// ------- GERAÇÃO DO GRID 13x13 -------
/**
 * Gera todas as 169 mãos únicas no formato do grid (AAs, AKs, AKo, etc.)
 */
export function generateHandGrid(): string[][] {
  const grid: string[][] = []
  for (let i = 0; i < 13; i++) {
    const row: string[] = []
    for (let j = 0; j < 13; j++) {
      if (i === j) {
        row.push(RANKS[i] + RANKS[j]) // Par
      } else if (i < j) {
        row.push(RANKS[i] + RANKS[j] + 's') // Suited (acima da diagonal)
      } else {
        row.push(RANKS[j] + RANKS[i] + 'o') // Offsuit (abaixo da diagonal)
      }
    }
    grid.push(row)
  }
  return grid
}

// ------- EQUITY SIMPLIFICADA -------
/**
 * Equity simplificada baseada em tabelas pré-calculadas
 * Para uso educacional — não é um solver real
 */
export function estimateEquity(heroHand: string, villainRange: string[]): number {
  // Tabela simplificada de equities de mãos específicas vs ranges comuns
  const equityTable: Record<string, number> = {
    'AA': 0.85, 'KK': 0.82, 'QQ': 0.79, 'JJ': 0.76, 'TT': 0.72,
    '99': 0.69, '88': 0.65, '77': 0.61, '66': 0.57, '55': 0.54,
    'AKs': 0.67, 'AQs': 0.65, 'AJs': 0.63, 'ATs': 0.61,
    'AKo': 0.65, 'AQo': 0.63, 'AJo': 0.60,
    'KQs': 0.61, 'KJs': 0.59, 'KTs': 0.57,
    'QJs': 0.58, 'QTs': 0.56, 'JTs': 0.55,
    'T9s': 0.52, '98s': 0.50, '87s': 0.48,
  }

  const baseEquity = equityTable[heroHand] ?? 0.45
  // Ajuste simples baseado no tamanho do range do villain
  const rangeSize = villainRange.length
  const adjustment = rangeSize > 50 ? 0.03 : rangeSize > 30 ? 0 : -0.03
  return Math.max(0.1, Math.min(0.95, baseEquity + adjustment))
}

// ------- CÁLCULO DE EV -------
export interface EVInputs {
  potSize: number
  callAmount: number
  equity: number
  foldEquity?: number
}

export function calculateCallEV({ potSize, callAmount, equity }: EVInputs): number {
  return (equity * (potSize + callAmount)) - ((1 - equity) * callAmount)
}

export function calculateRaiseEV({ potSize, callAmount, equity, foldEquity = 0.4 }: EVInputs): number {
  const raiseSize = callAmount * 2.5
  const winWhenFold = foldEquity * potSize
  const winWhenCall = (1 - foldEquity) * equity * (potSize + raiseSize)
  const loseWhenCall = (1 - foldEquity) * (1 - equity) * raiseSize
  return winWhenFold + winWhenCall - loseWhenCall
}

// ------- POT ODDS -------
export function potOdds(callAmount: number, potSize: number): number {
  return callAmount / (potSize + callAmount)
}

export function breakEvenEquity(callAmount: number, potSize: number): number {
  return potOdds(callAmount, potSize)
}

// ------- MDF (MINIMUM DEFENSE FREQUENCY) -------
export function minimumDefenseFrequency(betSize: number, potSize: number): number {
  return potSize / (potSize + betSize)
}

// ------- SPR -------
export function spr(effectiveStack: number, potSize: number): number {
  return effectiveStack / potSize
}

// ------- FOLD EQUITY -------
export function foldEquityNeeded(betSize: number, potSize: number, equity: number): number {
  // Mínimo de fold equity necessário para que o bluff seja lucrativo
  const totalRisk = betSize
  const reward = potSize
  return (totalRisk - equity * (potSize + betSize)) / reward
}

// ------- ICM SIMPLIFICADO -------
/**
 * Calcula valores ICM usando o modelo Malmuth-Harville simplificado
 */
export function calculateICM(stacks: number[], payouts: number[]): number[] {
  const totalChips = stacks.reduce((a, b) => a + b, 0)
  const n = stacks.length
  const icmValues = new Array(n).fill(0)

  function calcICMRecursive(
    remainingPayouts: number[],
    remainingPlayers: number[],
    probability: number
  ): void {
    if (remainingPayouts.length === 0 || remainingPlayers.length === 0) return

    const payout = remainingPayouts[0]
    const chipsLeft = remainingPlayers.reduce((a, i) => a + stacks[i], 0)

    for (const playerIdx of remainingPlayers) {
      const prob = probability * (stacks[playerIdx] / chipsLeft)
      icmValues[playerIdx] += prob * payout

      const nextPlayers = remainingPlayers.filter(i => i !== playerIdx)
      calcICMRecursive(remainingPayouts.slice(1), nextPlayers, prob)
    }
  }

  const playerIndices = stacks.map((_, i) => i)
  calcICMRecursive(payouts, playerIndices, 1)
  return icmValues
}

// ------- OUTS E EQUITY COM OUTS -------
export function outsToEquity(outs: number, street: 'flop' | 'turn'): number {
  // Regra dos 4 e dos 2
  const multiplier = street === 'flop' ? 4 : 2
  return Math.min(outs * multiplier / 100, 0.95)
}

// ------- RANDOMIZAÇÃO PARA DRILLS -------
export function randomAction(actions: { action: Action; frequency: number }[]): Action {
  const rand = Math.random()
  let cumulative = 0
  for (const { action, frequency } of actions) {
    cumulative += frequency
    if (rand <= cumulative) return action
  }
  return actions[actions.length - 1].action
}

// ------- GERAÇÃO DE MÃO ALEATÓRIA -------
export function randomHand(): string {
  const grid = generateHandGrid()
  const allHands: string[] = grid.flat()
  return allHands[Math.floor(Math.random() * allHands.length)]
}

export function randomHandFromRange(range: string[]): string {
  return range[Math.floor(Math.random() * range.length)]
}

// ------- CLASSIFICAÇÃO DA MÃO NO HEATMAP -------
export type HandStrength = 'premium' | 'strong' | 'medium' | 'speculative' | 'marginal' | 'weak'

export function classifyHandStrength(hand: string): HandStrength {
  const premiums = ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo']
  const strong = ['TT', '99', 'AQs', 'AQo', 'AJs', 'KQs']
  const medium = ['88', '77', 'ATs', 'AJo', 'KJs', 'QJs', 'KQo']
  const speculative = ['66', '55', '44', 'A9s', 'KTs', 'QTs', 'JTs', 'T9s']

  if (premiums.includes(hand)) return 'premium'
  if (strong.includes(hand)) return 'strong'
  if (medium.includes(hand)) return 'medium'
  if (speculative.includes(hand)) return 'speculative'

  const rank1 = RANKS.indexOf(hand[0] as Rank)
  if (rank1 <= 4) return 'marginal' // A-T range com kicker ruim
  return 'weak'
}

// ---- POSTFLOP HAND EVALUATOR ----

export type PostflopHandCategory =
  | 'quads' | 'full_house' | 'flush' | 'straight'
  | 'set' | 'trips' | 'two_pair'
  | 'overpair' | 'tptk' | 'tpgk' | 'tpwk'
  | 'middle_pair' | 'bottom_pair' | 'underpair'
  | 'draw_strong' | 'draw_medium' | 'draw_weak'
  | 'overcards' | 'air'

export interface PostflopHandEval {
  category: PostflopHandCategory
  label: string
  strength: number  // 0-100
  draws: string[]   // e.g. ['Flush Draw', 'Gutshot']
  description: string
}

export interface BoardTexture {
  wet: boolean
  dry: boolean
  paired: boolean
  monotone: boolean
  twoTone: boolean
  connected: boolean
  topRank: Rank
  topRankIdx: number
  label: string
}

export type GtoAction = 'check' | 'bet_33' | 'bet_50' | 'bet_67' | 'bet_75' | 'bet_pot' | 'fold' | 'call' | 'raise' | 'check_raise'

export interface GtoDecision {
  primaryAction: GtoAction
  primaryFrequency: number
  alternativeAction?: GtoAction
  alternativeFrequency?: number
  explanation: string
  checkRaiseCandidate?: boolean
}

// ---- TURN CARD CLASSIFICATION ----

export interface TurnCardInfo {
  type: 'gin' | 'scare' | 'blank'
  label: string
  reason: string
  completedDraws: string[]
  newThreats: string[]
}

export function classifyTurnCard(
  heroCards: [Card, Card],
  flopBoard: Card[],
  turnCard: Card,
  flopEval: PostflopHandEval
): TurnCardInfo {
  const flopDraws = flopEval.draws
  const completedDraws: string[] = []
  const newThreats: string[] = []
  const allTurnCards = [...heroCards, ...flopBoard, turnCard]
  const turnIdx = RANKS.indexOf(turnCard.rank)
  const flopIdxs = flopBoard.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b)

  // ---- GIN: draws do flop completadas ----
  if (flopDraws.includes('Flush Draw')) {
    const suitMap: Record<string, number> = {}
    for (const c of allTurnCards) suitMap[c.suit] = (suitMap[c.suit] || 0) + 1
    const heroFlush = Object.entries(suitMap).some(([suit, n]) =>
      n >= 5 && heroCards.some(c => c.suit === suit)
    )
    if (heroFlush) completedDraws.push('Flush Draw')
  }
  if (flopDraws.includes('OESD') || flopDraws.includes('Gutshot')) {
    if (detectStraight(heroCards, [...flopBoard, turnCard])) {
      completedDraws.push(flopDraws.includes('OESD') ? 'OESD → Straight!' : 'Gutshot → Straight!')
    }
  }
  if (flopEval.category === 'overcards') {
    if (heroCards.some(c => c.rank === turnCard.rank)) {
      completedDraws.push('Overcard virou par')
    }
  }
  if (completedDraws.length > 0) {
    return {
      type: 'gin',
      label: 'GIN! Você melhorou',
      reason: `Turn completou sua(s) draw(s): ${completedDraws.join(' + ')}. Agora é hora de construir o pot — aposte grande ou check-raise.`,
      completedDraws,
      newThreats: [],
    }
  }

  // ---- SCARE: carta que ameaça a mão do herói ----

  // 3ª carta do mesmo naipe → flush possível para villain
  const flopSuitCounts: Record<string, number> = {}
  for (const c of flopBoard) flopSuitCounts[c.suit] = (flopSuitCounts[c.suit] || 0) + 1
  const turnSuitOnBoard = (flopSuitCounts[turnCard.suit] || 0) + 1
  const heroHadFlushDraw = flopDraws.includes('Flush Draw')
  if (turnSuitOnBoard >= 3 && !heroHadFlushDraw) {
    newThreats.push('3ª carta do mesmo naipe — flush possível para villain')
  }

  // Overcard para o par/overpair do herói
  if (['tptk', 'tpgk', 'tpwk'].includes(flopEval.category) && turnIdx < flopIdxs[0]) {
    newThreats.push(`${turnCard.rank} supera sua top pair — você virou second pair`)
  }
  if (flopEval.category === 'overpair') {
    const heroRankIdx = RANKS.indexOf(heroCards[0].rank)
    if (turnIdx < heroRankIdx) {
      newThreats.push(`Overcard ${turnCard.rank} para seu sobre-par — villain pode ter hit top pair`)
    }
  }

  // Board pareado no turn
  if (flopBoard.some(c => c.rank === turnCard.rank)) {
    const strongMades = ['set', 'flush', 'straight', 'two_pair', 'full_house']
    if (strongMades.includes(flopEval.category)) {
      newThreats.push('Board pareou — full house possível para villain')
    } else {
      newThreats.push('Board pareou — mãos de valor médio perdem equidade')
    }
  }

  // Carta que conecta board (possível straight para villain)
  const turnsConnects = flopIdxs.some(fi => Math.abs(turnIdx - fi) <= 2)
  const isNewCard = !flopBoard.some(c => c.rank === turnCard.rank)
  if (turnsConnects && isNewCard && turnSuitOnBoard < 3) {
    newThreats.push(`${turnCard.rank} conecta com o flop — novos straight draws para villain`)
  }

  if (newThreats.length > 0) {
    return {
      type: 'scare',
      label: 'Scare Card',
      reason: `Turn complica o jogo: ${newThreats[0]}. ${newThreats.length > 1 ? 'Múltiplas ameaças presentes.' : ''} Reavalie sua linha — bluffs perdem valor, mãos de valor podem precisar proteger.`,
      completedDraws: [],
      newThreats,
    }
  }

  // ---- BLANK ----
  return {
    type: 'blank',
    label: 'Blank',
    reason: `Turn é uma carta neutra (${turnCard.rank}) que não muda significativamente a textura. Continue com a linha do flop, mas use sizings maiores — pot maior e ranges mais polarizadas no turn.`,
    completedDraws: [],
    newThreats: [],
  }
}

// ---- BOARD ADVANTAGE ANALYSIS ----

export interface BoardAdvantageAnalysis {
  rangeAdvantage: 'IP' | 'OOP' | 'neutral'
  nutAdvantage: 'IP' | 'OOP' | 'neutral'
  rangeStrength: 'strong' | 'moderate' | 'slight'
  explanation: string
  bettingImplication: string
  recommendedFrequency: 'high' | 'medium' | 'low'
  recommendedSize: 'small' | 'medium' | 'large' | 'mixed'
}

export function analyzeBoardAdvantage(
  texture: BoardTexture,
  potType: 'SRP' | '3bet',
  heroPosition: 'IP' | 'OOP'
): BoardAdvantageAnalysis {
  const { topRankIdx, connected, paired, monotone, twoTone } = texture
  // topRankIdx: 0=A, 1=K, 2=Q, 3=J, 4=T, 5=9 ... 12=2

  let rangeAdvantage: 'IP' | 'OOP' | 'neutral' = 'neutral'
  let nutAdvantage: 'IP' | 'OOP' | 'neutral' = 'neutral'
  let rangeStrength: 'strong' | 'moderate' | 'slight' = 'slight'
  let explanation = ''
  let bettingImplication = ''
  let recommendedFrequency: 'high' | 'medium' | 'low' = 'medium'
  let recommendedSize: 'small' | 'medium' | 'large' | 'mixed' = 'medium'

  if (potType === 'SRP') {
    // SRP típico: IP (BTN/CO) abriu, OOP (BB) defendeu
    // IP tem: todos os pares, AX, KX, suited connectors → range hits alto
    // OOP tem: range muito amplo com mais suited connectors baixos, pares pequenos

    if (topRankIdx <= 1) {
      // Board com A ou K: IP tem muito mais AX/KX → range advantage forte para IP
      rangeAdvantage = 'IP'
      nutAdvantage = 'IP'
      rangeStrength = 'strong'
      explanation = `Board alto (${topRankIdx === 0 ? 'Ás' : 'Rei'}) favorece fortemente o IP — sua range tem muito mais AX/KX que o OOP (BB). IP tem vantagem de range E de nuts.`
      bettingImplication = 'IP deve apostar com alta frequência (55-70%), tamanhos pequenos (33-50%). OOP deve checar quase sempre e ser cauteloso ao continuar.'
      recommendedFrequency = 'high'
      recommendedSize = 'small'
    } else if (topRankIdx <= 3) {
      // Board Q ou J: ligeira vantagem de IP
      rangeAdvantage = 'IP'
      nutAdvantage = 'IP'
      rangeStrength = 'slight'
      explanation = `Board médio-alto (${RANKS[topRankIdx]}). IP tem ligeira vantagem de range — QQ/JJ e AX ainda favorecem IP. Vantagem moderada de nuts com overpairs.`
      bettingImplication = 'IP pode apostar com frequência moderada (40-55%), tamanhos mistos (33-50%). OOP pode checar-chamar ou checar-levantar com sets/draws fortes.'
      recommendedFrequency = 'medium'
      recommendedSize = 'mixed'
    } else if (connected && topRankIdx >= 4 && topRankIdx <= 7) {
      // Board conectado médio (T-7): OOP tem vantagem de range (mais suited connectors)
      rangeAdvantage = 'OOP'
      nutAdvantage = 'IP'
      rangeStrength = 'moderate'
      explanation = `Board conectado médio (${RANKS[topRankIdx]}-high). OOP (BB) tem vantagem de range — sua range defensiva inclui mais suited connectors e pequenos pares que conectam aqui. Mas IP ainda tem vantagem de nuts (overpairs).`
      bettingImplication = 'IP deve apostar com frequência menor (30-45%), tamanhos maiores quando aposta (50-67%). OOP pode donk bet OU checar-levantar com mãos fortes.'
      recommendedFrequency = 'medium'
      recommendedSize = 'medium'
    } else if (connected && topRankIdx >= 8) {
      // Board conectado baixo (6 ou menor): OOP tem vantagem moderada de range
      rangeAdvantage = 'OOP'
      nutAdvantage = 'IP'
      rangeStrength = 'moderate'
      explanation = `Board baixo conectado (${RANKS[topRankIdx]}-high). OOP tem vantagem de range — suits connectors e pares pequenos do range defensivo do BB conectam bem aqui. IP ainda tem vantagem de nuts com overpairs altos.`
      bettingImplication = 'IP aposta menos frequentemente (25-40%), mas com tamanhos maiores para proteger overpairs. OOP pode jogar mais agressivo — check-raise com sets e two pairs é standard.'
      recommendedFrequency = 'low'
      recommendedSize = 'large'
    } else if (paired) {
      // Board pareado: IP tem vantagem (mais pocket pairs no range)
      rangeAdvantage = 'IP'
      nutAdvantage = 'IP'
      rangeStrength = 'moderate'
      explanation = `Board pareado (${RANKS[topRankIdx]}${RANKS[topRankIdx]}). IP tem vantagem de range e nuts — pocket pairs são mais frequentes em ranges de abertura. OOP tem menos trips/full houses que IP nesta textura.`
      bettingImplication = 'IP pode c-bet com frequência moderada-alta (45-60%), tamanhos pequenos (33-50%). OOP deve ser cauteloso — sua range hits boards pareados menos frequentemente.'
      recommendedFrequency = 'medium'
      recommendedSize = 'small'
    } else {
      // Board seco médio-baixo: ligeira vantagem IP
      rangeAdvantage = 'IP'
      nutAdvantage = 'IP'
      rangeStrength = 'slight'
      explanation = `Board seco sem conectividade clara. IP tem ligeira vantagem de range e nuts — overpairs e top pairs de kicker alta são mais frequentes no range de abertura.`
      bettingImplication = 'IP pode apostar com frequência moderada (35-50%), tamanhos pequenos (33%). Boards secos permitem c-bets baratas — fold equity é boa mesmo com ar.'
      recommendedFrequency = 'medium'
      recommendedSize = 'small'
    }

    if (monotone) {
      explanation += ' Board monotone: fold equity reduzida — villain pode ter flush ou flush draw. Ajuste frequências para baixo.'
      bettingImplication += ' Com board monotone, reduza frequência de bluff; aumente tamanho com value hands.'
      recommendedSize = 'large'
    }

  } else {
    // 3bet pot: OOP 3-betou, IP chamou
    // OOP range: AA, KK, QQ, JJ, AKs, AQs, A5s (polarizado)
    // IP range: TT-88, AJs, AQs, KQs, JTs (calling range)

    if (topRankIdx <= 1) {
      // Board A/K em 3bet pot: OOP (3-bettor) tem vantagem forte
      rangeAdvantage = 'OOP'
      nutAdvantage = 'OOP'
      rangeStrength = 'strong'
      explanation = `Board alto em 3bet pot — OOP (3-bettor) tem vantagem forte de range e nuts. AA/KK/AK dominam em boards A/K-high e estão mais concentrados no range de 3-bet do OOP.`
      bettingImplication = 'OOP deve apostar com alta frequência (60-75%), tamanhos pequenos (33-50%). IP deve defender com cuidado — top pair pode estar atrás de overpairs ou two pairs do OOP.'
      recommendedFrequency = 'high'
      recommendedSize = 'small'
    } else if (topRankIdx <= 4) {
      // Board médio em 3bet pot: mais equilibrado
      rangeAdvantage = 'neutral'
      nutAdvantage = 'OOP'
      rangeStrength = 'slight'
      explanation = `Board médio em 3bet pot. Ranges são relativamente equilibrados aqui — OOP tem AA/KK como nuts, mas IP tem sets de TT/JJ/QQ e top pairs fortes. OOP mantém ligeira vantagem de nuts.`
      bettingImplication = 'Ambos podem apostar e checar com equilíbrio. Tamanhos mistos (33-67%). IP deve checar-levantar sets com frequência — construa o pot enquanto OOP ainda aposta.'
      recommendedFrequency = 'medium'
      recommendedSize = 'mixed'
    } else {
      // Board baixo em 3bet pot: IP tem vantagem de range
      rangeAdvantage = 'IP'
      nutAdvantage = 'OOP'
      rangeStrength = 'moderate'
      explanation = `Board baixo em 3bet pot. IP (caller) tem vantagem de range — sua calling range inclui TT-88 e suited connectors que conectam bem em boards baixos. OOP ainda tem vantagem de nuts com overpairs (AA/KK).`
      bettingImplication = 'OOP deve checar com frequência alta (50-65%) em boards baixos. IP pode apostar como vantagem de range. OOP aposta principalmente para valor com AA/KK.'
      recommendedFrequency = 'low'
      recommendedSize = 'large'
    }
  }

  // Perspectiva do herói
  const ra = rangeAdvantage as string
  const na = nutAdvantage as string
  const heroRangeAdv = ra === heroPosition ? 'favorable' : ra === 'neutral' ? 'neutral' : 'unfavorable'
  const heroNutAdv   = na === heroPosition ? 'favorable' : na === 'neutral' ? 'neutral' : 'unfavorable'

  // Adicionar contexto do herói à implicação
  if (heroRangeAdv === 'unfavorable') {
    bettingImplication = `⚠️ Você está em desvantagem de range neste board. ${bettingImplication}`
  } else if (heroRangeAdv === 'favorable') {
    bettingImplication = `✅ Você tem vantagem de range neste board. ${bettingImplication}`
  }

  return { rangeAdvantage, nutAdvantage, rangeStrength, explanation, bettingImplication, recommendedFrequency, recommendedSize }
}

// ---- BLOCKER EFFECTS ANALYSIS ----

export interface BlockerEffect {
  hand: string           // ex: 'AA'
  label: string          // ex: 'Par de Ases'
  originalCombos: number
  remainingCombos: number
  percentBlocked: number // 0-100
  impact: 'high' | 'medium' | 'low'
}

export function analyzeBlockerEffects(heroCards: [Card, Card]): BlockerEffect[] {
  const [h1, h2] = heroCards
  const results: BlockerEffect[] = []

  // Mãos premium para analisar bloqueio
  const handsToCheck: Array<{ hand: string; label: string; type: 'pair' | 'suited' | 'offsuit' }> = [
    { hand: 'AA', label: 'Par de Ases', type: 'pair' },
    { hand: 'KK', label: 'Par de Reis', type: 'pair' },
    { hand: 'QQ', label: 'Par de Damas', type: 'pair' },
    { hand: 'JJ', label: 'Par de Valets', type: 'pair' },
    { hand: 'TT', label: 'Par de Tens', type: 'pair' },
    { hand: 'AKs', label: 'AK suited', type: 'suited' },
    { hand: 'AKo', label: 'AK offsuit', type: 'offsuit' },
    { hand: 'AQs', label: 'AQ suited', type: 'suited' },
    { hand: 'AQo', label: 'AQ offsuit', type: 'offsuit' },
    { hand: 'AJs', label: 'AJ suited', type: 'suited' },
    { hand: 'KQs', label: 'KQ suited', type: 'suited' },
    { hand: 'KQo', label: 'KQ offsuit', type: 'offsuit' },
    { hand: 'A5s', label: 'A5 suited', type: 'suited' },
    { hand: 'A4s', label: 'A4 suited', type: 'suited' },
  ]

  for (const { hand, label, type } of handsToCheck) {
    let original = 0
    let remaining = 0

    if (type === 'pair') {
      const rank = hand[0] as Rank
      const heroCount = [h1, h2].filter(c => c.rank === rank).length
      original = 6
      remaining = heroCount === 0 ? 6 : heroCount === 1 ? 3 : 1
    } else if (type === 'suited') {
      const r1 = hand[0] as Rank
      const r2 = hand[1] as Rank
      original = 4
      // Remove combos onde herói tem uma das cartas do mesmo naipe
      remaining = SUITS.reduce((acc, suit) => {
        const heroBlocks = heroCards.some(c => (c.rank === r1 || c.rank === r2) && c.suit === suit)
        return heroBlocks ? acc : acc + 1
      }, 0)
    } else {
      // offsuit: 12 combos (4×4 - 4 suited)
      const r1 = hand[0] as Rank
      const r2 = hand[1] as Rank
      const heroR1Count = [h1, h2].filter(c => c.rank === r1).length
      const heroR2Count = [h1, h2].filter(c => c.rank === r2).length
      original = 12
      // Cada carta de rank r1 que herói tem remove 3 combos offsuit (4 kings de r2 - 1 suited = 3)
      // Cada carta de rank r2 remove 3 combos offsuit
      remaining = Math.max(0, 12 - heroR1Count * 3 - heroR2Count * 3)
    }

    // Só mostrar se há bloqueio real (remaining < original)
    if (remaining < original) {
      const percentBlocked = Math.round(((original - remaining) / original) * 100)
      const impact: 'high' | 'medium' | 'low' =
        percentBlocked >= 50 ? 'high' : percentBlocked >= 25 ? 'medium' : 'low'
      results.push({ hand, label, originalCombos: original, remainingCombos: remaining, percentBlocked, impact })
    }
  }

  // Ordenar por impacto: high > medium > low, depois por % bloqueado
  return results.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    if (order[a.impact] !== order[b.impact]) return order[a.impact] - order[b.impact]
    return b.percentBlocked - a.percentBlocked
  }).slice(0, 6) // máximo 6 blockers mais relevantes
}

export function analyzeBoardTexture(board: Card[]): BoardTexture {
  if (board.length < 3) {
    return { wet: false, dry: true, paired: false, monotone: false, twoTone: false, connected: false, topRank: 'A', topRankIdx: 0, label: 'Neutro' }
  }
  const rankIdxs = board.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b)
  const suits = board.map(c => c.suit)
  const suitCounts: Record<string, number> = {}
  for (const s of suits) suitCounts[s] = (suitCounts[s] || 0) + 1
  const maxSuit = Math.max(...Object.values(suitCounts))
  const monotone = maxSuit >= 3
  const twoTone = maxSuit === 2
  const rankSet = new Set(board.map(c => c.rank))
  const paired = rankSet.size < board.length
  const spread = rankIdxs[rankIdxs.length - 1] - rankIdxs[0]
  const connected = !paired && spread <= 4
  const wet = (monotone || twoTone) && connected
  const dry = !twoTone && !monotone && !connected && !paired
  const topRankIdx = rankIdxs[0]
  const topRank = RANKS[topRankIdx]
  const label = monotone ? 'Monotone' : twoTone && connected ? 'Molhado (2-tone connected)' : twoTone ? 'Semi-molhado' : connected ? 'Conectado' : paired ? 'Pareado' : 'Seco'
  return { wet, dry, paired, monotone, twoTone, connected, topRank, topRankIdx, label }
}

// Helper: detecta straight completo (incluindo wheel A-2-3-4-5)
function detectStraight(heroCards: [Card, Card], board: Card[]): boolean {
  const allCards = [...heroCards, ...board]
  const allIdxs = [...new Set(allCards.map(c => RANKS.indexOf(c.rank)))]

  // Straights normais: A-high (0-4) até 5-high (8-12)
  for (let start = 0; start <= 8; start++) {
    const window = allIdxs.filter(i => i >= start && i <= start + 4)
    if (window.length >= 5) {
      const heroContributes = heroCards.some(c => {
        const idx = RANKS.indexOf(c.rank)
        return idx >= start && idx <= start + 4
      })
      if (heroContributes) return true
    }
  }

  // Wheel: A(0) + 5(8) + 4(9) + 3(10) + 2(11)
  const wheelIdxs = [0, 8, 9, 10, 11]
  const hasAllWheel = wheelIdxs.every(i => allIdxs.includes(i))
  if (hasAllWheel && heroCards.some(c => wheelIdxs.includes(RANKS.indexOf(c.rank)))) return true

  return false
}

export function evaluatePostflopHand(heroCards: [Card, Card], board: Card[]): PostflopHandEval {
  const [h1, h2] = heroCards
  const allCards: Card[] = [...heroCards, ...board]
  const boardRanks = board.map(c => c.rank)
  const boardRankIdxs = board.map(c => RANKS.indexOf(c.rank)).sort((a, b) => a - b)
  const h1Idx = RANKS.indexOf(h1.rank)
  const h2Idx = RANKS.indexOf(h2.rank)
  const h1Matches = boardRanks.filter(r => r === h1.rank).length
  const h2Matches = boardRanks.filter(r => r === h2.rank).length
  const isHeroPocketPair = h1.rank === h2.rank

  // Frequências de ranks no board
  const boardFreq: Record<string, number> = {}
  board.forEach(c => { boardFreq[c.rank] = (boardFreq[c.rank] || 0) + 1 })
  const boardHasPair = (excludeRank?: string) =>
    Object.entries(boardFreq).some(([r, c]) => c >= 2 && r !== excludeRank)
  const boardHasTrips = (excludeRank?: string) =>
    Object.entries(boardFreq).some(([r, c]) => c >= 3 && r !== excludeRank)

  const draws: string[] = []

  // ---- DETECÇÃO DE DRAWS ----

  // Flush draw (apenas draw = 4 do mesmo naipe; não adiciona quando já é flush feito)
  const suitMap: Record<string, number> = {}
  for (const c of allCards) suitMap[c.suit] = (suitMap[c.suit] || 0) + 1
  for (const [suit, count] of Object.entries(suitMap)) {
    if (count === 4 && heroCards.some(c => c.suit === suit)) { draws.push('Flush Draw'); break }
  }

  // Straight draws — janelas de 5 slots, procura 4-of-5 com hero contribuindo
  const allIdxsSet = [...new Set(allCards.map(c => RANKS.indexOf(c.rank)))]
  for (let start = 0; start <= 8; start++) {
    const window = allIdxsSet.filter(i => i >= start && i <= start + 4).sort((a, b) => a - b)
    if (window.length === 4) {
      const heroInWindow = [h1Idx, h2Idx].some(i => i >= start && i <= start + 4)
      if (heroInWindow && !draws.some(d => d === 'OESD' || d === 'Gutshot')) {
        // 4 cards consecutivas = OESD; com gap interno = Gutshot
        const isConsecutive = window[3] - window[0] === 3
        draws.push(isConsecutive ? 'OESD' : 'Gutshot')
      }
    }
  }
  // Wheel draw: A + 3 de {2,3,4,5} = Gutshot para o wheel
  const wheelCardIdxs = [0, 8, 9, 10, 11]
  const wheelPresent = wheelCardIdxs.filter(i => allIdxsSet.includes(i))
  if (wheelPresent.length === 4 && heroCards.some(c => wheelCardIdxs.includes(RANKS.indexOf(c.rank)))) {
    if (!draws.some(d => d === 'OESD' || d === 'Gutshot')) draws.push('Gutshot')
  }

  // ---- MÃOS FEITAS (ordem decrescente de força) ----

  // Straight Flush — verificar PRIMEIRO (categoria reportada como 'flush' com strength 99)
  // Procura 5 cartas do mesmo naipe formando sequência onde hero contribui
  for (const [suit, count] of Object.entries(suitMap)) {
    if (count >= 5 && heroCards.some(c => c.suit === suit)) {
      const suitCards = allCards.filter(c => c.suit === suit)
      const suitIdxs = [...new Set(suitCards.map(c => RANKS.indexOf(c.rank)))].sort((a, b) => a - b)
      // Verifica se existem 5 índices consecutivos
      let isSF = false
      for (let s = 0; s <= suitIdxs.length - 5; s++) {
        if (suitIdxs[s + 4] - suitIdxs[s] === 4) { isSF = true; break }
      }
      // Wheel SF: A(0) + 2(11) + 3(10) + 4(9) + 5(8) do mesmo naipe
      if (!isSF) {
        const wheelSF = [0, 8, 9, 10, 11]
        if (wheelSF.every(i => suitIdxs.includes(i))) isSF = true
      }
      if (isSF && heroCards.some(c => c.suit === suit)) {
        return { category: 'flush', label: 'Straight Flush!', strength: 99, draws: [], description: 'Straight Flush! Mão quase-nuts — value bet grande, slow play ocasionalmente para induzir bluffs.' }
      }
    }
  }

  // Flush (não-straight)
  for (const [suit, count] of Object.entries(suitMap)) {
    if (count >= 5 && heroCards.some(c => c.suit === suit)) {
      return { category: 'flush', label: 'Flush!', strength: 88, draws, description: 'Flush completo! Mão muito forte — value bet médio a grande. Cheque raramente para equilibrar.' }
    }
  }

  // Straight
  if (detectStraight(heroCards, board)) {
    const hasBoardFlushDraw = Object.values(suitMap).some(c => c >= 3)
    const desc = hasBoardFlushDraw
      ? 'Sequência completa! Mão muito forte, mas board tem flush draw — aposte para proteger. Cuidado com boards pareados (full house do villain).'
      : 'Sequência completa! Mão muito forte — value bet grande. Aposte 67-100% do pot.'
    return { category: 'straight', label: 'Straight!', strength: 85, draws, description: desc }
  }

  // Quads
  // Pocket pair + 2 iguais no board = quadra; ou uma carta + 3 iguais no board
  if ((isHeroPocketPair && h1Matches >= 2) || h1Matches >= 3 || h2Matches >= 3) {
    return { category: 'quads', label: 'Quadra!', strength: 100, draws: [], description: 'Quadra! Mão absoluta. Slow play quase sempre — deixe o villain bluffar ou construir o pot. Value bet no river.' }
  }

  // Full house
  if (isHeroPocketPair) {
    // Par no bolso + trips no board de rank diferente = FH (ex: KK + 777)
    if (boardHasTrips(h1.rank)) {
      return { category: 'full_house', label: 'Full House', strength: 97, draws: [], description: `Full house! Par no bolso sobre trips do board. Mão nutted — construa o pot, não deixe draws gratuitos.` }
    }
    // Par no bolso + 1 no board + par no board de rank diferente = FH (ex: KK + K-7-7)
    if (h1Matches === 1 && boardHasPair(h1.rank)) {
      return { category: 'full_house', label: 'Full House', strength: 96, draws: [], description: 'Full house! Set com board pareado. Mão nutted — aposte para construir o pot.' }
    }
    // Par no bolso + 1 no board sem par extra = SET (não FH!)
    if (h1Matches === 1) {
      const desc = `Set de ${h1.rank}s! Uma das mãos mais fortes no flop. ${draws.length > 0 ? 'Board com draws — construa o pot rapidamente.' : 'Aposte para valor, misture com check para equilibrar.'}`
      return { category: 'set', label: `Set de ${h1.rank}`, strength: 93, draws, description: desc }
    }
  } else {
    // Não é pocket pair: trips de h1 + par de h2 = FH, ou vice-versa
    if (h1Matches >= 2 && h2Matches >= 1) {
      return { category: 'full_house', label: 'Full House', strength: 95, draws: [], description: 'Full house! Aposte para valor máximo — mão nutted.' }
    }
    if (h1Matches >= 1 && h2Matches >= 2) {
      return { category: 'full_house', label: 'Full House', strength: 95, draws: [], description: 'Full house! Aposte para valor máximo — mão nutted.' }
    }
  }

  // Trips (1 carta do herói + 2 iguais no board = trips sem par na mão)
  if (!isHeroPocketPair) {
    if (h1Matches >= 2) {
      return { category: 'trips', label: `Trips de ${h1.rank}`, strength: 82, draws, description: `Trips com ${h1.rank} no board. Mão muito forte mas vulnerável a full house do villain. Value bet para construir pot.` }
    }
    if (h2Matches >= 2) {
      return { category: 'trips', label: `Trips de ${h2.rank}`, strength: 82, draws, description: `Trips com ${h2.rank} no board. Mão muito forte mas vulnerável a full house do villain. Value bet para construir pot.` }
    }
  }

  // Two pair
  if (h1Matches >= 1 && h2Matches >= 1) {
    const desc = draws.length > 0
      ? `Dois pares com draw (${draws.join(' + ')})! Muito forte — aposte grande para proteção e valor.`
      : 'Dois pares! Mão forte — value bet. Cuidado com boards com straight/flush draws para o villain.'
    return { category: 'two_pair', label: 'Dois Pares', strength: 78, draws, description: desc }
  }

  // One pair
  if (h1Matches === 1 || h2Matches === 1) {
    const pairedCard = h1Matches === 1 ? h1 : h2
    const kicker = h1Matches === 1 ? h2 : h1
    const pairedIdx = RANKS.indexOf(pairedCard.rank)
    const kickerIdx = RANKS.indexOf(kicker.rank)
    const isTopPair = pairedIdx === boardRankIdxs[0]
    const isMidPair = boardRankIdxs.length >= 2 && pairedIdx === boardRankIdxs[1]
    const drawBonus = draws.length > 0 ? 10 : 0
    const drawDesc = draws.length > 0 ? ` + ${draws.join('/')}` : ''

    if (isTopPair) {
      if (kickerIdx <= 3) return { category: 'tptk', label: `Top Par + Top Kicker${drawDesc}`, strength: 64 + drawBonus, draws, description: `TPTK (${pairedCard.rank}${kicker.rank})! Mão forte — value bet na maioria dos boards. Em boards secos, bet 50-67%; em boards molhados, bet 67% para proteção.` }
      if (kickerIdx <= 6) return { category: 'tpgk', label: `Top Par + Boa Kicker${drawDesc}`, strength: 58 + drawBonus, draws, description: `Top par com kicker decente (${pairedCard.rank}${kicker.rank}). Value bet, mas cuidado com boards molhados onde draws completam no turn.` }
      return { category: 'tpwk', label: `Top Par + Kicker Fraca${drawDesc}`, strength: 48 + drawBonus, draws, description: `Top par kicker ruim (${pairedCard.rank}${kicker.rank}). Jogue com cuidado — cheque às vezes para pot control, bet para proteção em boards com draws.` }
    }
    if (isMidPair) return { category: 'middle_pair', label: `Par do Meio${drawDesc}`, strength: 36 + drawBonus, draws, description: `Par do meio (${pairedCard.rank}). Mão mediana — prefira checar na maioria dos spots. Bet pequeno em posição em boards secos.` }
    return { category: 'bottom_pair', label: `Par Fraco${drawDesc}`, strength: 22 + drawBonus, draws, description: `Par fraco (${pairedCard.rank}). Geralmente cheque/fold. Só continue com draw adicional forte ou pot odds muito boas.` }
  }

  // Overpair / underpair (pocket pair sem match no board)
  if (isHeroPocketPair) {
    const ppIdx = RANKS.indexOf(h1.rank)
    const drawBonus = draws.length > 0 ? 8 : 0
    if (ppIdx < boardRankIdxs[0]) {
      const ppStr = ppIdx <= 2 ? 70 : ppIdx <= 5 ? 62 : 52
      return { category: 'overpair', label: `Sobre-Par (${h1.rank}${h2.rank})`, strength: ppStr + drawBonus, draws, description: `Sobre-par de ${h1.rank}s! Mão forte — value bet. Em boards molhados, aposte para proteção e para negar equity de draws. Em boards secos, pode misturar check para equilibrar.` }
    }
    return { category: 'underpair', label: `Par Menor (${h1.rank}${h2.rank})`, strength: 18 + drawBonus, draws, description: `Par menor que o board (${h1.rank}s). Mão fraca — cheque na maioria das vezes. Continue apenas com draw adicional relevante.` }
  }

  // Sem par — draws e overcards
  const h1Overcard = h1Idx < boardRankIdxs[0]
  const h2Overcard = h2Idx < boardRankIdxs[0]

  // Prioridade: FD + OESD > FD + overcard > FD > OESD > overcards > Gutshot > ar
  if (draws.includes('Flush Draw') && draws.includes('OESD')) {
    return { category: 'draw_strong', label: 'Flush Draw + OESD', strength: 62, draws, description: 'Monstro draw! Flush draw (9 outs) + OESD (8 outs) = ~15 outs limpos (~55-57% equity em 2 ruas). Aposte sempre como semi-bluff agressivo.' }
  }
  if (draws.includes('Flush Draw') && (h1Overcard || h2Overcard)) {
    return { category: 'draw_strong', label: 'FD + Overcard', strength: 54, draws, description: `Flush draw (9 outs) com overcard (3-6 outs extras) = ~45-50% equity em 2 ruas. Excelente semi-bluff — aposte com alta frequência, especialmente em posição.` }
  }
  if (draws.includes('Flush Draw')) {
    return { category: 'draw_strong', label: 'Flush Draw', strength: 46, draws, description: `Flush draw puro (9 outs, ~35% equity em 2 ruas / ~19% no turn). Semi-bluff clássico — aposte frequentemente em posição. Pot odds de 1:2 justificam chamada mesmo sem fold equity.` }
  }
  if (draws.includes('OESD')) {
    const hasOC = h1Overcard || h2Overcard
    const oeDesc = hasOC
      ? `OESD + overcard: ~8 outs para straight + 3-6 extras = ~32-40% equity. Semi-bluff sólido — aposte em posição com frequência.`
      : `OESD puro (8 outs, ~31% equity em 2 ruas / ~17% no turn). Aposte como semi-bluff em posição. Cheque-chame fora de posição — não cheque-fold com 8 outs.`
    return { category: 'draw_medium', label: `OESD${hasOC ? ' + Overcard' : ''}`, strength: hasOC ? 44 : 40, draws, description: oeDesc }
  }
  if (h1Overcard && h2Overcard) {
    const hasGut = draws.includes('Gutshot')
    const desc = hasGut
      ? 'Duas overcards + gutshot: ~6 outs para par + 4 para straight = ~30% equity. Semi-bluff ocasional em boards favoráveis.'
      : 'Duas overcards (~6 outs para par, ~24% equity). Mão especulativa — prefira checar para ver turn gratuitamente. Bluff apenas com fold equity clara.'
    return { category: 'overcards', label: `Duas Overcards${hasGut ? ' + Gutshot' : ''}`, strength: hasGut ? 24 : 16, draws, description: desc }
  }
  if (draws.includes('Gutshot')) {
    return { category: 'draw_weak', label: 'Gutshot', strength: 18, draws, description: 'Gutshot (4 outs, ~16% equity em 2 ruas / ~8% no turn). Semi-bluff com baixa frequência, apenas com fold equity alta (board seco, villain fraco, posição). Cheque na maioria dos spots.' }
  }

  return { category: 'air', label: 'Nada (Ar)', strength: 4, draws: [], description: 'Sem par nem draw relevante. Cheque quase sempre. Bluff puro apenas em spots muito selecionados: board seco, posição, villain com range fraco, fold equity alta.' }
}

export function getGTODecision(
  handEval: PostflopHandEval,
  texture: BoardTexture,
  position: 'IP' | 'OOP',
  potType: 'SRP' | '3bet',
  facingBet: boolean,
  street: 'flop' | 'turn' | 'river' = 'flop',
  spr: number = 10
): GtoDecision {
  const { category, strength, draws } = handEval
  const { wet, dry, paired, monotone } = texture
  // Ajuste SPR: stack curto favorece sizing maior e comprometimento; stack profundo favorece controle
  const isShortSPR = spr <= 2   // stack ≤ 2× pot — muito comprometido
  const isMidSPR   = spr > 2 && spr <= 5
  const isDeepSPR  = spr > 12
  const hasDraw = draws.length > 0
  const isTurn = street === 'turn'
  const isRiver = street === 'river'

  // No turn, draws valem menos (1 rua sobrando) — penalidade afeta classificação da mão
  const turnPenalty = isTurn ? -8 : 0
  const adjStrength = strength + turnPenalty

  const isNutted = adjStrength >= 85 ||
    (category === 'straight' && !paired) ||
    (category === 'flush' && !paired)
  const isStrong = (adjStrength >= 60 && adjStrength < 85) ||
    (category === 'straight' && paired) ||
    (category === 'flush' && paired)
  const isMedium = adjStrength >= 35 && adjStrength < 60
  const isWeak = adjStrength < 35

  // No river, draws ou completaram ou viraram ar
  const isMissedDraw = isRiver && ['draw_strong', 'draw_medium', 'draw_weak', 'overcards'].includes(category)

  // =========================================================
  // RIVER — lógica separada, sem draws, sizing polarizado
  // =========================================================
  if (isRiver) {
    if (facingBet) {
      if (isNutted) return {
        primaryAction: 'raise', primaryFrequency: 0.92,
        alternativeAction: 'call', alternativeFrequency: 0.08,
        explanation: `${handEval.label} no river — raise (92%) para extrair valor máximo. O pot é grande; villain está comprometido. Chame 8% para balancear vs bluffs do villain.`
      }
      if (isStrong) return {
        primaryAction: 'call', primaryFrequency: 0.85,
        alternativeAction: 'fold', alternativeFrequency: 0.15,
        explanation: `${handEval.label} no river — call (85%). Mão forte o suficiente para pagar na maioria dos sizings. Fold apenas contra bets muito grandes (>pot) em boards muito perigosos.`
      }
      if (isMedium) return {
        primaryAction: 'call', primaryFrequency: 0.50,
        alternativeAction: 'fold', alternativeFrequency: 0.50,
        explanation: `${handEval.label} no river — decisão de MDF. Calcule: pot/(pot+bet). Se villain bet 67% pot → você precisa chamar ~60% para prevenir bluffs lucrativos. Se bet pot → chame ~50%. Considere o perfil do villain.`
      }
      if (isMissedDraw || isWeak) return {
        primaryAction: 'fold', primaryFrequency: 0.80,
        alternativeAction: 'call', alternativeFrequency: 0.20,
        explanation: `${isMissedDraw ? 'Draw não completada' : handEval.label} no river — fold (80%). Sem equity, sem draws — bluff catch só quando villain é muito agressivo e pot odds são excelentes. Call 20% para não ser explorado totalmente.`
      }
      return { primaryAction: 'fold', primaryFrequency: 0.85, alternativeAction: 'call', alternativeFrequency: 0.15, explanation: `Mão fraca no river — fold. Sem possibilidade de melhora.` }
    }

    // River acting first
    if (position === 'IP') {
      if (isNutted) {
        const sz: GtoAction = paired || monotone ? 'bet_67' : 'bet_pot'
        return {
          primaryAction: sz, primaryFrequency: 0.85,
          alternativeAction: 'bet_67', alternativeFrequency: 0.15,
          explanation: `${handEval.label} no river IP — bet ${paired || monotone ? '67%' : 'pot'} para valor máximo. No river não há draws para proteger; aposte grande para extrair o máximo de mãos fortes do villain. Villain deve chamar com top pair+.`
        }
      }
      if (isStrong) return {
        primaryAction: 'bet_67', primaryFrequency: 0.70,
        alternativeAction: 'check', alternativeFrequency: 0.30,
        explanation: `${handEval.label} no river IP — bet 67% para valor (70%). Cheque 30% com as mãos mais fortes da categoria para induzir bluffs do villain. Não use bet pequeno com mãos fortes — perde valor.`
      }
      if (isMedium) return {
        primaryAction: 'bet_33', primaryFrequency: 0.45,
        alternativeAction: 'check', alternativeFrequency: 0.55,
        explanation: `${handEval.label} no river IP — thin value bet 33% (45%). Bet pequeno extrai valor de mãos piores sem inflar o pot. Cheque 55% para pot control — com pot grande, villain pode levantar com mãos melhores.`
      }
      if (isMissedDraw || isWeak) {
        // Bluff only with polarized sizing
        if (dry && !paired) return {
          primaryAction: 'bet_pot', primaryFrequency: 0.25,
          alternativeAction: 'check', alternativeFrequency: 0.75,
          explanation: `${isMissedDraw ? 'Draw não completada' : 'Nada'} no river — cheque (75%). Bluff puro com pot-size (25%) apenas quando board é seco/unfavorável para villain e você tem fold equity real. River bluffs devem ser grandes ou check.`
        }
        return {
          primaryAction: 'check', primaryFrequency: 0.85,
          alternativeAction: 'bet_pot', alternativeFrequency: 0.15,
          explanation: `${isMissedDraw ? 'Draw não completada no river' : 'Nada'} — cheque quase sempre (85%). Bluff puro raramente com bet pot (15%). Boards molhados/pareados reduzem drasticamente fold equity no river.`
        }
      }
    }

    // River OOP
    if (isNutted) return {
      primaryAction: 'check_raise', primaryFrequency: 0.70,
      alternativeAction: 'bet_67', alternativeFrequency: 0.30,
      checkRaiseCandidate: true,
      explanation: `${handEval.label} OOP no river — Check-Raise (70%): linha mais valiosa com nuts OOP. Deixa villain "c-bet" ou "bluff" e você levanta. Donk bet 67% (30%) também válido — misture para não ser previsível.`
    }
    if (isStrong) return {
      primaryAction: 'check', primaryFrequency: 0.65,
      alternativeAction: 'bet_67', alternativeFrequency: 0.35,
      checkRaiseCandidate: false,
      explanation: `${handEval.label} OOP no river — cheque (65%) para deixar villain bluffar ou bet thin value. Donk bet 67% (35%) quando board favorece sua range. Não cheque-levante mãos fortes aqui (salve check-raise para nuts).`
    }
    if (isMedium) return {
      primaryAction: 'check', primaryFrequency: 0.80,
      alternativeAction: 'bet_33', alternativeFrequency: 0.20,
      checkRaiseCandidate: false,
      explanation: `${handEval.label} OOP no river — cheque (80%) para pot control. Thin value bet 33% (20%) raramente. Com mãos medianas OOP, você é vulnerável a raises; cheque é o caminho mais seguro.`
    }
    return {
      primaryAction: 'check', primaryFrequency: 0.92,
      alternativeAction: 'bet_pot', alternativeFrequency: 0.08,
      checkRaiseCandidate: false,
      explanation: `${isMissedDraw ? 'Draw não completada' : 'Nada'} OOP no river — cheque (92%). Bluff 8% em spots muito seletivos (board dry, villain capped, fold equity extremamente alta). Se bluffa, use bet grande (pot) — bluffs pequenos no river são ineficientes.`
    }
  }

  if (facingBet) {
    // SPR baixo: stack está comprometido — raise com qualquer mão forte ou boa (maximiza valor)
    if (isShortSPR && (isNutted || isStrong)) return {
      primaryAction: 'raise', primaryFrequency: 0.95,
      alternativeAction: 'call', alternativeFrequency: 0.05,
      explanation: `${handEval.label} com SPR baixo (${spr.toFixed(1)}) — RAISE all-in (95%). Stack comprometido ao pot: levantar maximiza valor e nega equity de draws. Call apenas em spots raros para balancear.`
    }
    if (isNutted) return {
      primaryAction: 'raise', primaryFrequency: isTurn ? 0.90 : 0.85,
      alternativeAction: 'call', alternativeFrequency: isTurn ? 0.10 : 0.15,
      explanation: `${handEval.label} — raise${isTurn ? ' no turn com mais frequência que no flop (ranges mais polarizadas)' : ' para extrair valor máximo e proteger contra draws'}. Chame raramente para equilibrar.`
    }
    if (isStrong) return {
      primaryAction: 'call', primaryFrequency: isTurn ? 0.85 : 0.80,
      alternativeAction: 'raise', alternativeFrequency: isTurn ? 0.15 : 0.20,
      explanation: `${handEval.label} — call${isTurn ? '. No turn, raise menos frequente (pot maior, menos draws para proteger). Chame e decida no river.' : ' com frequência. Raise às vezes para extrair valor.'}`
    }
    if (isMedium && hasDraw) return {
      primaryAction: draws.some(d => d.includes('Flush') || d === 'OESD') ? 'call' : 'fold',
      primaryFrequency: isTurn ? 0.60 : 0.65,
      alternativeAction: isTurn ? 'fold' : 'raise',
      alternativeFrequency: isTurn ? 0.40 : 0.35,
      explanation: `${handEval.label}${isTurn ? ' no turn — draws valem menos (só 1 rua). Call apenas com draws fortes (FD, OESD). Fold draws fracos.' : ' — call frequente, raise como semi-bluff com draw forte.'}`
    }
    if (isMedium && !hasDraw) return {
      primaryAction: isTurn ? 'fold' : 'call',
      primaryFrequency: isTurn ? 0.65 : 0.55,
      alternativeAction: isTurn ? 'call' : 'fold',
      alternativeFrequency: isTurn ? 0.35 : 0.45,
      explanation: `${handEval.label}${isTurn ? ' — no turn sem draw é geralmente fold. Ranges são mais polarizadas, pot maior. Só continue com pot odds excepcionais.' : ' — borderline. Chame em posição, fold fora de posição em bets grandes.'}`
    }
    if (hasDraw && adjStrength >= 32) return {
      primaryAction: draws.some(d => d.includes('Flush')) ? 'call' : (isTurn ? 'fold' : 'call'),
      primaryFrequency: 0.70,
      explanation: `Draw${isTurn ? ' no turn (1 rua sobrando)' : ''} com ${draws.join(', ')}. ${isTurn ? 'Flush draw justifica call (9 outs ~19%). OESD borderline. Gutshot é fold.' : 'Chame para realizar equity. Verifique pot odds.'}`
    }
    return {
      primaryAction: 'fold', primaryFrequency: isTurn ? 0.90 : 0.85,
      alternativeAction: 'call', alternativeFrequency: isTurn ? 0.10 : 0.15,
      explanation: `${handEval.label} — fold${isTurn ? ' quase sempre no turn. Sem equity suficiente para continuar.' : ' principal. Chame raramente para não ser explorado.'}`
    }
  }

  // ---- Acting first ----
  // No turn: sizings maiores (sem 33%), villain chamou o flop então range é mais strong
  if (position === 'IP') {
    if (isNutted) {
      // SPR baixo: stack comprometido — bet pot imediato, não slow play
      if (isShortSPR) return { primaryAction: 'bet_pot', primaryFrequency: 0.92, alternativeAction: 'check', alternativeFrequency: 0.08, explanation: `${handEval.label} IP com SPR baixo (${spr.toFixed(1)}) — bet pot (92%). Stack é pequeno relativo ao pot: extraia valor máximo agora. Slow play com SPR baixo desperdiça valor.` }
      if (isTurn) {
        if (wet || monotone) return { primaryAction: 'bet_75', primaryFrequency: 0.80, alternativeAction: 'check', alternativeFrequency: 0.20, explanation: `${handEval.label} no turn em board molhado — bet 75% para extrair valor e negar equity final. Cheque 20% para slow play e induções.` }
        return { primaryAction: 'bet_67', primaryFrequency: 0.65, alternativeAction: 'check', alternativeFrequency: 0.35, explanation: `${handEval.label} no turn board seco — bet 67% para valor. Cheque 35% para induzir bluffs do villain no river.` }
      }
      if (wet || monotone) return { primaryAction: 'bet_67', primaryFrequency: 0.75, alternativeAction: 'check', alternativeFrequency: 0.25, explanation: `${handEval.label} em board molhado — aposte 67% para extrair valor e negar equity de draws. Cheque 25% para slow play.` }
      return { primaryAction: 'check', primaryFrequency: 0.55, alternativeAction: 'bet_50', alternativeFrequency: 0.45, explanation: `${handEval.label} em board seco — slow play com check (induz bluffs) e bet 50% para valor equilibrado.` }
    }
    if (isStrong) {
      // SPR baixo: bet pot para comprometer logo
      if (isShortSPR) return { primaryAction: 'bet_pot', primaryFrequency: 0.75, alternativeAction: 'bet_67', alternativeFrequency: 0.25, explanation: `${handEval.label} IP com SPR baixo (${spr.toFixed(1)}) — bet pot (75%). Com stack comprometido, size grande maximiza valor antes de ir all-in.` }
      if (isTurn) {
        const sz: GtoAction = wet ? 'bet_75' : 'bet_67'
        return { primaryAction: sz, primaryFrequency: 0.70, alternativeAction: 'check', alternativeFrequency: 0.30, explanation: `${handEval.label} no turn — aposte ${wet ? '75%' : '67%'}. Villain chamou o flop, range dele é mais fraca; aposte para extrair valor e dificultar realização de draws.` }
      }
      const sizing: GtoAction = wet ? 'bet_67' : 'bet_50'
      const freqBet = wet ? 0.75 : 0.65
      return { primaryAction: sizing, primaryFrequency: freqBet, alternativeAction: 'check', alternativeFrequency: 1 - freqBet, explanation: `${handEval.label} — aposte ${wet ? '67%' : '50%'} para valor e proteção.` }
    }
    if (category === 'tpwk' || (isMedium && !hasDraw)) {
      // SPR baixo: aposta mais com mãos médias (impliedodds compensam menos)
      if (isShortSPR) return { primaryAction: 'bet_50', primaryFrequency: 0.65, alternativeAction: 'check', alternativeFrequency: 0.35, explanation: `${handEval.label} IP com SPR baixo (${spr.toFixed(1)}) — bet 50% (65%). Mãos médias precisam extrair valor agora; pot control é menos relevante quando stacks são pequenos.` }
      if (isTurn) return { primaryAction: 'check', primaryFrequency: 0.75, alternativeAction: 'bet_50', alternativeFrequency: 0.25, explanation: `${handEval.label} no turn — cheque na maioria. Bet 50% ocasional como thin value em boards favoráveis. No turn, pot control é mais importante.` }
      // Deep stack: mais pot control com mãos médias
      if (isDeepSPR) return { primaryAction: 'check', primaryFrequency: 0.75, alternativeAction: 'bet_33', alternativeFrequency: 0.25, explanation: `${handEval.label} IP deep stack (SPR ${spr.toFixed(1)}) — cheque (75%). Com stacks profundos, pot control com mãos médias evita situações difíceis nos próximos streets.` }
      if (dry) return { primaryAction: 'bet_33', primaryFrequency: 0.55, alternativeAction: 'check', alternativeFrequency: 0.45, explanation: `${handEval.label} em board seco — small bet (33%) captura valor. Cheque 45% para equilíbrio.` }
      return { primaryAction: 'check', primaryFrequency: 0.65, alternativeAction: 'bet_33', alternativeFrequency: 0.35, explanation: `${handEval.label} em board molhado — cheque com frequência. Bet 33% ocasional.` }
    }
    if (hasDraw) {
      if (isTurn) {
        if (strength >= 45) {
          const sz: GtoAction = draws.includes('Flush Draw') ? 'bet_67' : 'bet_50'
          return { primaryAction: sz, primaryFrequency: 0.60, alternativeAction: 'check', alternativeFrequency: 0.40, explanation: `Semi-bluff no turn com ${draws.join(' + ')} — bet ${draws.includes('Flush') ? '67%' : '50%'} para fold equity + equity. Draws valem menos no turn (1 rua), então semi-bluff menos frequente.` }
        }
        return { primaryAction: 'check', primaryFrequency: 0.75, alternativeAction: 'bet_50', alternativeFrequency: 0.25, explanation: `Draw fraco no turn — cheque. Sem equity suficiente para semi-bluff lucrativo. Realize equity de graça.` }
      }
      if (strength >= 45) {
        const sz: GtoAction = draws.includes('Flush Draw') ? 'bet_50' : 'bet_33'
        return { primaryAction: sz, primaryFrequency: 0.65, alternativeAction: 'check', alternativeFrequency: 0.35, explanation: `Semi-bluff com ${draws.join(' + ')} — aposte para fold equity + equity quando chamado.` }
      }
      return { primaryAction: 'bet_33', primaryFrequency: 0.45, alternativeAction: 'check', alternativeFrequency: 0.55, explanation: `Semi-bluff fraco — bet pequeno com menos frequência. Prefira checar.` }
    }
    if (category === 'overcards') {
      if (isTurn) return { primaryAction: 'check', primaryFrequency: 0.90, alternativeAction: 'bet_50', alternativeFrequency: 0.10, explanation: `Overcards no turn — cheque quase sempre. Bluff raramente; villain chamou o flop com mão razoável.` }
      return { primaryAction: 'check', primaryFrequency: 0.75, alternativeAction: 'bet_33', alternativeFrequency: 0.25, explanation: `Duas overcards — cheque para ver turn. Bet 33% raramente como bluff.` }
    }
    // Air
    if (isTurn) {
      return { primaryAction: 'check', primaryFrequency: 0.88, alternativeAction: 'bet_67', alternativeFrequency: 0.12, explanation: `Nada no turn — cheque quase sempre. Bluff puro no turn só em spots muito específicos (pot grande, villain capped, fold equity alta). Use sizing grande quando bluffa (bet_67 ou pot).` }
    }
    if (dry && !paired && potType === 'SRP') {
      return { primaryAction: 'bet_33', primaryFrequency: 0.45, alternativeAction: 'check', alternativeFrequency: 0.55, explanation: `Nada em board seco — aposte 33% moderadamente como bluff. Boards secos = mais fold equity.` }
    }
    return { primaryAction: 'check', primaryFrequency: 0.82, alternativeAction: 'bet_33', alternativeFrequency: 0.18, explanation: `Nada — cheque quase sempre. Bet 33% raramente como bluff puro.` }
  }

  // OOP strategy — check-raise é uma linha poderosa aqui
  const isCheckRaiseCandidate =
    isNutted ||
    (isStrong && (wet || paired)) ||
    (!isTurn && hasDraw && strength >= 45 && draws.some(d => d.includes('Flush') || d === 'OESD'))

  if (isNutted) {
    // SPR baixo: bet pot imediato OOP — não precisar de check-raise com stack comprometido
    if (isShortSPR) return {
      primaryAction: 'bet_pot', primaryFrequency: 0.88,
      alternativeAction: 'check_raise', alternativeFrequency: 0.12,
      checkRaiseCandidate: false,
      explanation: `${handEval.label} OOP com SPR baixo (${spr.toFixed(1)}) — bet pot (88%). Stack comprometido: donk bet pot extrai valor imediato. Check-raise 12% para balancear.`
    }
    if (isTurn) {
      return {
        primaryAction: 'check_raise', primaryFrequency: 0.65,
        alternativeAction: 'bet_75', alternativeFrequency: 0.35,
        checkRaiseCandidate: true,
        explanation: `${handEval.label} OOP no turn — Check-Raise (65%) é a linha ideal: pot é maior, ranges são mais polarizadas. Donk bet 75% (35%) também extrai valor máximo. Não slow play no turn — river pode ser scare card.`
      }
    }
    if (wet || monotone) {
      return {
        primaryAction: 'check_raise', primaryFrequency: 0.60,
        alternativeAction: 'bet_67', alternativeFrequency: 0.40,
        checkRaiseCandidate: true,
        explanation: `${handEval.label} OOP board molhado — Check-Raise (60%) nega equity dos draws E constrói pot. Donk bet 67% (40%) balanceia sua linha.`
      }
    }
    return {
      primaryAction: 'bet_67', primaryFrequency: 0.55,
      alternativeAction: 'check', alternativeFrequency: 0.45,
      checkRaiseCandidate: true,
      explanation: `${handEval.label} OOP — donk bet 67% (55%) ou check para check-raise (45%). No check, levante se villain aposta. Ambas as linhas são excelentes.`
    }
  }
  if (isStrong) {
    const crFreq = (wet || paired) ? 0.40 : 0.25
    const betSz: GtoAction = isTurn ? 'bet_67' : 'bet_50'
    return {
      primaryAction: 'check', primaryFrequency: 0.60,
      alternativeAction: betSz, alternativeFrequency: 0.40,
      checkRaiseCandidate: crFreq >= 0.35,
      explanation: `${handEval.label} OOP${isTurn ? ' turn' : ''} — cheque (60%) para check-call/check-raise. Donk bet ${isTurn ? '67%' : '50%'} (40%) desequilibra villain.${crFreq >= 0.35 ? ` Check-raise ~${Math.round(crFreq*100)}% das vezes que villain aposta.` : ''}`
    }
  }
  if (hasDraw && strength >= 40) {
    if (isTurn) {
      return {
        primaryAction: 'check', primaryFrequency: 0.70,
        alternativeAction: 'bet_67', alternativeFrequency: 0.30,
        checkRaiseCandidate: draws.some(d => d.includes('Flush')),
        explanation: `Draw OOP no turn — cheque (70%) para check-call se tiver equity (FD: 9 outs ≈19%). Donk bet 67% (30%) como semi-bluff em boards favoráveis. Não cheque-fold com FD no turn.`
      }
    }
    const primaryAction: GtoAction = draws.includes('Flush Draw') && draws.includes('OESD') ? 'check_raise' : 'check'
    return {
      primaryAction,
      primaryFrequency: 0.55,
      alternativeAction: 'bet_50',
      alternativeFrequency: 0.45,
      checkRaiseCandidate: true,
      explanation: `Semi-bluff OOP com ${draws.join(' + ')} — ${primaryAction === 'check_raise' ? 'Check-Raise (55%) para combo draws poderosos. ' : ''}Divida entre check para check-raise e donk bet 50%. Não cheque-fold!`
    }
  }
  if (isMedium) {
    return {
      primaryAction: 'check', primaryFrequency: isTurn ? 0.90 : 0.80,
      alternativeAction: isTurn ? 'bet_50' : 'bet_33',
      alternativeFrequency: isTurn ? 0.10 : 0.20,
      checkRaiseCandidate: false,
      explanation: `${handEval.label} OOP${isTurn ? ' turn — cheque quase sempre. Pot ficou grande, sem draws, pot control é essencial. Donk bet 50% muito raramente.' : ' — cheque na maioria. Donk bet 33% ocasional.'}`
    }
  }
  return {
    primaryAction: 'check', primaryFrequency: isTurn ? 0.95 : 0.90,
    alternativeAction: isTurn ? 'bet_67' : 'bet_33',
    alternativeFrequency: isTurn ? 0.05 : 0.10,
    checkRaiseCandidate: false,
    explanation: `Mão fraca OOP${isTurn ? ' turn — cheque quase sempre. Se bluffa no turn, use bet grande (67%+): polarize sua linha de bluff.' : ' — cheque quase sempre. Bluff 33% raramente em spots específicos.'}`
  }
}

export function generateRandomCards(count: number, exclude: Card[] = []): Card[] {
  const excludeSet = new Set(exclude.map(c => `${c.rank}${c.suit}`))
  const pool: Card[] = []
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      const key = `${rank}${suit}`
      if (!excludeSet.has(key)) pool.push({ rank, suit })
    }
  }
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

// ============================================================
// MONTE CARLO EQUITY CALCULATOR
// ============================================================

// Hierarchy de categorias para comparação precisa de mãos
const CATEGORY_RANK: Record<PostflopHandCategory, number> = {
  air: 0, overcards: 1, draw_weak: 2, draw_medium: 3, draw_strong: 4,
  underpair: 5, bottom_pair: 6, middle_pair: 7, tpwk: 8, tpgk: 9, tptk: 10,
  overpair: 11, two_pair: 12, trips: 13, set: 14, straight: 15, flush: 16,
  full_house: 17, quads: 18,
}

function compareHands(a: PostflopHandEval, b: PostflopHandEval): number {
  const catDiff = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category]
  if (catDiff !== 0) return catDiff
  return a.strength - b.strength
}

/**
 * Gera todos os combos específicos de uma notação de mão (ex: 'AA', 'AKs', 'AKo')
 * excluindo cartas já usadas.
 */
export function generateHandCombos(handStr: string, exclude: Card[] = []): [Card, Card][] {
  const ex = new Set(exclude.map(c => `${c.rank}${c.suit}`))
  const combos: [Card, Card][] = []
  const available = (r: Rank, s: Suit) => !ex.has(`${r}${s}`)

  if (handStr.length === 2 && handStr[0] === handStr[1]) {
    // Par: ex 'AA'
    const rank = handStr[0] as Rank
    const avail = SUITS.filter(s => available(rank, s)).map(s => ({ rank, suit: s }))
    for (let i = 0; i < avail.length; i++)
      for (let j = i + 1; j < avail.length; j++)
        combos.push([avail[i], avail[j]])
  } else if (handStr.endsWith('s')) {
    // Suited: ex 'AKs'
    const r1 = handStr[0] as Rank, r2 = handStr[1] as Rank
    for (const s of SUITS)
      if (available(r1, s) && available(r2, s))
        combos.push([{ rank: r1, suit: s }, { rank: r2, suit: s }])
  } else {
    // Offsuit (ou sem sufixo = ambos): ex 'AKo' ou 'AK'
    const r1 = handStr[0] as Rank
    const r2 = handStr.endsWith('o') ? handStr[1] as Rank : handStr[1] as Rank
    for (const s1 of SUITS)
      for (const s2 of SUITS) {
        if (s1 === s2) continue
        if (available(r1, s1) && available(r2, s2))
          combos.push([{ rank: r1, suit: s1 }, { rank: r2, suit: s2 }])
      }
  }
  return combos
}

export interface MonteCarloResult {
  equity: number
  wins: number
  ties: number
  losses: number
  totalRuns: number
  heroWinPct: number
  tiePct: number
  lossPct: number
}

/**
 * Calcula equity via Monte Carlo.
 * villainRange: array de strings como ['AA','KK','AKs','AKo']
 */
export function runMonteCarloEquity(
  heroCards: [Card, Card],
  villainRange: string[],
  iterations = 2000
): MonteCarloResult {
  // Gerar todos os combos válidos do villain
  const villainCombos: [Card, Card][] = []
  for (const hand of villainRange) {
    villainCombos.push(...generateHandCombos(hand, [...heroCards]))
  }

  if (villainCombos.length === 0) {
    return { equity: 0.5, wins: 0, ties: 0, losses: 0, totalRuns: 0, heroWinPct: 50, tiePct: 0, lossPct: 50 }
  }

  let wins = 0, ties = 0, losses = 0, runs = 0

  for (let i = 0; i < iterations; i++) {
    const vCards = villainCombos[Math.floor(Math.random() * villainCombos.length)]
    const board = generateRandomCards(5, [...heroCards, ...vCards])
    if (board.length < 5) continue

    const heroEval = evaluatePostflopHand(heroCards, board)
    const villEval = evaluatePostflopHand(vCards, board)
    const cmp = compareHands(heroEval, villEval)

    if (cmp > 0) wins++
    else if (cmp < 0) losses++
    else ties++
    runs++
  }

  const equity = runs > 0 ? (wins + ties * 0.5) / runs : 0.5
  return {
    equity,
    wins, ties, losses, totalRuns: runs,
    heroWinPct: Math.round((wins / runs) * 100),
    tiePct: Math.round((ties / runs) * 100),
    lossPct: Math.round((losses / runs) * 100),
  }
}

/**
 * Conta combos de uma mão contra um conjunto de cartas heroicas.
 * Usado no Combinatorics Trainer.
 */
export function countRemainingCombos(handStr: string, heroCards: Card[]): number {
  return generateHandCombos(handStr, heroCards).length
}

export function totalCombosForHand(handStr: string): number {
  return generateHandCombos(handStr, []).length
}

/**
 * Versão pós-flop do Monte Carlo: o board é FIXO (3, 4 ou 5 cartas já reveladas),
 * só completa as cartas restantes. Usado no PostflopTrainer pra mostrar equity
 * do hero vs range estimado do villain no spot atual.
 */
export function runMonteCarloEquityPostflop(
  heroCards: [Card, Card],
  board: Card[],
  villainRange: string[],
  iterations = 500
): MonteCarloResult {
  const used = [...heroCards, ...board]
  const villainCombos: [Card, Card][] = []
  for (const hand of villainRange) {
    villainCombos.push(...generateHandCombos(hand, used))
  }

  if (villainCombos.length === 0) {
    return { equity: 0.5, wins: 0, ties: 0, losses: 0, totalRuns: 0, heroWinPct: 50, tiePct: 0, lossPct: 50 }
  }

  const cardsToComplete = Math.max(0, 5 - board.length)
  let wins = 0, ties = 0, losses = 0, runs = 0

  for (let i = 0; i < iterations; i++) {
    const vCards = villainCombos[Math.floor(Math.random() * villainCombos.length)]
    const completion = cardsToComplete > 0
      ? generateRandomCards(cardsToComplete, [...used, ...vCards])
      : []
    if (completion.length < cardsToComplete) continue

    const fullBoard = [...board, ...completion]
    const heroEval = evaluatePostflopHand(heroCards, fullBoard)
    const villEval = evaluatePostflopHand(vCards, fullBoard)
    const cmp = compareHands(heroEval, villEval)

    if (cmp > 0) wins++
    else if (cmp < 0) losses++
    else ties++
    runs++
  }

  const equity = runs > 0 ? (wins + ties * 0.5) / runs : 0.5
  return {
    equity,
    wins, ties, losses, totalRuns: runs,
    heroWinPct: runs > 0 ? Math.round((wins / runs) * 100) : 50,
    tiePct:    runs > 0 ? Math.round((ties / runs) * 100) : 0,
    lossPct:   runs > 0 ? Math.round((losses / runs) * 100) : 50,
  }
}
