// ============================================================
// POKERMIND PRO â€” DADOS MOCKADOS DE RANGES PRÃ‰-FLOP
// Ranges GTO simplificados para treino educacional
// ============================================================

import { PreflopDrillQuestion, Position, TableFormat } from '@/types'

// ------- MÃƒOS NA FRONTEIRA DOS RANGES -------
// MÃ£os que tipicamente ficam DENTRO OU FORA do range dependendo da posiÃ§Ã£o.
// SÃ£o os spots mais difÃ­ceis e onde o usuÃ¡rio precisa memorizar a fronteira.
// Utilizadas pelos pools de treino para enfatizar decisÃµes borderline.
export const MARGINAL_HANDS: ReadonlySet<string> = new Set<string>([
  // Small/medium pairs
  '22','33','44','55','66','77',
  // Ax suited fracos
  'A2s','A3s','A4s','A5s','A6s','A7s','A8s','A9s',
  // Ax offsuit fracos/medianos
  'A2o','A3o','A4o','A5o','A6o','A7o','A8o','A9o','ATo',
  // Kx suited fracos
  'K2s','K3s','K4s','K5s','K6s','K7s','K8s','K9s',
  // Kx offsuit medianos
  'K9o','KTo','KJo',
  // Qx suited fracos/medianos
  'Q5s','Q6s','Q7s','Q8s','Q9s','QTs',
  // Qx offsuit
  'Q9o','QTo','QJo',
  // Jx
  'J6s','J7s','J8s','J9s','JTs',
  'J9o','JTo',
  // Tx
  'T6s','T7s','T8s','T9s',
  'T8o','T9o',
  // Suited connectors mÃ©dios/fracos
  '98s','97s','96s','87s','86s','85s','76s','75s','65s','64s','54s','53s',
  // Offsuit connectors fracos
  '98o','87o','76o',
])

// ------- RANGES PRÃ‰-FLOP PARA POSTFLOP -------
// Quando o usuÃ¡rio treina pÃ³s-flop num spot SRP IP / SRP OOP / 3bet IP / 3bet OOP,
// o herÃ³i deve receber cartas amostradas de um range prÃ©-flop realista â€” nÃ£o 100%
// aleatÃ³rias. Isso evita receber 72o num pote 3-bet (nÃ£o chegaria ao flop).
export const POSTFLOP_PREFLOP_RANGES = {
  SRP_IP: [
    // BTN open (~45%) â€” IP tÃ­pico em SRP
    'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
    'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'AKo','AQo','AJo','ATo','A9o','A8o',
    'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
    'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
    'JTs','J9s','J8s','J7s','J6s',
    'T9s','T8s','T7s','T6s',
    '98s','97s','96s','87s','86s','76s','75s','65s','64s','54s',
    'KQo','KJo','KTo','QJo','QTo','JTo',
  ],
  SRP_OOP: [
    // BB defense vs BTN open (~45%) â€” OOP tÃ­pico em SRP
    'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
    'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o',
    'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
    'QJs','QTs','Q9s','Q8s','Q7s',
    'JTs','J9s','J8s','J7s',
    'T9s','T8s','T7s',
    '98s','97s','87s','86s','76s','75s','65s',
    'KQo','KJo','KTo','K9o','QJo','QTo','Q9o','JTo','J9o','T9o','98o','87o','76o',
  ],
  THREEBET_IP: [
    // Range de CALL ao 3-bet (BTN/CO call BB 3-bet) â€” IP em pote 3-bet
    'TT','99','88','77',
    'AKs','AQs','AJs','ATs','A5s','A4s',
    'AKo','AQo',
    'KQs','KJs','KTs','QJs','QTs','JTs','T9s','98s',
  ],
  THREEBET_OOP: [
    // Range de 3-BET tÃ­pico (SB/BB 3-bets BTN/CO) â€” OOP em pote 3-bet
    'AA','KK','QQ','JJ','TT','99',
    'AKs','AQs','AJs','ATs',
    'AKo','AQo',
    'A5s','A4s','A3s','A2s',
    'KQs','KJs',
  ],
} as const

// ------- RANGES DEFENSIVAS DE IP (BTN/CO/HJ) POR POSIÃ‡ÃƒO DO OPENER -------
// Importante: ranges incluem call + 3-bet. O grid colore por categoria
// (call=verde, 3bet=laranja) checando THREE_BET_RANGES por hand.
// Vs early position (UTG/HJ), o range Ã© MUITO mais tight que vs late (CO/SB).

// BTN defesa vs cada opener
export const BTN_DEFENSE_RANGES_VS_OPENER: Partial<Record<Position, string[]>> = {
  // vs UTG (range ~12-15%, super tight) â€” call sÃ³ com hands que beat UTG range
  UTG: [
    // call: pairs + premium suited broadways + JTs
    '55','66','77','88','99','TT',
    'AJs','ATs',
    'KQs','KJs','KTs',
    'QJs',
    'JTs',
    'AQo','KQo',
    // 3-bet (vai pegar laranja no grid via THREE_BET_RANGES)
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s','A4s','K5s',
  ],
  'UTG+1': [
    '55','66','77','88','99','TT',
    'AJs','ATs',
    'KQs','KJs','KTs',
    'QJs','QTs',
    'JTs',
    'AQo','KQo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s','A4s','K5s',
  ],
  'UTG+2': [
    '44','55','66','77','88','99','TT',
    'AJs','ATs','A9s','A5s','A4s',
    'KQs','KJs','KTs','K9s',
    'QJs','QTs',
    'JTs','T9s',
    'AQo','AJo','KQo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo',
  ],
  LJ: [
    '33','44','55','66','77','88','99','TT',
    'AJs','ATs','A9s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s',
    'QJs','QTs','Q9s',
    'JTs','J9s',
    'T9s','T8s',
    '98s','87s','76s',
    'AQo','AJo','KQo','KJo','QJo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s','A4s','K5s',
  ],
  // vs HJ (~20-25%): wider call range
  HJ: [
    '22','33','44','55','66','77','88','99','TT',
    'AJs','ATs','A9s','A8s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s',
    'QJs','QTs','Q9s',
    'JTs','J9s',
    'T9s','T8s',
    '98s','87s','76s',
    'AQo','AJo','KQo','KJo','QJo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s','A4s','K5s',
  ],
  // vs CO (~28-30%): quase a call range completa do BTN
  CO: [
    '22','33','44','55','66','77','88','99','TT',
    'AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s',
    'QJs','QTs','Q9s','Q8s',
    'JTs','J9s','J8s',
    'T9s','T8s','T7s',
    '98s','97s','87s','86s','76s','65s','54s',
    'AQo','AJo','ATo','KQo','KJo','KTo','QJo','QTo','JTo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s','A4s','K5s',
  ],
  // vs SB (SB abre wide ~45%): BTN call quase tudo do open range
  SB: [
    '22','33','44','55','66','77','88','99','TT',
    'AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
    'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
    'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
    'JTs','J9s','J8s','J7s',
    'T9s','T8s','T7s',
    '98s','97s','87s','76s','65s','54s',
    'AQo','AJo','ATo','KQo','KJo','KTo','QJo','QTo','JTo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s','A4s','K5s',
  ],
}

// CO defesa vs cada opener (similar lÃ³gica, mais tight no geral)
export const CO_DEFENSE_RANGES_VS_OPENER: Partial<Record<Position, string[]>> = {
  UTG: [
    '66','77','88','99','TT',
    'AJs','ATs',
    'KQs','KJs',
    'QJs',
    'JTs',
    'AQo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s',
  ],
  HJ: [
    '22','33','44','55','66','77','88','99','TT',
    'AJs','ATs','A5s','A4s',
    'KQs','KJs','KTs',
    'QJs','QTs',
    'JTs','T9s',
    'AQo','AJo','KQo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s',
  ],
}

// HJ defesa vs UTG (Ãºnica defesa real comum)
export const HJ_DEFENSE_RANGES_VS_OPENER: Partial<Record<Position, string[]>> = {
  UTG: [
    '77','88','99','TT',
    'AJs','ATs',
    'KQs',
    'QJs',
    'JTs',
    'AQo',
    'AA','KK','QQ','JJ','AKs','AQs','AKo','A5s',
  ],
}

// Helper: retorna defesa range para hero IP vs opener especÃ­fico
export function getIPDefenseRange(heroPos: Position, villainPos: Position): string[] | null {
  if (heroPos === 'BTN') return BTN_DEFENSE_RANGES_VS_OPENER[villainPos] || null
  if (heroPos === 'CO')  return CO_DEFENSE_RANGES_VS_OPENER[villainPos] || null
  if (heroPos === 'HJ')  return HJ_DEFENSE_RANGES_VS_OPENER[villainPos] || null
  return null
}

// ------- ORDEM DE AÃ‡ÃƒO PREFLOP (UTG age primeiro, BB por Ãºltimo) -------
// Menor idx = age mais cedo no preflop. Usado para validar combos
// hero/villain — em vs_raise/3bet/squeeze hero age DEPOIS do opener.
export const PREFLOP_POSITION_ORDER: Position[] = [
  'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'
]

export function preflopIdx(pos: Position): number {
  return PREFLOP_POSITION_ORDER.indexOf(pos)
}

// Retorna posiÃ§Ãµes vÃ¡lidas do villain para um cenÃ¡rio + hero.
// Ãštil tanto para UI (filtra botÃµes) quanto para geraÃ§Ã£o aleatÃ³ria.
export function getValidVillainPositions(
  scenario: string,
  heroPos: Position,
  tableFormat: 'HU' | '6max' | '9max' = '6max'
): Position[] {
  const formatPos = POSITIONS_BY_FORMAT[tableFormat]
  switch (scenario) {
    case 'bb_defense':
      // Hero Ã© BB, villain Ã© qualquer opener exceto BB.
      return formatPos.filter(p => p !== 'BB' && p !== heroPos)
    case 'vs_raise':
    case '3bet':
    case 'squeeze':
      // Villain abriu, hero age depois. Hero nÃ£o pode ser BB se opener Ã© BB
      // (BB nÃ£o open-raise por padrÃ£o). Villain deve agir ANTES do hero.
      return formatPos.filter(p =>
        p !== heroPos &&
        preflopIdx(p) < preflopIdx(heroPos) &&
        p !== 'BB'
      )
    case '4bet':
      // Hero abriu, villain 3-betou. Villain age DEPOIS do hero.
      return formatPos.filter(p =>
        p !== heroPos &&
        preflopIdx(p) > preflopIdx(heroPos)
      )
    case 'sb_vs_bb':
      // Hero=SB, villain=BB.
      return heroPos === 'SB' ? ['BB'] : ['SB']
    default:
      // open_raise, push_fold: sem villain selecionÃ¡vel
      return []
  }
}

// Retorna posiÃ§Ãµes vÃ¡lidas do hero para um cenÃ¡rio + villain (inverso do acima).
export function getValidHeroPositions(
  scenario: string,
  villainPos: Position,
  tableFormat: 'HU' | '6max' | '9max' = '6max',
  scenarioPositions: Position[] = []
): Position[] {
  const formatPos = POSITIONS_BY_FORMAT[tableFormat]
  const allowed = scenarioPositions.length > 0
    ? formatPos.filter(p => scenarioPositions.includes(p))
    : formatPos
  switch (scenario) {
    case 'vs_raise':
    case '3bet':
    case 'squeeze':
      // Hero age depois do villain
      return allowed.filter(p => p !== villainPos && preflopIdx(p) > preflopIdx(villainPos))
    case '4bet':
      // Hero age antes do villain
      return allowed.filter(p => p !== villainPos && preflopIdx(p) < preflopIdx(villainPos))
    case 'bb_defense':
      return ['BB']
    case 'sb_vs_bb':
      return ['SB']
    default:
      return allowed.filter(p => p !== villainPos)
  }
}

// ------- ORDEM DE AÃ‡ÃƒO POSTFLOP (mais OOP â†’ mais IP) -------
// Postflop: SB age primeiro (mais OOP), BTN por Ãºltimo (mais IP).
// Quanto MAIOR o Ã­ndice, MAIS IP.
export const POSTFLOP_POSITION_ORDER: Position[] = [
  'SB', 'BB', 'UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN'
]

export function computeIPOOP(heroPos: Position, villainPos: Position): 'IP' | 'OOP' {
  const order = POSTFLOP_POSITION_ORDER
  const hIdx = order.indexOf(heroPos)
  const vIdx = order.indexOf(villainPos)
  return hIdx > vIdx ? 'IP' : 'OOP'
}

// ------- RANGE PREFLOP DO HERO POR POSIÃ‡ÃƒO ESPECÃFICA -------
// Substitui POSTFLOP_PREFLOP_RANGES (que era fixo BTN/BB) por algo dinÃ¢mico
// baseado nas posiÃ§Ãµes reais de hero e villain.
//
// LÃ³gica:
//  â€¢ SRP â€” quem nÃ£o Ã© blind = opener, quem Ã© blind = defensor
//    - Hero opener: usa OPEN_RAISE_RANGES[heroPos]
//    - Hero defensor BB: usa BB_DEFENSE_RANGES[villainPos]
//    - Hero defensor SB: BB defense (com leve aperto)
//    - SB vs BB: usa SB_VS_BB_RAISE_RANGES / BB_VS_SB_DEFENSE_RANGES
//  â€¢ 3-bet pot â€” quem 3-betou vs quem chamou o 3-bet
//    - Hero blind 3-bettor: THREE_BET_RANGES[heroPos]
//    - Hero opener que chamou 3-bet: range de call-3bet IP (tighter)
//    - Hero nÃ£o-blind 3-bettor (squeeze-like): THREE_BET_RANGES[heroPos]
export function getHeroPreflopRangeByPosition(
  heroPos: Position,
  villainPos: Position,
  potType: 'SRP' | '3bet'
): string[] {
  const heroIsBlind = heroPos === 'SB' || heroPos === 'BB'
  const villainIsBlind = villainPos === 'SB' || villainPos === 'BB'

  if (potType === 'SRP') {
    // SB vs BB explÃ­cito
    if (heroPos === 'SB' && villainPos === 'BB') return [...SB_VS_BB_RAISE_RANGES]
    if (heroPos === 'BB' && villainPos === 'SB') return [...BB_VS_SB_DEFENSE_RANGES]

    // Hero Ã© opener (nÃ£o-blind), villain defende
    if (!heroIsBlind && villainIsBlind) {
      return [...(OPEN_RAISE_RANGES[heroPos] || OPEN_RAISE_RANGES['BTN'] || [])]
    }
    // Hero defende blind, villain abriu
    if (heroIsBlind && !villainIsBlind) {
      if (heroPos === 'BB') {
        return [...(BB_DEFENSE_RANGES[villainPos] || BB_DEFENSE_RANGES['BTN'] || [])]
      }
      // SB defense: aproxima como BB defense (sem mÃ£os mais marginais)
      const bbDef = BB_DEFENSE_RANGES[villainPos] || BB_DEFENSE_RANGES['BTN'] || []
      // SB defende mais tight que BB (precisa de equity contra 2 players potencial)
      return [...bbDef].slice(0, Math.floor(bbDef.length * 0.75))
    }
    // Ambos nÃ£o-blinds (ex: CO open + BTN call) â€” hero Ã© caller late position
    if (!heroIsBlind && !villainIsBlind) {
      // Hero call IP em SRP: range mais tight que o open dele (mÃ£os que jogam bem em posiÃ§Ã£o)
      return [...(OPEN_RAISE_RANGES[heroPos] || OPEN_RAISE_RANGES['BTN'] || [])]
    }
    // Ambos blinds: jÃ¡ tratado acima â€” fallback
    return [...(OPEN_RAISE_RANGES['BTN'] || [])]
  }

  // === 3-bet pot ===
  // Hero blind 3-bettor (mais comum)
  if (heroIsBlind && !villainIsBlind) {
    return [...(THREE_BET_RANGES[heroPos] || THREE_BET_RANGES['BB'] || [])]
  }
  // Hero opener que chamou 3-bet â€” usa range estÃ¡tica IP de call 3bet
  if (!heroIsBlind && villainIsBlind) {
    return [...POSTFLOP_PREFLOP_RANGES.THREEBET_IP]
  }
  // Hero nÃ£o-blind 3-bettor (squeeze ou 3-bet IP/OOP em pots multipos)
  if (!heroIsBlind && !villainIsBlind) {
    return [...(THREE_BET_RANGES[heroPos] || THREE_BET_RANGES['CO'] || [])]
  }
  // Ambos blinds em 3-bet pot (SB 3-bets BB, raro mas possÃ­vel)
  return [...(THREE_BET_RANGES[heroPos] || THREE_BET_RANGES['BB'] || [])]
}

// ------- FORMATO DE MESA: POSIÃ‡Ã•ES DISPONÃVEIS -------
// A lÃ³gica de range Ã© baseada em "quantos jogadores ficam atrÃ¡s de vocÃª"
// HU BTN = 1 atrÃ¡s; 9max UTG = 8 atrÃ¡s
export const POSITIONS_BY_FORMAT: Record<TableFormat, Position[]> = {
  'HU':   ['BTN', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '9max': ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
}

// ------- RANGES DE OPEN RAISE POR POSIÃ‡ÃƒO -------
// Representados como arrays de mÃ£os no formato padrÃ£o

export const OPEN_RAISE_RANGES: Record<Position, string[]> = {
  'UTG': [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
    'AKs', 'AQs', 'AJs', 'ATs',
    'AKo', 'AQo',
    'KQs', 'KJs',
    'QJs',
  ],
  'UTG+1': [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s',
    'AKo', 'AQo', 'AJo',
    'KQs', 'KJs', 'KTs',
    'QJs', 'QTs',
    'JTs',
  ],
  'HJ': [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s',
    'AKo', 'AQo', 'AJo', 'ATo',
    'KQs', 'KJs', 'KTs', 'K9s',
    'QJs', 'QTs', 'Q9s',
    'JTs', 'J9s',
    'T9s',
    'KQo',
  ],
  'CO': [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s',
    'QJs', 'QTs', 'Q9s', 'Q8s',
    'JTs', 'J9s', 'J8s',
    'T9s', 'T8s',
    '98s', '87s',
    'KQo', 'KJo',
  ],
  'BTN': [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s',
    'JTs', 'J9s', 'J8s', 'J7s', 'J6s',
    'T9s', 'T8s', 'T7s', 'T6s',
    '98s', '97s', '96s', '87s', '86s', '76s', '75s', '65s', '64s', '54s',
    'KQo', 'KJo', 'KTo',
    'QJo', 'QTo',
    'JTo',
  ],
  'SB': [
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s',
    'QJs', 'QTs', 'Q9s',
    'JTs', 'J9s',
    'T9s', '98s', '87s', '76s',
    'KQo', 'KJo', 'KTo',
    'QJo',
  ],
  'BB':     [], // BB defende, nÃ£o open-raise normalmente
  'UTG+2':  [], // definido em OPEN_RAISE_RANGES_BY_FORMAT
  'LJ':     [], // definido em OPEN_RAISE_RANGES_BY_FORMAT
}

// ------- RANGE DE DEFESA DO BB (vs open de cada posiÃ§Ã£o) -------
// Representa mÃ£os que o BB deve defender (call ou 3bet) vs open raise
export const BB_DEFENSE_RANGES: Record<Position, string[]> = {
  'BTN': [ // BB vs BTN open (~45% das mÃ£os)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s',
    'JTs', 'J9s', 'J8s', 'J7s',
    'T9s', 'T8s', 'T7s',
    '98s', '97s', '87s', '86s', '76s', '75s', '65s',
    'KQo', 'KJo', 'KTo', 'K9o',
    'QJo', 'QTo', 'Q9o',
    'JTo', 'J9o',
    'T9o', '98o', '87o', '76o',
  ],
  'CO': [ // BB vs CO open (~40% das mÃ£os)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s',
    'QJs', 'QTs', 'Q9s', 'Q8s',
    'JTs', 'J9s', 'J8s',
    'T9s', 'T8s', '98s', '97s', '87s', '76s', '65s',
    'KQo', 'KJo', 'KTo',
    'QJo', 'QTo',
    'JTo', 'T9o', '98o',
  ],
  'HJ': [ // BB vs HJ open (~35% das mÃ£os)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s',
    'QJs', 'QTs', 'Q9s',
    'JTs', 'J9s', 'J8s', 'T9s', 'T8s', '98s', '87s', '76s',
    'KQo', 'KJo', 'QJo', 'JTo',
  ],
  'UTG': [ // BB vs UTG open (~25% das mÃ£os â€” range UTG Ã© tight)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s', 'A4s',
    'AKo', 'AQo', 'AJo',
    'KQs', 'KJs', 'KTs', 'K9s',
    'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s',
    'KQo', 'QJo',
  ],
  'SB': [ // BB vs SB open (~55% das mÃ£os â€” SB abre muito wide)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s',
    'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s',
    'JTs', 'J9s', 'J8s', 'J7s',
    'T9s', 'T8s', 'T7s', '98s', '97s', '87s', '86s', '76s', '75s', '65s', '64s', '54s',
    'KQo', 'KJo', 'KTo', 'K9o', 'K8o',
    'QJo', 'QTo', 'Q9o', 'Q8o',
    'JTo', 'J9o', 'J8o',
    'T9o', 'T8o', '98o', '97o', '87o', '76o',
  ],
  'BB':     [],  // BB nÃ£o defende vs si mesmo
  'UTG+1':  [],  // mesmo range que UTG (villain tight)
  'UTG+2':  [],  // mesmo range que UTG
  'LJ':     [],  // mesmo range que UTG (range mais amplo vs LJ = igual vs UTG 6max)
}

// ------- RANGES DE 3BET -------
export const THREE_BET_RANGES: Record<Position, string[]> = {
  'BTN':    ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo', 'A5s', 'A4s', 'K5s'],
  'CO':     ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AJs', 'AKo', 'A5s'],
  'SB':     ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AJs', 'AKo', 'AQo', 'A5s', 'A4s', 'A3s', 'KQs'],
  'BB':     ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AJs', 'AKo', 'AQo', 'A9s', 'A4s', 'A3s', 'KQs', 'KJs'],
  'UTG':    ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'],
  'UTG+1':  ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'],
  'UTG+2':  ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'], // similar a UTG+1
  'LJ':     ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo', 'A5s'], // igual ao HJ
  'HJ':     ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo', 'A5s'],
}

// ------- RANGES DE 4-BET (hero abriu, villain 3-betou, hero decide) -------
// EstratÃ©gia polarizada: valor (AA/KK/QQ/AK) + bluffs com bloqueadores (A5s-A2s)
// "position" = posiÃ§Ã£o do hero (quem abriu e recebeu o 3-bet)
export const FOUR_BET_RANGES: Record<Position, string[]> = {
  'UTG':   ['AA', 'KK', 'AKs', 'AKo', 'A5s'],
  'UTG+1': ['AA', 'KK', 'AKs', 'AKo', 'A5s'],
  'UTG+2': ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s'],
  'LJ':    ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s', 'A4s'],
  'HJ':    ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s', 'A4s'],
  'CO':    ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s', 'A4s', 'A3s'],
  'BTN':   ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs'],
  'SB':    ['AA', 'KK', 'QQ', 'AKs', 'AQs', 'AKo', 'A5s', 'A4s', 'A3s'],
  'BB':    ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'A5s', 'A4s', 'A3s', 'A2s'],
}

// ------- RANGES DE SQUEEZE (3-bet apÃ³s raise + 1+ caller) -------
// Squeeze Ã© mais tight que 3-bet HU: precisa de equity vs 2+ jogadores + fold equity menor
// "position" = posiÃ§Ã£o do squeezer
export const SQUEEZE_RANGES: Record<Position, string[]> = {
  'UTG+2': ['AA', 'KK', 'AKs', 'AKo'],
  'LJ':    ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s'],
  'BTN': [
    // BTN squeeze vs open+caller: range sÃ³lido, IP.
    // TT removido â€” em squeeze IP vs single late open+caller, TT Ã© mais call
    // (realiza equity multiway, nÃ£o bloqueia AK/AQ). Ver q039.
    'AA', 'KK', 'QQ', 'JJ',
    'AKs', 'AQs', 'AJs',
    'AKo', 'AQo',
    'A5s', 'A4s', // bluffs com bloqueadores
    'KQs',
  ],
  'CO': [
    // CO squeeze vs early open + caller: mais tight
    'AA', 'KK', 'QQ', 'JJ',
    'AKs', 'AQs',
    'AKo',
    'A5s', 'A4s',
  ],
  'SB': [
    // SB squeeze: OOP mas range mais wide por fold equity alta vs 2 players
    'AA', 'KK', 'QQ', 'JJ', 'TT',
    'AKs', 'AQs', 'AJs',
    'AKo', 'AQo',
    'A5s', 'A4s', 'A3s',
    'KQs',
  ],
  'BB': [
    // BB squeeze: melhor posiÃ§Ã£o para squeeze, jÃ¡ investiu 1BB
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99',
    'AKs', 'AQs', 'AJs', 'ATs',
    'AKo', 'AQo',
    'A5s', 'A4s', 'A3s', 'A2s',
    'KQs', 'KJs',
  ],
  'HJ': [
    // HJ squeeze vs UTG open + caller: muito tight
    'AA', 'KK', 'QQ',
    'AKs', 'AKo',
    'A5s',
  ],
  'UTG': [
    // UTG squeeze: raramente correto, sÃ³ premiums
    'AA', 'KK',
    'AKs', 'AKo',
  ],
  'UTG+1': ['AA', 'KK', 'AKs', 'AKo'],
}

// ------- PUSH/FOLD RANGES (por stack depth em BBs) -------
export const PUSH_FOLD_RANGES: Record<number, Record<Position, string[]>> = {
  10: {
    'BTN': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
            'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
            'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o',
            'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'KQo', 'KJo',
            'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s'],
    'CO': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s',
           'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
           'KQs', 'KJs', 'KTs', 'KQo', '87s'],
    'SB': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
           'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o',
           'KQs', 'KJs', 'KTs', 'KQo', 'KJo', 'KTo', 'JTo'],
    'HJ': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s',
           'AKo', 'AQo', 'AJo', 'ATo',
           'KQs', 'KJs', 'KQo'],
    'UTG': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99',
            'AKs', 'AQs', 'AJs', 'ATs',
            'AKo', 'AQo',
            'KQs'],
    'UTG+1': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
              'AKs', 'AQs', 'AJs', 'ATs', 'A9s',
              'AKo', 'AQo', 'AJo',
              'KQs', 'KJs'],
    'UTG+2': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
              'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s',
              'AKo', 'AQo', 'AJo',
              'KQs', 'KJs', 'KTs'],
    'LJ':    ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
              'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A5s',
              'AKo', 'AQo', 'AJo', 'ATo',
              'KQs', 'KJs', 'KTs'],
    'BB': [], // BB geralmente defende ou re-jams
  },
  15: {
    'BTN': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44',
            'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s',
            'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
            'KQs', 'KJs', 'KTs', 'KQo'],
    'CO': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s',
           'AKo', 'AQo', 'AJo',
           'KQs', 'KJs'],
    'SB': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s',
           'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
           'KQs', 'KJs', 'KTs'],
    'HJ': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A5s',
           'AKo', 'AQo', 'AJo',
           'KQs', 'KJs'],
    'UTG': ['AA', 'KK', 'QQ', 'JJ', 'TT',
            'AKs', 'AQs', 'AJs',
            'AKo', 'AQo'],
    'UTG+1': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99',
              'AKs', 'AQs', 'AJs', 'ATs',
              'AKo', 'AQo'],
    'UTG+2': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88',
              'AKs', 'AQs', 'AJs', 'ATs', 'A9s',
              'AKo', 'AQo', 'AJo',
              'KQs', 'KJs'],
    'LJ':    ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
              'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s',
              'AKo', 'AQo', 'AJo',
              'KQs', 'KJs', 'KTs'],
    'BB': [],
  },
}

// ------- RANGES POR FORMATO DE MESA -------
// Cada formato define apenas as posiÃ§Ãµes que diferem do 6-max.
// HJ, CO, BTN, SB, BB em qualquer formato full-ring = mesmo range que 6-max
// (tÃªm o mesmo nÃºmero de jogadores atrÃ¡s).
// PosiÃ§Ãµes early (UTG, UTG+1, UTG+2, LJ) ficam mais tight quanto maior a mesa.
export const OPEN_RAISE_RANGES_BY_FORMAT: Record<TableFormat, Partial<Record<Position, string[]>>> = {

  // ---- HU MTT (~65% das mÃ£os) ----
  'HU': {
    'BTN': [
      'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
      'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
      'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
      'QJs','QTs','Q9s','Q8s','Q7s','Q6s','Q5s','Q4s',
      'JTs','J9s','J8s','J7s','J6s',
      'T9s','T8s','T7s','T6s',
      '98s','97s','96s','87s','86s','85s','76s','75s','65s','64s','54s','53s',
      'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o','A2o',
      'KQo','KJo','KTo','K9o','K8o','K7o','K6o',
      'QJo','QTo','Q9o','Q8o','Q7o',
      'JTo','J9o','J8o',
      'T9o','T8o',
      '98o','87o','76o',
    ],
    'BB': [],
  },

  // ---- 6-max MTT (jÃ¡ definido em OPEN_RAISE_RANGES) ----
  '6max': {}, // usa OPEN_RAISE_RANGES como fallback

  // ---- 9-max MTT ----
  // UTG: 8 atrÃ¡s â†’ ~10%; UTG+1: 7 atrÃ¡s â†’ ~12%; UTG+2: 6 atrÃ¡s â†’ ~14%; LJ: 5 atrÃ¡s = 6max UTG
  '9max': {
    'UTG': [ // ~10% â€” o spot mais tight do poker
      'AA','KK','QQ','JJ','TT','99',
      'AKs','AQs','AJs',
      'AKo','AQo',
      'KQs',
    ],
    'UTG+1': [ // ~12%
      'AA','KK','QQ','JJ','TT','99',
      'AKs','AQs','AJs','ATs',
      'AKo','AQo',
      'KQs',
    ],
    'UTG+2': [ // ~14%
      'AA','KK','QQ','JJ','TT','99','88',
      'AKs','AQs','AJs','ATs',
      'AKo','AQo',
      'KQs','KJs',
    ],
    'LJ':  [], // usa 6max UTG (5 jogadores atrÃ¡s)
    'HJ':  [],
    'CO':  [],
    'BTN': [],
    'SB':  [],
    'BB':  [],
  },
}

// Helper: busca o range correto considerando formato + fallback para 6max
// PosiÃ§Ãµes early (UTG+1, UTG+2, LJ) em formatos onde nÃ£o hÃ¡ range especÃ­fico
// fazem fallback para 6max UTG (mesma quantidade de jogadores atrÃ¡s ou equivalente).
export function getOpenRaiseRange(format: TableFormat, position: Position): string[] {
  const formatRanges = OPEN_RAISE_RANGES_BY_FORMAT[format]
  const formatSpecific = formatRanges?.[position]
  if (formatSpecific && formatSpecific.length > 0) return formatSpecific
  // fallback inteligente: posiÃ§Ãµes early sem range prÃ³prio usam UTG do 6max
  const earlyFallback: Position[] = ['UTG+1', 'UTG+2', 'LJ']
  if (earlyFallback.includes(position) && (!OPEN_RAISE_RANGES[position] || OPEN_RAISE_RANGES[position].length === 0)) {
    return OPEN_RAISE_RANGES['UTG'] || []
  }
  return OPEN_RAISE_RANGES[position] || []
}

// ------- SB vs BB: RANGES ESPECÃFICOS -------
// DinÃ¢mica Ãºnica: SB Ã© IP no preflop mas OOP no postflop.
// SB pode limp (completar a BB por 0.5BB extra) ou raise.

// Hands que SB deve RAISE (2.5x) vs BB (~45% das mÃ£os)
export const SB_VS_BB_RAISE_RANGES: string[] = [
  // Todos os pares
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // Ax suited â€” todos
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  // Ax offsuit â€” a maioria
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o',
  // Kx suited â€” todos
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  // Kx offsuit â€” forte+
  'KQo','KJo','KTo','K9o','K8o',
  // Qx suited
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
  // Qx offsuit
  'QJo','QTo','Q9o',
  // Jx suited
  'JTs','J9s','J8s','J7s',
  // Jx offsuit
  'JTo','J9o',
  // Tx suited
  'T9s','T8s','T7s',
  // T9o
  'T9o',
  // Suited connectors mÃ©dios
  '98s','97s','87s','86s','76s','65s',
]

// Hands que SB deve LIMP (completar, nÃ£o raise) vs BB (~18% das mÃ£os)
// Objetivo: ver flop barato, evitar build pote OOP com mÃ£os marginais
export const SB_VS_BB_LIMP_RANGES: string[] = [
  // Ax offsuit fraco (prefere ver flop barato)
  'A5o','A4o','A3o','A2o',
  // Kx offsuit fraco
  'K7o','K6o','K5o','K4o','K3o','K2o',
  // Qx offsuit mÃ©dio
  'Q8o','Q7o','Q6o',
  // J8o, J7o
  'J8o','J7o',
  // T8o, T7o
  'T8o','T7o',
  // Suited connectors especulativos baixos (mix de limp e raise)
  '98o','97o','87o','86o','76o','75o','65o','64o','54o',
]

// BB vs SB open: defesa ampla (SB abre wide ~45%)
// BB pode call ou 3-bet â€” nÃ£o deve fold quase nunca
export const BB_VS_SB_DEFENSE_RANGES: string[] = [
  // Todos os pares
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // Todos os Ax suited
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  // Ax offsuit amplo
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o','A5o','A4o','A3o',
  // Kx suited todos
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s',
  // Kx offsuit amplo
  'KQo','KJo','KTo','K9o','K8o','K7o',
  // Qx suited
  'QJs','QTs','Q9s','Q8s','Q7s','Q6s',
  // Qx offsuit
  'QJo','QTo','Q9o','Q8o','Q7o',
  // Jx
  'JTs','J9s','J8s','J7s','JTo','J9o','J8o',
  // Tx
  'T9s','T8s','T7s','T6s','T9o','T8o',
  // Suited connectors
  '98s','97s','96s','87s','86s','76s','75s','65s','64s','54s','53s',
  // Offsuit connectors
  '98o','97o','87o','76o',
]

// BB vs SB: 3-bet range (mais agressivo que vs outras posiÃ§Ãµes pois SB Ã© wide)
export const BB_VS_SB_3BET_RANGES: string[] = [
  'AA','KK','QQ','JJ','TT','99',
  'AKs','AQs','AJs','ATs','A9s','AKo','AQo',
  'A5s','A4s','A3s','A2s', // bluffs com bloqueadores
  'KQs','KJs','QJs',       // suited broadways
  'T9s','98s',              // suited connectors para equity
]

// ------- BANCO DE PERGUNTAS PARA DRILLS -------
export const DRILL_QUESTIONS: PreflopDrillQuestion[] = [
  {
    id: 'q001',
    hand: 'AKs',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'AKs Ã© uma mÃ£o premium que sempre deve ser jogada como open raise em qualquer posiÃ§Ã£o. No UTG, o range Ã© tight, mas AKs estÃ¡ claramente dentro dele. A mÃ£o tem excelente equidade e pode fazer grandes potes quando vai bem.',
    evComparison: { fold: 0, call: -0.5, raise: 2.8 }
  },
  {
    id: 'q002',
    hand: 'JTs',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'JTs no UTG Ã© uma mÃ£o marginal. Em posiÃ§Ã£o early, o range deve ser tight. JTs joga bem em posiÃ§Ã£o mas perde muito valor OOP. A maioria dos solvers dobra JTs no UTG em 6-max, apesar de ser uma borderline spot.',
    evComparison: { fold: 0, call: 0, raise: 0.1 }
  },
  {
    id: 'q003',
    hand: 'KK',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'KK Ã© uma das mÃ£os mais fortes no poker. Quando hÃ¡ um open raise, sempre 3bet com KK para construir o pote com a melhor mÃ£o e maximizar EV.',
    evComparison: { fold: -1, call: 8.5, raise: 12.3 }
  },
  {
    id: 'q004',
    hand: 'A5s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'A5s contra CO open tem um misto de call e 3bet na estratÃ©gia GTO. O 3bet bluff com A5s Ã© bom pois bloqueia combos de AA e tem boa equidade quando chamado. PorÃ©m, em posiÃ§Ã£o (BTN vs CO), o call tambÃ©m Ã© excelente.',
    evComparison: { fold: 0, call: 1.8, raise: 2.1 }
  },
  {
    id: 'q005',
    hand: '72o',
    position: 'CO',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 1.0,
    explanation: '72o Ã© a pior mÃ£o no poker. Nunca deve ser jogada como open raise em nenhuma posiÃ§Ã£o em cash game padrÃ£o. Fold sempre.',
    evComparison: { fold: 0, call: 0, raise: -2.1 }
  },
  {
    id: 'q006',
    hand: 'QQ',
    position: 'SB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'QQ sempre faz 3bet em valor. Mesmo OOP no SB, QQ Ã© forte o suficiente para construir pote. Chamar seria subestimar a mÃ£o e dar ao villain boas implied odds.',
    evComparison: { fold: -1, call: 7.2, raise: 11.8 }
  },
  {
    id: 'q007',
    hand: '87s',
    position: 'BTN',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: 'Com 10 BBs no BTN, 87s Ã© um push lucrativo. A mÃ£o tem boa equidade quando chamada (suited conectors tÃªm ~40% vs range de call razoÃ¡vel) e suficiente fold equity para ser profitable.',
    evComparison: { fold: 0, call: 0, raise: 1.4 }
  },
  {
    id: 'q008',
    hand: '22',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: '22 no UTG Ã© uma mÃ£o muito fraca para abrir. Em 100bb deep no UTG, a maioria dos solvers dobra 22 pois a mÃ£o tem dificuldade de navegar mÃºltiplos jogadores OOP com um par pequenÃ­ssimo.',
    evComparison: { fold: 0, call: 0, raise: -0.15 }
  },
  // --- Mais Open Raise ---
  {
    id: 'q009',
    hand: 'AQo',
    position: 'HJ',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'AQo no HJ Ã© uma mÃ£o forte que sempre deve ser aberta. Tem boa blocagem em combos de AA/KK/AK e joga muito bem como agressora prÃ©-flop.',
    evComparison: { fold: 0, call: 0, raise: 2.3 }
  },
  {
    id: 'q010',
    hand: 'T9s',
    position: 'CO',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'T9s no CO Ã© uma abertura padrÃ£o. Suited connectors tÃªm excelente equity pÃ³s-flop com potencial de straights e flushes. No CO com menos jogadores atrÃ¡s, o range se expande para incluÃ­-los.',
    evComparison: { fold: 0, call: 0, raise: 1.1 }
  },
  {
    id: 'q011',
    hand: 'K4s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'K4s no BTN Ã© uma abertura padrÃ£o em GTO. O BTN abre todos os Kxs de K2s para cima (~50% das 169 mÃ£os). K4s tem boa playability pÃ³s-flop (nut flush draw, top pair com kicker razoÃ¡vel) e fold equity suficiente vs os blinds.',
    evComparison: { fold: 0, call: 0, raise: 0.7 }
  },
  {
    id: 'q012',
    hand: 'J8s',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 1.0,
    explanation: 'J8s no UTG estÃ¡ fora do range. A posiÃ§Ã£o early exige mÃ£os muito mais fortes. J8s nÃ£o tem blocagem suficiente nem equidade para justificar abrir nessa posiÃ§Ã£o com vÃ¡rios jogadores atrÃ¡s.',
    evComparison: { fold: 0, call: 0, raise: -0.4 }
  },
  // --- Mais Call RFI ---
  {
    id: 'q013',
    hand: 'AKo',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AKo no BB vs BTN open sempre faz 3bet. Ã‰ uma mÃ£o premium que se beneficia de construir o pot como agressor. Chamar com AKo OOP desperdiÃ§a seu valor enorme.',
    evComparison: { fold: -1, call: 6.5, raise: 10.2 }
  },
  {
    id: 'q014',
    hand: 'JTs',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: 'JTs no BTN vs CO open Ã© um call sÃ³lido. Em posiÃ§Ã£o, JTs realiza sua equity de draw muito bem. O 3bet com JTs BTN vs CO Ã© possÃ­vel como bluff mas com menos frequÃªncia â€” call Ã© o padrÃ£o.',
    evComparison: { fold: 0, call: 1.6, raise: 1.2 }
  },
  {
    id: 'q015',
    hand: 'A3s',
    position: 'SB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.75,
    explanation: 'A3s no SB vs BTN Ã© um 3bet bluff clÃ¡ssico. Bloqueia combos de AA, tem bom equity quando chamado (nut flush draw potencial), e a posiÃ§Ã£o OOP dificulta chamar. 3bet/fold Ã© a linha padrÃ£o GTO.',
    evComparison: { fold: 0, call: 0.8, raise: 1.5 }
  },
  {
    id: 'q016',
    hand: 'KQs',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'SB',
    correctAction: '3bet',
    correctFrequency: 0.9,
    explanation: 'KQs no BB vs SB open quase sempre faz 3bet. O SB tem range muito amplo para abrir e KQs tem equidade forte vs esse range. 3bet vai vencer muitas vezes sÃ³ pela fold equity, alÃ©m de ter bom equity quando chamado.',
    evComparison: { fold: -0.5, call: 3.2, raise: 5.8 }
  },
  // --- Mais Push/Fold ---
  {
    id: 'q017',
    hand: 'A9o',
    position: 'SB',
    heroStack: 12,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: 'A9o com 12 BBs no SB Ã© um shove claro. Com stack curto, A9o tem equity suficiente contra o range de call do BB e fold equity para lucrar. Abrir/fold desperdiÃ§a chips; shove Ã© a jogada correta.',
    evComparison: { fold: 0, call: 0, raise: 1.8 }
  },
  {
    id: 'q018',
    hand: '55',
    position: 'BTN',
    heroStack: 8,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: 'Com 8 BBs no BTN, 55 Ã© um shove muito lucrativo. Pares mÃ©dios/pequenos shoveiam de forma muito ampla com stack curto pois tÃªm ~50% vs overcards quando chamados e excelente fold equity contra os blinds.',
    evComparison: { fold: 0, call: 0, raise: 2.1 }
  },
  // --- BB Defense ---
  {
    id: 'q019',
    hand: 'T9s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'T9s Ã© uma defesa clara do BB vs BTN open. Tem excelente equity pÃ³s-flop com potencial de straight e flush draws. Mesmo OOP, os implied odds justificam chamada. 3bet raramente (mÃ£o nÃ£o tem blocagem suficiente em AA/KK/AK).',
    evComparison: { fold: 0, call: 1.4, raise: 0.9 }
  },
  {
    id: 'q020',
    hand: 'Q7o',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 1.0,
    explanation: 'Q7o no BB vs UTG open Ã© fold. O range do UTG Ã© muito tight (premium e mÃ£os fortes), e Q7o nÃ£o tem equity suficiente para justificar chamada OOP vs esse range. MDF sugere que nÃ£o precisamos defender todas as mÃ£os â€” Q7o estÃ¡ bem abaixo do threshold.',
    evComparison: { fold: 0, call: -1.8, raise: -2.5 }
  },
  {
    id: 'q021',
    hand: '55',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '55 no BB vs BTN open Ã© uma defesa standard. Pares pequenos tÃªm excelente implied odds â€” quando vocÃª seta (10.8% do tempo), o pot pode ser enorme. Flat call Ã© a linha correta; 3bet com 55 seria demasiado loose.',
    evComparison: { fold: 0, call: 1.1, raise: 0.2 }
  },
  {
    id: 'q022',
    hand: 'KJs',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 0.8,
    explanation: 'KJs no BB vs CO open Ã© um 3bet frequente. A mÃ£o tem blocagem em combos de AA/KK/AKs, boa equidade quando chamada e ganha muito por fold equity. OOP, 3bet/fold Ã© superior a call pois maximiza equity vs range do CO.',
    evComparison: { fold: -0.5, call: 2.1, raise: 3.8 }
  },
  {
    id: 'q023',
    hand: '72o',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'fold',
    correctFrequency: 1.0,
    explanation: '72o no BB vs qualquer open Ã© fold. Mesmo sendo o BB (jÃ¡ pagou 1BB), a mÃ£o tem equidade tÃ£o baixa vs qualquer range razoÃ¡vel que chamada seria negativa. MDF nÃ£o exige que defendamos com as piores mÃ£os do range â€” 72o nunca entra.',
    evComparison: { fold: 0, call: -3.2, raise: -4.1 }
  },
  {
    id: 'q024',
    hand: 'A9s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'SB',
    correctAction: '3bet',
    correctFrequency: 0.9,
    explanation: 'A9s no BB vs SB open Ã© quase sempre 3bet. O SB abre muito wide (~55% das mÃ£os), entÃ£o A9s tem equidade excelente vs esse range. A blocagem em AA + nut flush potential fazem de A9s um 3bet de valor/semi-bluff ideal BB vs SB.',
    evComparison: { fold: -0.5, call: 1.8, raise: 4.2 }
  },
  // --- 3-Bet Scenarios ---
  {
    id: 'q025',
    hand: 'AA',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AA sempre faz 3bet em qualquer posiÃ§Ã£o e vs qualquer open. Construa o pot com a melhor mÃ£o prÃ©-flop. Chamar seria desperdiÃ§ar equity enorme â€” AA quer jogo deep em pote grande.',
    evComparison: { fold: -1, call: 9.2, raise: 15.8 }
  },
  {
    id: 'q026',
    hand: 'A5s',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.8,
    explanation: 'A5s no BTN vs UTG open Ã© geralmente fold ou call, nÃ£o 3bet. O range do UTG Ã© muito tight (88+, ATs+, AQo+, KQs), e A5s tem equidade ruim vs esse range. 3bet seria arriscar muito com pouco â€” fold/call sÃ£o superiores.',
    evComparison: { fold: 0, call: 0.6, raise: -0.3 }
  },
  {
    id: 'q027',
    hand: 'TT',
    position: 'CO',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'TT no CO vs UTG open Ã© principalmente call, nÃ£o 3bet. Vs range tight do UTG, TT estÃ¡ atrÃ¡s de JJ+ e flip vs AK. 3bet se torna chamada ampla de JJ/QQ+ criando spot ruim. Flat call em posiÃ§Ã£o Ã© melhor â€” realize equity barato.',
    evComparison: { fold: 0, call: 3.4, raise: 2.1 }
  },
  {
    id: 'q028',
    hand: 'A4s',
    position: 'SB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.85,
    explanation: 'A4s no SB vs BTN open Ã© um 3bet bluff clÃ¡ssico. Bloqueia combos de AA, tem nut flush draw potential, e OOP nÃ£o conseguimos realizar equity de A4s com flat call. 3bet/fold: se vilÃ£o 4bet, fold. Se chama, jogamos flop com equity e blocagem.',
    evComparison: { fold: 0, call: 0.5, raise: 1.9 }
  },

  // ===== 4-BET SCENARIOS =====
  {
    id: 'q029',
    hand: 'AA',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'AA sempre faz 4-bet. Quando vocÃª abriu do BTN e o BB 3-betou, AA quer construir o pote o mÃ¡ximo possÃ­vel. Chamar o 3-bet seria um erro â€” vocÃª desperdiÃ§a equity enorme. Tamanho ideal de 4-bet: 2.2x-2.5x o 3-bet (ex: 3-bet foi 9bb â†’ 4-bet para ~22bb).',
    evComparison: { fold: -1, call: 18, raise: 28 }
  },
  {
    id: 'q030',
    hand: 'QQ',
    position: 'CO',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BTN',
    correctAction: '4bet',
    correctFrequency: 0.9,
    explanation: 'QQ vs 3-bet do BTN Ã© quase sempre 4-bet. O BTN 3-beta muito wide (15-18% vs CO), entÃ£o QQ tem equity excelente vs o range dele. Chamar Ã© possÃ­vel mas deixa vocÃª OOP com uma mÃ£o que prefere pot grande. 4-bet para ~22bb forÃ§a fold das mÃ£os fracas do BTN e extrai valor de JJ/AKo.',
    evComparison: { fold: -1, call: 6.5, raise: 9.8 }
  },
  {
    id: 'q031',
    hand: 'A5s',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 0.75,
    explanation: 'A5s Ã© o 4-bet bluff padrÃ£o. Motivos: (1) Bloqueia combos de AA â€” reduzo de 6 para 3 os combos que me batem; (2) Bloqueia AK, AQ â€” mÃ£os que o villain chamaria; (3) Quando chamado, tenho nut flush draw + overcard. EstratÃ©gia: 4-bet/fold vs shove do villain.',
    evComparison: { fold: 0, call: 0.8, raise: 1.6 }
  },
  {
    id: 'q032',
    hand: 'KQs',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'KQs vs 3-bet do BB Ã© principalmente call. KQs tem equity boa mas nÃ£o bloqueia suficientemente (nÃ£o segura ases). 4-bet aqui seria muito transparente â€” seu range de 4-bet bluff deve ter blockers fortes. Prefira chamar IP e jogar o flop com position advantage.',
    evComparison: { fold: 0, call: 2.8, raise: 1.9 }
  },
  {
    id: 'q033',
    hand: 'JJ',
    position: 'UTG',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'JJ vs 3-bet do BB quando vocÃª abriu UTG Ã© geralmente call. O BB 3-beta tight vs UTG (QQ+, AK, bluffs com A4s/A3s). JJ tem ~38% de equity vs esse range â€” bom para chamar, ruim para 4-bet. Se 4-betar, vocÃª faz o villain foldar exatamente as mÃ£os que vocÃª bate (bluffs), e sÃ³ continua com QQ+/AK onde vocÃª estÃ¡ atrÃ¡s.',
    evComparison: { fold: -1, call: 4.2, raise: 1.8 }
  },
  {
    id: 'q034',
    hand: 'AKo',
    position: 'SB',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'AKo sempre 4-beta quando vocÃª abriu SB e o BB 3-betou. AKo tem 50% de equity vs QQ, bate KK/QQ/JJ, e tem blocagem dupla em AA e KK. Chamar seria um erro â€” OOP com stack de 100bb e AKo, vocÃª quer jogo grande ou sair antes do flop.',
    evComparison: { fold: -1, call: 7.2, raise: 11.5 }
  },

  // ===== SQUEEZE SCENARIOS =====
  {
    id: 'q035',
    hand: 'AA',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AA sempre faz squeeze. VocÃª estÃ¡ no BB, UTG abriu e CO chamou â€” squeeze com AA para 12-14bb. VocÃª isola a pior mÃ£o do CO e constrÃ³i pote enorme com a melhor mÃ£o. Nunca chame com AA em squeeze spot â€” vocÃª quer o pote grande.',
    evComparison: { fold: -1, call: 12, raise: 22 }
  },
  {
    id: 'q036',
    hand: 'JTs',
    position: 'BTN',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.9,
    explanation: 'JTs no BTN com CO open e HJ caller Ã© call, nÃ£o squeeze. Squeeze com JTs seria bluff puro â€” vocÃª precisa de blockers fortes para squeezar eficientemente. JTs tem boa equity mas nÃ£o bloqueia nada relevante. Prefira chamar IP para realizar equity com position.',
    evComparison: { fold: 0, call: 1.8, raise: 0.4 }
  },
  {
    id: 'q037',
    hand: 'AQs',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.85,
    explanation: 'AQs no SB com BTN open e BB caller Ã© squeeze clara. AQs tem blocagem em AA/AK, equity excelente quando chamada, e vocÃª estÃ¡ OOP â€” squeeze/fold Ã© superior a call OOP vs 2 jogadores. Tamanho: 4x o open (BTN abriu 2.5bb â†’ squeeze para ~10bb).',
    evComparison: { fold: 0, call: 1.1, raise: 2.9 }
  },
  {
    id: 'q038',
    hand: 'KQo',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 0.75,
    explanation: 'KQo no BB vs HJ open + CO caller Ã© call, nÃ£o squeeze. KQo nÃ£o tem blocagem suficiente (segura apenas K e Q, nÃ£o bloqueia A). Squeeze seria arriscado pois vocÃª precisa que os dois foldarem. Prefira chamar e jogar o flop com posiÃ§Ã£o do pot.',
    evComparison: { fold: 0, call: 2.2, raise: 1.4 }
  },
  {
    id: 'q039',
    hand: 'TT',
    position: 'BTN',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: 'TT no BTN vs HJ open + CO caller Ã© call. TT prefere realizar equity IP vs 2 jogadores. Squeeze aqui Ã© marginal â€” TT nÃ£o bloqueia AK/AQ e vs o caller (que pode ter JJ-QQ) vocÃª pode estar em trouble. Chame e jogue flop em posiÃ§Ã£o.',
    evComparison: { fold: 0, call: 2.6, raise: 1.8 }
  },
  {
    id: 'q040',
    hand: 'A4s',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 0.8,
    explanation: 'A4s no BB vs CO open + BTN caller Ã© squeeze de bluff perfeita. Blockers: A4s bloqueia AA (6â†’3 combos), AK (16â†’12 combos), AQ. Quando squeezar e os dois foldarem, vocÃª ganha o pote de graÃ§a. Quando chamado, tem nut flush potential. Tamanho: 4x o open.',
    evComparison: { fold: 0, call: 0.9, raise: 2.1 }
  },

  // ===== SB vs BB SCENARIOS (com gtoMix para ensinar frequÃªncias) =====
  {
    id: 'q041',
    hand: 'AA',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.7,
    gtoMix: { raise: 0.70, limp: 0.30 },
    explanation: 'AA no SB vs BB: raise (70%) ou limp (30%). Raise extrai valor imediato. Limp balanceia seu range de limp e pode induzir squeeze do BB (limp/reraise). GTO mistura ambas para nÃ£o ser explorado â€” se vocÃª sÃ³ raisa AA/KK do SB, BB pode fold sempre ao seu raise.',
    evComparison: { fold: -1, call: 0, raise: 14 }
  },
  {
    id: 'q042',
    hand: 'KK',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.85,
    gtoMix: { raise: 0.85, limp: 0.15 },
    explanation: 'KK no SB: quase sempre raise (85%). Precisa construir pote e proteger vs overcard de Ã€s. Limp 15% para balancear range de limp com strong hands. Se BB 3-bets depois do seu raise, 4-bet para valor.',
    evComparison: { fold: -1, call: 0, raise: 12 }
  },
  {
    id: 'q043',
    hand: 'T8s',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'limp',
    correctFrequency: 0.7,
    gtoMix: { limp: 0.70, raise: 0.20, fold: 0.10 },
    explanation: 'T8s no SB: principalmente limp (70%). MÃ£o especulativa que prefere ver flop barato â€” OOP vs BB, sem posiÃ§Ã£o postflop. Raise (20%) como mistura para balancear. Fold (10%) em spots onde BB Ã© muito agressivo com 3-bets.',
    evComparison: { fold: 0, call: 0.6, raise: 0.5 }
  },
  {
    id: 'q044',
    hand: '72o',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'fold',
    correctFrequency: 1.0,
    explanation: '72o no SB: fold. Mesmo vs apenas o BB, 72o tem equity tÃ£o baixa que limp nÃ£o Ã© lucrativo OOP. MDF nÃ£o exige defender com lixo â€” a pior mÃ£o do deck Ã© fold sempre.',
    evComparison: { fold: 0, call: -1.8, raise: -2.5 }
  },
  {
    id: 'q045',
    hand: 'A7o',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.65,
    gtoMix: { raise: 0.65, limp: 0.35 },
    explanation: 'A7o no SB: raise (65%) ou limp (35%). A7o tem equity decente mas Ã© difÃ­cil de jogar OOP. Raise constrÃ³i pote com posiÃ§Ã£o preflop; limp realiza equity barato. GTO mistura para prevenir exploraÃ§Ã£o do BB.',
    evComparison: { fold: 0, call: 0.4, raise: 0.9 }
  },
  {
    id: 'q046',
    hand: 'JTs',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.75,
    gtoMix: { raise: 0.75, limp: 0.25 },
    explanation: 'JTs no SB: principalmente raise (75%). MÃ£o com boa playability, equity forte e potencial de semi-bluff. Raise extrai fold equity + value. Limp (25%) para misturar e realizarequity em spots passivos.',
    evComparison: { fold: 0, call: 0.8, raise: 1.4 }
  },
  {
    id: 'q047',
    hand: '55',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'limp',
    correctFrequency: 0.6,
    gtoMix: { limp: 0.60, raise: 0.40 },
    explanation: '55 no SB: principalmente limp (60%). Par pequeno que prefere setear barato â€” OOP vs BB, implied odds sÃ£o a principal fonte de valor. Raise (40%) como mistura para representar range forte e evitar ser explorado.',
    evComparison: { fold: 0, call: 0.5, raise: 0.6 }
  },
  {
    id: 'q048',
    hand: 'AQo',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'AQo no SB: sempre raise. MÃ£o forte que se beneficia de construir pote e tomar iniciativa. Limp seria desperdiÃ§ar equity â€” AQo supera a maioria do range do BB e deve apostar isso. Vs 3-bet do BB, 4-bet ou call dependendo do tamanho.',
    evComparison: { fold: 0, call: 0.5, raise: 2.8 }
  },
  {
    id: 'q049',
    hand: 'K4s',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.55,
    gtoMix: { raise: 0.55, limp: 0.40, fold: 0.05 },
    explanation: 'K4s no SB: raise (55%) ou limp (40%). Suited gapper com nut flush potential. Raise tem blocagem em KK e bom fold equity. Limp realiza equity barato com uma mÃ£o que joga bem em flops baratos. Quase nunca fold.',
    evComparison: { fold: 0, call: 0.3, raise: 0.7 }
  },
  {
    id: 'q050',
    hand: 'QTo',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.5,
    gtoMix: { raise: 0.50, limp: 0.50 },
    explanation: 'QTo no SB: 50/50 raise ou limp â€” genuÃ­na mistura GTO. MÃ£o borderline: forte suficiente para raise, mas OOP Ã© difÃ­cil de defender. Esta Ã© a essÃªncia do mixed strategy: villain nÃ£o consegue explorar vocÃª seja qual for sua aÃ§Ã£o.',
    evComparison: { fold: 0, call: 0.2, raise: 0.4 }
  },

  // ============ OPEN RAISE â€” 15 novas questÃµes (q051-q065) ============
  {
    id: 'q051',
    hand: 'T9s',
    position: 'HJ',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.8,
    explanation: 'T9s no HJ Ã© uma mÃ£o borderline. O range do HJ Ã© relativamente tight e T9s fica fora da maioria dos solvers. A mÃ£o joga bem em posiÃ§Ã£o mas perde muito EV no HJ contra os players que ficam atrÃ¡s. Fold Ã© a jogada sÃ³lida aqui.',
    evComparison: { fold: 0, call: 0, raise: -0.1 }
  },
  {
    id: 'q052',
    hand: '87s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: '87s no BTN Ã© uma abertura padrÃ£o. Na BTN, o range Ã© muito amplo (~45%), e 87s Ã© um conector suited com boa jogabilidade pÃ³s-flop â€” draws a straight, flush, pair. Esta mÃ£o cria equity e bluffs bem-construÂ­Ã­dos em boards coordenados.',
    evComparison: { fold: 0, call: 0, raise: 0.8 }
  },
  {
    id: 'q053',
    hand: 'KJo',
    position: 'CO',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'KJo no CO Ã© uma abertura padrÃ£o. CO tem um range amplo (~30%) e KJo possui boa equity prÃ©-flop e jogabilidade pÃ³s-flop. Ã‰ uma mÃ£o de "top-pair, top-kicker" frequente â€” aproveita bem a posiÃ§Ã£o no flop, turn e river.',
    evComparison: { fold: 0, call: 0, raise: 1.2 }
  },
  {
    id: 'q054',
    hand: 'Q9s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'Q9s no BTN Ã© uma abertura padrÃ£o. Na BTN, mÃ£os como Q9s tÃªm equity suficiente e jogabilidade pÃ³s-flop sÃ³lida â€” draws, top-pair mÃ©dio, backdoor flush draws. Com posiÃ§Ã£o garantida, o EV de abertura Ã© positivo.',
    evComparison: { fold: 0, call: 0, raise: 0.9 }
  },
  {
    id: 'q055',
    hand: '44',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: '44 no UTG estÃ¡ fora do range padrÃ£o de 6-max. Pares pequenos precisam de implied odds para justificar a abertura, e no UTG vocÃª enfrenta muitos jogadores atrÃ¡s com ranges fortes. A mÃ£o tem equity ruim quando chamada e Ã© difÃ­cil de defender pÃ³s-flop.',
    evComparison: { fold: 0, call: 0, raise: -0.3 }
  },
  {
    id: 'q056',
    hand: '55',
    position: 'HJ',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: '55 no HJ Ã© uma abertura padrÃ£o â€” o HJ range inclui pares a partir de 55/66. Pares pequenos no HJ tÃªm valor de set-mining e fold equity vs blinds. Diferente do UTG, no HJ hÃ¡ apenas 3-4 players atrÃ¡s, tornando a abertura lucrativa a longo prazo.',
    evComparison: { fold: 0, call: 0, raise: 0.6 }
  },
  {
    id: 'q057',
    hand: 'K9s',
    position: 'HJ',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'K9s no HJ estÃ¡ dentro do range padrÃ£o. Ã‰ uma mÃ£o com boa equity, backdoor flush draw, e top-pair decente quando acerta. Solvers incluem K9s no HJ range de 6-max como abertura clara.',
    evComparison: { fold: 0, call: 0, raise: 1.1 }
  },
  {
    id: 'q058',
    hand: 'QJs',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.75,
    explanation: 'QJs no UTG Ã© uma mÃ£o marginal â€” alguns solvers a incluem, outros nÃ£o. O problema Ã© que pÃ³s-flop vocÃª estarÃ¡ OOP contra todo mundo. QJs prefere jogar em posiÃ§Ã£o. Fold Ã© a jogada mais segura no UTG de 6-max, especialmente para iniciantes.',
    evComparison: { fold: 0, call: 0, raise: 0.05 }
  },
  {
    id: 'q059',
    hand: 'T8s',
    position: 'CO',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'T8s no CO Ã© uma abertura padrÃ£o. Conectores suited ganham valor especialmente no CO e BTN onde vocÃª tem maior chance de jogar em posiÃ§Ã£o. T8s tem boa playability â€” draws a straight/flush, double backdoors, e value quando pega pair.',
    evComparison: { fold: 0, call: 0, raise: 0.7 }
  },
  {
    id: 'q060',
    hand: '76s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: '76s no BTN Ã© uma abertura clara. Conectores suited sÃ£o valiosos na BTN porque jogam bem em posiÃ§Ã£o, criam draws poderosos e tÃªm boa equity realizada. 76s especificamente tem boa cobertura de board (acerta muitos middling boards).',
    evComparison: { fold: 0, call: 0, raise: 0.8 }
  },
  {
    id: 'q061',
    hand: 'A4s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 1.0,
    explanation: 'A4s no BTN Ã© uma abertura padrÃ£o â€” qualquer Ax suited Ã© abertura na BTN. A4s tem boa equity vs mÃ£os de call dos blinds, nut-flush draw potencial e pode montar nuts straight (A2345). Em posiÃ§Ã£o com stack de 100bb Ã© uma abertura clara.',
    evComparison: { fold: 0, call: 0, raise: 1.0 }
  },
  {
    id: 'q062',
    hand: 'A8o',
    position: 'SB',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.65,
    explanation: 'A8o no SB Ã© uma abertura borderline â€” o range do SB para raise Ã© ~45% incluindo suited aces, mas A8o offsuit tem equity ruim OOP. A maioria dos solvers dÃ¡ mix entre raise e fold aqui. Fold Ã© mais conservador e evita spots difÃ­ceis fora de posiÃ§Ã£o.',
    evComparison: { fold: 0, call: 0, raise: 0.1 }
  },
  {
    id: 'q063',
    hand: 'KTo',
    position: 'SB',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 0.9,
    explanation: 'KTo no SB Ã© uma abertura padrÃ£o â€” o range do SB inclui KTo como raise. A mÃ£o tem boa equity nominal e aproveita a fold equity vs BB. Embora OOP, Ã© forte o suficiente para justificar a abertura vs apenas 1 player (BB).',
    evComparison: { fold: 0, call: 0, raise: 0.7 }
  },
  {
    id: 'q064',
    hand: '98o',
    position: 'BTN',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'raise',
    correctFrequency: 0.7,
    explanation: '98o no BTN Ã© uma abertura que o solver mistura â€” principalmente raise com frequÃªncia >50%. Offsuit connectors na BTN tÃªm valor porque a posiÃ§Ã£o compensa a falta do suit. Em tabela exploitativa, fold nÃ£o Ã© errado, mas GTO Ã© raise a maioria das vezes.',
    evComparison: { fold: 0, call: 0, raise: 0.4 }
  },
  {
    id: 'q065',
    hand: 'J8s',
    position: 'CO',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.8,
    explanation: 'J8s no CO estÃ¡ geralmente fora do range padrÃ£o. O CO range tem ~28% das mÃ£os e prioriza conectores mais fortes (JTs, T9s) sobre J8s. A mÃ£o joga melhor em BTN onde a posiÃ§Ã£o Ã© garantida. Fold Ã© a jogada sÃ³lida aqui.',
    evComparison: { fold: 0, call: 0, raise: -0.05 }
  },

  // ============ CALL RFI â€” 15 novas questÃµes (q066-q080) ============
  {
    id: 'q066',
    hand: '77',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: '77 vs BTN open no BB Ã© um call padrÃ£o. Pares mÃ©dios nÃ£o tÃªm valor suficiente para 3bet com frequÃªncia aqui, mas tÃªm excelente equity no call. VocÃª fecha a aÃ§Ã£o com odds implÃ­citas de set-mining e pode c/r flops drawy. Ocasionalmente pode 3bet como variaÃ§Ã£o.',
    evComparison: { fold: 0, call: 2.1, raise: 2.0 }
  },
  {
    id: 'q067',
    hand: 'KQo',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'KQo vs BTN open no CO: mix entre call e 3bet. KQo tem boa equity mas nÃ£o tem bloqueadores ideais para 3bet (sem Aces). Chamar em posiÃ§Ã£o (CO vs BTN nÃ£o Ã© posiÃ§Ã£o, CO age antes) â€” na verdade CO estÃ¡ fora de posiÃ§Ã£o vs BTN. EntÃ£o call Ã© mais conservador.',
    evComparison: { fold: 0, call: 1.8, raise: 2.0 }
  },
  {
    id: 'q068',
    hand: '66',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '66 vs CO open no BB Ã© um call claro. Par mÃ©dio com set-mining value. O BB tem odds favorÃ¡veis para chamar (precisa de menos de 33% equity com posiÃ§Ã£o ruim, mas fecha a aÃ§Ã£o). 66 realiza bem sua equity como set-mining hand.',
    evComparison: { fold: 0, call: 1.5, raise: 0.8 }
  },
  {
    id: 'q069',
    hand: 'JTs',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'JTs no BTN vs CO open Ã© predominantemente um call. Em posiÃ§Ã£o, JTs realiza excelente equity â€” draws a straight/flush, top-pair decente. Pode ser 3bet ocasionalmente como linear 3bet mas call Ã© mais comum por JTs preferir ver o flop em posiÃ§Ã£o.',
    evComparison: { fold: 0, call: 2.4, raise: 2.6 }
  },
  {
    id: 'q070',
    hand: 'AQo',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: '3bet',
    correctFrequency: 0.65,
    explanation: 'AQo vs UTG open no BB: 3bet (65%). AQo estÃ¡ no range de 3bet do BB por bloquear AA/AK do villain. Vs UTG tight range, call tambÃ©m Ã© defensÃ¡vel â€” solver mistura. PorÃ©m, AQo Ã© forte o suficiente para reraize: extrai valor vs KK/QQ/AK e consegue fold equity vs JJ/TT.',
    evComparison: { fold: 0, call: 2.8, raise: 3.1 }
  },
  {
    id: 'q071',
    hand: '55',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '55 vs HJ open no BB Ã© um call claro. Set-mining hand com equity suficiente para defender o BB. O BB precisa de apenas ~33% equity para ser lucrativo, e 55 tem ~52% vs HJ range. Call e set-mine â€” quando pega set, ganha pote gigante.',
    evComparison: { fold: 0, call: 1.3, raise: 0.5 }
  },
  {
    id: 'q072',
    hand: 'A9s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.65,
    explanation: 'A9s no CO vs BTN open: call. CO estÃ¡ OOP vs BTN, mas A9s tem equity suficiente e implied odds para jogar o flop. NÃ£o estÃ¡ no range de 3bet do CO (muito speculative como bluff OOP). Call Ã© melhor â€” veja o flop, decida com mais informaÃ§Ã£o. Fold tambÃ©m Ã© defensÃ¡vel dado a posiÃ§Ã£o desfavorÃ¡vel.',
    evComparison: { fold: 0, call: 1.5, raise: 1.0 }
  },
  {
    id: 'q073',
    hand: 'QJs',
    position: 'SB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.6,
    explanation: 'QJs vs BTN open no SB: mix entre call e fold. OOP com 2 streets dificeis. QJs joga bem em posiÃ§Ã£o mas no SB Ã© complicado. Solver geralmente mistura entre call e fold. Call mantÃ©m equity realizada, fold evita spots OOP difÃ­ceis. Aqui call Ã© levemente preferido.',
    evComparison: { fold: 0, call: 0.5, raise: 0.8 }
  },
  {
    id: 'q074',
    hand: 'KJs',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'KJs vs CO open no BB: mix entre call e 3bet. KJs tem bons blockers (K bloqueia KK, J bloqueia JJ) e boa equity. No entanto, contra CO range razoÃ¡vel, call tambÃ©m Ã© lucrativo. Solver mistura ~80% call e ~20% 3bet. Call Ã© a jogada mais frequente.',
    evComparison: { fold: 0, call: 2.2, raise: 2.5 }
  },
  {
    id: 'q075',
    hand: 'T9s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.8,
    explanation: 'T9s no BTN vs UTG open Ã© um fold surpreendente para muitos. O range do UTG Ã© very tight (~15%) e inclui mÃ£os como AA/KK/QQ/JJ/TT/AK que dominam T9s pesadamente. Mesmo em posiÃ§Ã£o, T9s nÃ£o tem equity suficiente para chamar um raise tight de UTG.',
    evComparison: { fold: 0, call: -0.3, raise: -0.5 }
  },
  {
    id: 'q076',
    hand: 'A3s',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.70,
    explanation: 'A3s vs BTN open no BB: 3bet bluff. A3s bloqueia combos de AA do villain (Ace blocker), tem potential de nut flush draw e forÃ§a fold de hands medÃ­ocres do BTN. GTO classifica A3s/A4s como bluffs de 3bet do BB. Call Ã© aceitÃ¡vel, mas 3bet tem maior EV vs range wide do BTN.',
    evComparison: { fold: 0, call: 1.2, raise: 1.6 }
  },
  {
    id: 'q077',
    hand: '99',
    position: 'CO',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 0.75,
    explanation: '99 no HJ vs CO open: principalmente call. HJ estÃ¡ fora de posiÃ§Ã£o vs CO, e 99 nÃ£o tem equity suficiente para 3bet com frequÃªncia. Call e realiza equity como set-mining. Se 3bet, villain defende com mÃ£os que dominam (TT-AA). Call Ã© mais lucrativo aqui.',
    evComparison: { fold: 0, call: 2.0, raise: 1.7 }
  },
  {
    id: 'q078',
    hand: 'JTo',
    position: 'BB',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'JTo vs BTN open no BB Ã© um call padrÃ£o. O BB tem odds implÃ­citas para chamar com mÃ£os como JTo que tÃªm boa conectividade. JTo pode formar straightdraws, top-pairs medianos e tem equity suficiente para defender. A posiÃ§Ã£o do BTN nÃ£o muda a equaÃ§Ã£o aqui.',
    evComparison: { fold: 0, call: 0.8, raise: 0.3 }
  },
  {
    id: 'q079',
    hand: 'Q9s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.5,
    explanation: 'Q9s no CO vs BTN open: mix equilibrado entre call e fold. CO estÃ¡ OOP vs BTN â€” isso penaliza mÃ£os que precisam de posiÃ§Ã£o como Q9s. Solver mistura ~50/50. Call pode ser justificado pela playability do Q9s suited, mas fold nÃ£o Ã© erro.',
    evComparison: { fold: 0, call: 0.4, raise: 0.2 }
  },
  {
    id: 'q080',
    hand: '88',
    position: 'BTN',
    heroStack: 100,
    scenario: 'vs_raise',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: '88 no BTN vs CO open Ã© um call claro em posiÃ§Ã£o. CO vs BTN: vocÃª fica em posiÃ§Ã£o no BTN. 88 tem excelente set-mining value, nÃ£o precisa de 3bet. Call, jogue flop em posiÃ§Ã£o. Quando pega set (1 em 8 vezes), ganhe pote enorme.',
    evComparison: { fold: 0, call: 2.3, raise: 1.9 }
  },

  // ============ 3-BET â€” 15 novas questÃµes (q081-q095) ============
  {
    id: 'q081',
    hand: 'QQ',
    position: 'SB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'QQ no SB vs BTN open Ã© sempre um 3bet. QQ tem equity premium vs todo o range do BTN e quer construir pote OOP. 3bet com QQ protege sua equity, restringe range do villain e cria spot onde vocÃª pode c/b com equity forte na maioria dos boards.',
    evComparison: { fold: 0, call: 8.0, raise: 11.0 }
  },
  {
    id: 'q082',
    hand: 'A5s',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 0.8,
    explanation: 'A5s Ã© um 3bet bluff ideal vs CO open. Motivos: (1) Bloqueia combos de AA â€” villain tem menos AA quando vocÃª segura um Ace; (2) Quando chamado, tem equity de flush/straight draw; (3) Em posiÃ§Ã£o (BTN vs CO), realiza equity bem. A5s Ã© melhor como 3bet do que call aqui.',
    evComparison: { fold: 0, call: 1.5, raise: 2.2 }
  },
  {
    id: 'q083',
    hand: 'KQs',
    position: 'BB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 0.85,
    explanation: 'KQs no BB vs CO open Ã© predominantemente 3bet. KQs tem blockers (K e Q reduzem combos premium do villain), equity forte e jogabilidade excelente pÃ³s-flop. OOP no BB, 3bet Ã© preferÃ­vel a call porque protege equity e cria potes maiores quando Ã  frente.',
    evComparison: { fold: 0, call: 2.0, raise: 3.2 }
  },
  {
    id: 'q084',
    hand: 'JJ',
    position: 'BB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.65,
    explanation: 'JJ vs BTN open no BB: mix entre call e 3bet, com leve preferÃªncia por call. BTN range Ã© muito amplo (~45%), e JJ estÃ¡ Ã  frente de muito do range. No entanto, 3bet pode ser chamado por mÃ£os que dominam (QQ-AA). Call mantÃ©m villain no range wide e realiza equity OOP.',
    evComparison: { fold: 0, call: 5.5, raise: 5.8 }
  },
  {
    id: 'q085',
    hand: '99',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: '99 no CO vs BTN open: mix entre fold e call. CO estÃ¡ OOP vs BTN, e 99 nÃ£o tem valor de 3bet â€” seria chamado apenas por mÃ£os que dominam. O problema Ã© que call OOP com 99 sem set Ã© muito difÃ­cil de jogar. Fold/call mistura, com fold sendo seguro.',
    evComparison: { fold: 0, call: 0.5, raise: -0.2 }
  },
  {
    id: 'q086',
    hand: 'AQs',
    position: 'SB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AQs no SB vs BTN open Ã© sempre 3bet. MÃ£o forte (top 8%), OOP, que precisa construir pote e nÃ£o perder equidade chamando. AQs tem bloqueadores (A bloqueia AA/AK), flush nut draw e conectividade. 3bet com AQs SB vs BTN Ã© a base da estratÃ©gia GTO.',
    evComparison: { fold: 0, call: 2.5, raise: 4.5 }
  },
  {
    id: 'q087',
    hand: 'K9s',
    position: 'BB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'K9s no BB vs CO open: predominantemente fold. K9s nÃ£o tem equity suficiente para 3bet (CO range Ã© razoavelmente tight), e call OOP com K9s cria spots difÃ­ceis. A mÃ£o nÃ£o tem blockers ideais e perde muito quando 3bet Ã© chamado por hands dominantes.',
    evComparison: { fold: 0, call: 0.3, raise: 0.0 }
  },
  {
    id: 'q088',
    hand: 'A3s',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 0.7,
    explanation: 'A3s no BTN vs CO open Ã© um bom 3bet bluff. RazÃµes: (1) Bloqueador de Ace reduz combos de AA; (2) Em posiÃ§Ã£o (BTN vs CO); (3) Quando chamado, tem equity de flush e pode apanhar nut. A3s como 3bet balanceia seu range de 3bets com valor (QQ+/AK+) com um bluff com equity.',
    evComparison: { fold: 0, call: 1.3, raise: 1.8 }
  },
  {
    id: 'q089',
    hand: 'TT',
    position: 'CO',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'TT no HJ vs CO open: principalmente call. HJ estÃ¡ OOP vs CO, e TT nÃ£o tem stack suficiente de equity para 3bet com frequÃªncia. Call e realize equity. Se 3bet, villain com QQ-AA domina vocÃª. Call e procure sets/overcards favorÃ¡veis no flop.',
    evComparison: { fold: 0, call: 3.5, raise: 3.0 }
  },
  {
    id: 'q090',
    hand: 'KJs',
    position: 'SB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.6,
    explanation: 'KJs no SB vs BTN open: solver mistura entre call e 3bet, com leve preferÃªncia por call. KJs tem blockers mas o BTN range Ã© muito wide â€” 3bet pode ser chamado por muito trash que vocÃª domina. Call e realize equity em posiÃ§Ã£o... espera, SB estÃ¡ OOP. EntÃ£o mix, levemente call.',
    evComparison: { fold: 0, call: 1.8, raise: 2.0 }
  },
  {
    id: 'q091',
    hand: 'JTs',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.75,
    explanation: 'JTs no BTN vs UTG open Ã© geralmente fold/call mas nÃ£o 3bet. UTG range Ã© muito tight (~15%) â€” quando 3bet, villain raramente folda (tem AA-QQ/AK que adoram 4bet). JTs como 3bet bluff perde muito quando chamado por range strong do UTG. Fold ou call sÃ£o melhores.',
    evComparison: { fold: 0, call: 0.3, raise: -0.5 }
  },
  {
    id: 'q092',
    hand: 'AKs',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AKs no CO vs BTN open Ã© sempre 3bet. AKs Ã© a melhor mÃ£o nÃ£o-par do poker. 3bet para construir pote, denegar equity de SCDs do villain e criar spots onde vocÃª fica bem vs grande parte do range. OOP (CO vs BTN), 3bet Ã© obrigatÃ³rio com AKs.',
    evComparison: { fold: 0, call: 3.0, raise: 5.5 }
  },
  {
    id: 'q093',
    hand: '77',
    position: 'BB',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.9,
    explanation: '77 no BB vs BTN open Ã© um call claro. Pares mÃ©dios no BB preferem chamar e set-minar. 3bet com 77 vs BTN wide range Ã© arriscado â€” vocÃª Ã© chamado por muitas mÃ£os com overcards. Call OOP Ã© melhor: realizando equity quando bate set, e fold quando board Ã© ruim.',
    evComparison: { fold: 0, call: 2.5, raise: 1.8 }
  },
  {
    id: 'q094',
    hand: 'KQo',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.75,
    explanation: 'KQo no CO vs BTN open: principalmente call. Embora KQo seja forte, CO estÃ¡ OOP vs BTN. 3bet com KQo pode ser chamado por AK/QQ+ que dominam. Call em OOP com KQo allowed, mas cuidado com K/Q flopped sendo dominado. Solver prefere call aqui.',
    evComparison: { fold: 0, call: 1.5, raise: 1.3 }
  },
  {
    id: 'q095',
    hand: 'A2s',
    position: 'BTN',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.65,
    explanation: 'A2s no BTN vs CO open: solver geralmente fold/call. A2s Ã© a mÃ£o de Ace mais fraca â€” como 3bet bluff, os bloqueadores sÃ£o valiosos, mas quando chamado, o hand realiza mal. CO range Ã© razoavelmente tight. Fold/call Ã© a linha mais usada, nÃ£o 3bet.',
    evComparison: { fold: 0, call: 0.6, raise: 0.4 }
  },

  // ============ 4-BET â€” 15 novas questÃµes (q096-q110) ============
  {
    id: 'q096',
    hand: 'AA',
    position: 'UTG',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BTN',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'AA Ã© sempre 4bet. Quando vocÃª abre no UTG e o BTN 3bets, vocÃª tem a melhor mÃ£o possÃ­vel. 4bet para construir o pote â€” vocÃª tem ~80% equity vs range de 3bet do BTN. Chamar seria desperdiÃ§ar equity. AA Ã© o 4bet de valor mais Ã³bvio.',
    evComparison: { fold: 0, call: 12.0, raise: 18.0 }
  },
  {
    id: 'q097',
    hand: 'KK',
    position: 'CO',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'SB',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'KK Ã© sempre 4bet quando enfrenta um 3bet. SB pode 3bet amplo (QQ+/AK+ e alguns bluffs), e KK tem ~75% equity vs todo esse range. 4bet para construir o pote com a 2Âª melhor mÃ£o. Apenas AA domina vocÃª, e AA Ã© uma fraÃ§Ã£o pequena do range do SB.',
    evComparison: { fold: 0, call: 10.0, raise: 15.5 }
  },
  {
    id: 'q098',
    hand: 'A5s',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 0.6,
    explanation: 'A5s como 4bet bluff vs BB 3bet: excelente spot. A5s bloqueia AA (reduz combos de AA do villain), e quando chamado em 4bet pot, tem equity de flush draw e straight draw. A5s Ã© o bluff ideal no 4bet spot â€” melhor que mÃ£os como K8s que nÃ£o tÃªm bloqueadores de Ace.',
    evComparison: { fold: 0, call: 0.5, raise: 1.5 }
  },
  {
    id: 'q099',
    hand: 'QQ',
    position: 'HJ',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'QQ vs CO 3bet: mix entre call e 4bet, com leve preferÃªncia por call em muitos spots. CO 3bet range inclui AA/KK que dominam QQ. Chamar com QQ e jogar flop Ã© lucrativo â€” vocÃª domina JJ-/AQ-/broadways e tem boa equity vs bluffs. Solver geralmente mistura ~65-70% call.',
    evComparison: { fold: 0, call: 7.0, raise: 7.5 }
  },
  {
    id: 'q100',
    hand: 'JJ',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'SB',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: 'JJ vs SB 3bet no BTN: principalmente call. Em posiÃ§Ã£o (BTN vs SB), chamar com JJ Ã© excelente â€” vocÃª realiza equity pÃ³s-flop com posiÃ§Ã£o. SB range de 3bet tem QQ-AA que dominam JJ, entÃ£o 4bet seria chamado por range dominante. Call e jogue flop em posiÃ§Ã£o.',
    evComparison: { fold: 0, call: 6.5, raise: 5.0 }
  },
  {
    id: 'q101',
    hand: 'AKs',
    position: 'CO',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BTN',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'AKs Ã© sempre 4bet â€” Ã© a mÃ£o de valor mÃ¡ximo nÃ£o-par. Vs BTN 3bet, vocÃª tem equity forte e quer construir pote. AKs tambÃ©m bloqueia combos de AA (1 Ace fora) e pode ganhar flops como A-x-x ou K-x-x. 4bet/fold vs shove (preserva equity).',
    evComparison: { fold: 0, call: 5.0, raise: 8.0 }
  },
  {
    id: 'q102',
    hand: 'A4s',
    position: 'SB',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 0.5,
    explanation: 'A4s como 4bet bluff SB vs BB: solver mistura aqui. A4s tem bloqueador de Ace (como A5s) e pode ser usado como 4bet bluff. BB 3bet range Ã© amplo (inclui bluffs), e 4bet pode gerar fold. Quando chamado, A4s tem alguma equity. Mix ~50/50 4bet e fold Ã© tÃ­pico.',
    evComparison: { fold: 0, call: 0.3, raise: 0.8 }
  },
  {
    id: 'q103',
    hand: 'TT',
    position: 'UTG',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.9,
    explanation: 'TT vs BTN 3bet no UTG: principalmente call. TT Ã© uma mÃ£o de mÃ©dio valor que nÃ£o tem equity para 4bet frequentemente vs BTN 3bet range (QQ+/AKs+). Call e realize equity. Se 4bet, BTN pode shove com KK/AA â€” vocÃª estÃ¡ em mau spot. Call e jogue a mÃ£o OOP cuidadosamente.',
    evComparison: { fold: 0, call: 4.0, raise: 3.0 }
  },
  {
    id: 'q104',
    hand: 'KK',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'KK no BTN vs BB 3bet Ã© sempre 4bet. Em posiÃ§Ã£o com a 2Âª melhor mÃ£o, construa o pote. BB 3bet range tem bluffs (A5s, K5s, etc.) que KK domina. Apenas AA tem KK dominado, e AA Ã© ~1.5% do range do BB. 4bet para maximizar EV.',
    evComparison: { fold: 0, call: 9.0, raise: 14.0 }
  },
  {
    id: 'q105',
    hand: 'AQs',
    position: 'CO',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'SB',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'AQs vs SB 3bet no CO: principalmente call. AQs Ã© forte mas pode ser dominado por AK/AA quando 4-bets. Call e realize equity em posiÃ§Ã£o (CO age depois do SB no flop). AQs hits board well â€” top pair top kicker ou flush draws. Call Ã© mais lucrativo que 4bet aqui.',
    evComparison: { fold: 0, call: 4.5, raise: 4.0 }
  },
  {
    id: 'q106',
    hand: 'A3s',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'A3s vs BB 3bet no BTN: solver prefere fold/call aqui, nÃ£o 4bet. BB 3bet range inclui muitos bluffs com bloqueadores (A5s/A4s/etc) e premiums (TT+/AK) â€” 4bet bluff com A3s seria chamado/jammed por range strong. Em posiÃ§Ã£o, call pode ser exploitable em 3bet pot OOP. Fold Ã© conservador mas sÃ³lido.',
    evComparison: { fold: 0, call: 0.5, raise: 0.2 }
  },
  {
    id: 'q107',
    hand: '99',
    position: 'SB',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: 'fold',
    correctFrequency: 0.85,
    explanation: '99 vs BB 3bet no SB: fold. SB OOP em 3bet pot e 99 nÃ£o tem equity suficiente para 4bet ou call confortÃ¡vel. BB 3bet vs SB inclui TT+/AQ+ e bluffs que dominam ou empatam vs 99. 4bet seria jammed por KK-AA. Call OOP em 3bet pot com 99 cria spots muito difÃ­ceis.',
    evComparison: { fold: 0, call: -0.5, raise: -1.0 }
  },
  {
    id: 'q108',
    hand: 'AKo',
    position: 'UTG',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 1.0,
    explanation: 'AKo no UTG vs BB 3bet: sempre 4bet. AKo Ã© top hand que deve construir o pote. BB 3bet pode ter bluffs (A5s, etc.) e mÃ£os de valor menores (JJ, QQ). 4bet com AKo maximiza EV contra bluffs (eles foldam), e vocÃª vai bem vs QQ/JJ (50%+ equity).',
    evComparison: { fold: 0, call: 5.0, raise: 7.5 }
  },
  {
    id: 'q109',
    hand: 'QQ',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BB',
    correctAction: '4bet',
    correctFrequency: 0.65,
    explanation: 'QQ no BTN vs BB 3bet: mix entre 4bet e call, com leve preferÃªncia por 4bet em posiÃ§Ã£o. BB 3bet range inclui bluffs e valor mÃ©dio. Em posiÃ§Ã£o (BTN), 4bet com QQ explota bluffs e pega value vs JJ-. Chamar tambÃ©m Ã© vÃ¡lido para proteger range de call. Solver ~65% 4bet.',
    evComparison: { fold: 0, call: 8.0, raise: 9.5 }
  },
  {
    id: 'q110',
    hand: 'A5o',
    position: 'CO',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BTN',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: 'A5o vs BTN 3bet no CO: fold. A5o offsuit Ã© muito fraco para 4bet bluff â€” nÃ£o tem a versatilidade do suited version. Em OOP (CO vs BTN), chamar Ã© ruim. 4bet seria chamado por range que domina A5o. Fold limpa a situaÃ§Ã£o. SÃ³ o A5s (suited) tem valor de 4bet bluff.',
    evComparison: { fold: 0, call: -0.8, raise: -0.3 }
  },

  // ============ SQUEEZE â€” 15 novas questÃµes (q111-q125) ============
  {
    id: 'q111',
    hand: 'QQ',
    position: 'BTN',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'QQ no BTN squeeze vs UTG open + caller: sempre squeeze. VocÃª precisa proteger equity vs mÃ£os de caller (pode ter pocket pairs que catcham set), e maximizar EV com premium hand. Squeeze com QQ nega equity de holdings baratos do caller e constrÃ³i pote com mÃ£o forte.',
    evComparison: { fold: 0, call: 6.0, raise: 10.0 }
  },
  {
    id: 'q112',
    hand: 'A5s',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.7,
    explanation: 'A5s no SB squeeze vs BTN open + BB caller: excelente squeeze bluff. A5s tem bloqueadores de Ace, equity quando chamado, e em multiway pot, squeeze nega equity de ambos os players. OOP no SB, squeeze Ã© preferÃ­vel a call â€” evita spots difÃ­ceis com mÃ£o borderline em multiway.',
    evComparison: { fold: 0, call: 0.3, raise: 1.8 }
  },
  {
    id: 'q113',
    hand: 'JTs',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.85,
    explanation: 'JTs no BB squeeze vs CO open + BTN caller: fold. JTs precisa de posiÃ§Ã£o para realizar equity â€” squeeze multiway OOP com JTs Ã© muito ruim. Quando chamado por 2+ players, vocÃª estÃ¡ OOP com mÃ£o de draw. Fold e preserve stack. SÃ³ squeeze com value premium ou blockers fortes.',
    evComparison: { fold: 0, call: -0.5, raise: -1.0 }
  },
  {
    id: 'q114',
    hand: 'KK',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'KK no SB squeeze vs CO open + BTN caller: squeeze obrigatÃ³rio. KK Ã© a 2Âª melhor mÃ£o e quer construir pote vs 2 players. Squeeze nega odds implÃ­citas do caller (evita que ele set-mine vs vocÃª), e maximiza EV quando estÃ£o fora de posiÃ§Ã£o vs CO/BTN ranges.',
    evComparison: { fold: 0, call: 9.0, raise: 14.0 }
  },
  {
    id: 'q115',
    hand: '77',
    position: 'CO',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: '77 no CO squeeze vs UTG open + HJ caller: fold. UTG range Ã© muito tight â€” squeeze com 77 seria chamado/rejammed por AA-TT frequentemente. 77 Ã© set-mining hand que precisa de implied odds, nÃ£o de squeeze spots. Vs tight UTG opener, fold Ã© claramente correto.',
    evComparison: { fold: 0, call: -0.3, raise: -1.2 }
  },
  {
    id: 'q116',
    hand: 'AKs',
    position: 'BTN',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AKs no BTN squeeze vs UTG open + CO caller: sempre squeeze. AKs Ã© top hand e deve construir pote. Em posiÃ§Ã£o (BTN), squeeze isola os players e cria spot onde vocÃª tem posiÃ§Ã£o com mÃ£o premium. AKs domina a maioria dos ranges e tem equity forte em spots multiway.',
    evComparison: { fold: 0, call: 5.0, raise: 9.0 }
  },
  {
    id: 'q117',
    hand: 'KQs',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.75,
    explanation: 'KQs no BB squeeze vs BTN open + SB caller: predominantly squeeze. KQs tem blockers (K/Q reduzem combos premium), boa equity multiway, e squeeze OOP com KQs Ã© correto quando BTN range Ã© wide. ConstrÃ³i pote com mÃ£o forte que domina muito do range.',
    evComparison: { fold: 0, call: 1.5, raise: 3.5 }
  },
  {
    id: 'q118',
    hand: 'T9s',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.85,
    explanation: 'T9s no SB squeeze vs CO open + BTN caller: fold. T9s Ã© mÃ£o de draw que precisa de posiÃ§Ã£o e implied odds â€” nÃ£o de squeeze. Multiway OOP, T9s tem equity realizada ruim mesmo quando hits draw. Fold e espere melhor spot em posiÃ§Ã£o.',
    evComparison: { fold: 0, call: -0.2, raise: -0.8 }
  },
  {
    id: 'q119',
    hand: 'AA',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AA no BB squeeze vs CO open + BTN caller: squeeze obrigatÃ³rio. AA Ã© a melhor mÃ£o possÃ­vel â€” sempre construa o pote. Squeeze com AA maximiza EV, nega odds do caller, e cria pote grande com equity dominante. Call seria desperdiÃ§ar o potencial da mÃ£o.',
    evComparison: { fold: 0, call: 10.0, raise: 18.0 }
  },
  {
    id: 'q120',
    hand: 'A4s',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.6,
    explanation: 'A4s no SB squeeze vs BTN open + BB caller: squeeze bluff vÃ¡lido. A4s tem bloqueador de Ace, equity quando chamado, e fold equity razoÃ¡vel. Solver mistura squeeze e fold aqui. Squeeze Ã© preferÃ­vel a call OOP. Se vai jogar a mÃ£o, squeeze; se nÃ£o, fold.',
    evComparison: { fold: 0, call: 0.1, raise: 1.0 }
  },
  {
    id: 'q121',
    hand: 'JJ',
    position: 'BTN',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'JJ no BTN squeeze vs HJ open + CO caller: squeeze. Em posiÃ§Ã£o com JJ, vocÃª deve construir o pote. Squeeze nega set-mining do caller e isola vs HJ range. JJ tem equity forte vs ambos os ranges e aproveita posiÃ§Ã£o pÃ³s-flop. Squeeze sempre com premium pair em posiÃ§Ã£o.',
    evComparison: { fold: 0, call: 5.5, raise: 8.0 }
  },
  {
    id: 'q122',
    hand: '66',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: '66 no BB squeeze vs CO open + BTN caller: fold. Par pequeno OOP em multiway â€” nÃ£o tem valor de squeeze e call multiway OOP com 66 Ã© difÃ­cil. Set odds sÃ£o bons sÃ³ quando hÃ¡ implied odds grandes. Em squeeze pot, potes ficam grandes mas vocÃª estÃ¡ OOP. Fold.',
    evComparison: { fold: 0, call: -0.2, raise: -0.8 }
  },
  {
    id: 'q123',
    hand: 'KJs',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'KJs no SB squeeze vs BTN open + BB caller: mix entre fold e squeeze. KJs sem bloqueadores de Ace perfeitos e OOP no SB. Solver geralmente prefere fold aqui â€” BTN range Ã© amplo mas KJs multiway OOP tem realizaÃ§Ã£o ruim. Fold conservador Ã© sÃ³lido.',
    evComparison: { fold: 0, call: 0.2, raise: 0.5 }
  },
  {
    id: 'q124',
    hand: 'TT',
    position: 'BB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'call',
    correctFrequency: 0.65,
    explanation: 'TT no BB squeeze vs UTG open + CO caller: mix entre call e squeeze, com leve preferÃªncia por call. TT tem boa equity vs UTG tight range, mas squeeze OOP vs 2 players exige mais valor. Call e realize equity â€” quando hits set, ganha; quando nÃ£o, pode fold vs pressÃ£o.',
    evComparison: { fold: 0, call: 3.5, raise: 3.8 }
  },
  {
    id: 'q125',
    hand: 'AQs',
    position: 'SB',
    heroStack: 100,
    scenario: 'squeeze',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: '3bet',
    correctFrequency: 0.9,
    explanation: 'AQs no SB squeeze vs CO open + BTN caller: squeeze. AQs tem boa equity, blockers (Ace), e OOP no SB, squeeze Ã© melhor que call. Denegar implied odds do BTN caller e construir pote com mÃ£o forte. AQs squeeze Ã© padrÃ£o de estratÃ©gia GTO no SB.',
    evComparison: { fold: 0, call: 2.0, raise: 4.0 }
  },

  // ============ BB DEFENSE â€” 15 novas questÃµes (q126-q140) ============
  {
    id: 'q126',
    hand: 'A7s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'A7s vs UTG open no BB: mix entre fold e call. UTG range Ã© muito tight (~15%) e inclui muitas mÃ£os que dominam A7s (AK, AQ, AJ, AT, AA). Call OOP vs UTG tight range com A7s cria spots difÃ­ceis â€” vocÃª frequentemente tem pair fraco ou Ã© dominado. Fold Ã© sÃ³lido aqui.',
    evComparison: { fold: 0, call: 0.2, raise: -0.3 }
  },
  {
    id: 'q127',
    hand: '87s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '87s vs BTN open no BB Ã© um call padrÃ£o. BTN range Ã© amplo (~45%), e 87s tem boa playability â€” draws a straight, flush draws, pair mÃ©dio. Com odds do BB (jÃ¡ tem 1 BB no pote), chamar Ã© claramente lucrativo. 87s realiza equity bem vs range wide do BTN.',
    evComparison: { fold: 0, call: 0.9, raise: 0.5 }
  },
  {
    id: 'q128',
    hand: 'K6s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'K6s vs CO open no BB: mix, com preferÃªncia por fold. CO range (~28%) tem mÃ£os fortes que dominam K6s (KQ, KJ, KT, AK). Chamar com K6s cria spots onde vocÃª tem K com kicker fraco e dificulta tomar decisÃµes. Solver geralmente fold aqui com K6s vs CO.',
    evComparison: { fold: 0, call: 0.1, raise: -0.2 }
  },
  {
    id: 'q129',
    hand: 'Q9o',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'Q9o vs BTN open no BB Ã© um call. BTN range Ã© wide, e Q9o tem equity suficiente para defender. Q9o pode formar top-pair mÃ©dio, straightdraws e dois-pares. Com odds do BB e BTN range amplo, call Ã© claramente correto. Evite 3bet com Q9o â€” prefira call.',
    evComparison: { fold: 0, call: 0.6, raise: 0.1 }
  },
  {
    id: 'q130',
    hand: 'J8s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'J8s vs HJ open no BB Ã© um call. HJ range Ã© ~22% â€” moderado. J8s tem boa playability suited, pode formar draws fortes e top-pair. O BB sempre fecha a aÃ§Ã£o com odds boas, e J8s tem equity suficiente vs HJ range para defender. Call Ã© padrÃ£o.',
    evComparison: { fold: 0, call: 0.7, raise: 0.2 }
  },
  {
    id: 'q131',
    hand: '22',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '22 vs CO open no BB: call padrÃ£o. O BB fecha a aÃ§Ã£o com odds implÃ­citas de set-mining. 22 tem equity de ~50% vs AKo, mas seu valor principal Ã© pegar set (1 em 8 vezes). Quando pega set, ganhe pote enorme. CO range nÃ£o justifica fold de 22 no BB.',
    evComparison: { fold: 0, call: 0.8, raise: 0.0 }
  },
  {
    id: 'q132',
    hand: 'T7s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'T7s vs BTN open no BB: call. BTN range amplÃ­ssimo â€” T7s tem equity suficiente para defender. Conectores suited mÃ©dios tÃªm boa playability OOP: draws a straight/flush, top-pair medium. O BB tem as melhores odds do poker (jÃ¡ investiu 1 BB), justificando call com T7s.',
    evComparison: { fold: 0, call: 0.5, raise: 0.1 }
  },
  {
    id: 'q133',
    hand: '64s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.65,
    explanation: '64s vs BTN open no BB: mix entre call e fold. BTN range Ã© muito wide â€” 64s tem equity borderline. Solver mistura ~65% call e ~35% fold. O suit (potential flush/straight draw) torna call razoÃ¡vel, mas Ã© a parte mais fraca do range defensivo do BB.',
    evComparison: { fold: 0, call: 0.2, raise: -0.1 }
  },
  {
    id: 'q134',
    hand: 'A6o',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'A6o vs BTN open no BB: call padrÃ£o. BTN range inclui muitas mÃ£os que A6o domina â€” qualquer A com kicker menor, pares 22-55, conectores. A6o tem equity ~48% vs BTN range amplo. Com odds do BB, call Ã© claramente lucrativo.',
    evComparison: { fold: 0, call: 0.7, raise: 0.2 }
  },
  {
    id: 'q135',
    hand: '97s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '97s vs CO open no BB: call. CO range Ã© ~28% e 97s tem boa equity vs esse range. Conector suited com draws a straight/flush. O BB fecha a aÃ§Ã£o e 97s Ã© forte o suficiente para defender vs CO. NÃ£o 3bet â€” call e realize equity pÃ³s-flop.',
    evComparison: { fold: 0, call: 0.8, raise: 0.3 }
  },
  {
    id: 'q136',
    hand: 'K4s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.85,
    explanation: 'K4s vs UTG open no BB: fold. UTG tight range tem muitas mÃ£os que dominam K4s â€” AK, KK, KQ, KJ. Chamar com K4s cria spots difÃ­ceis de second/third pair com kicker ruim. Solver fold K4s vs UTG na maioria dos configs. SÃ³ defenda KXs vs opens mais fracos (BTN/SB).',
    evComparison: { fold: 0, call: -0.1, raise: -0.5 }
  },
  {
    id: 'q137',
    hand: 'QJo',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'QJo vs HJ open no BB: call. QJo tem boa equity vs HJ range â€” top-pair frequente, broadways, straightdraws. Com odds do BB, call Ã© correto. QJo pode 3bet ocasionalmente mas call Ã© mais frequente. Ã‰ uma das mÃ£os de defesa mais sÃ³lidas do BB range vs HJ.',
    evComparison: { fold: 0, call: 1.2, raise: 1.0 }
  },
  {
    id: 'q138',
    hand: 'J9s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'SB',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'J9s vs SB open no BB: call padrÃ£o. SB vs BB Ã© o spot mais favorÃ¡vel para defender â€” SB range pode ser wide e vocÃª fecha a aÃ§Ã£o. J9s tem excelente playability: straightdraws, top-pair middle kicker, flush draws. Call Ã© correto vs qualquer SB raise aqui.',
    evComparison: { fold: 0, call: 1.0, raise: 0.7 }
  },
  {
    id: 'q139',
    hand: 'T6s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'T6s vs BTN open no BB: mix, levemente call. BTN range muito wide â€” T6s tem equity marginal mas suficiente. Solver mistura call/fold aqui. O suit torna call mais atraente. T6s is one of the weaker hands in BB defense range mas vs BTN wide range ainda Ã© lucrativo.',
    evComparison: { fold: 0, call: 0.1, raise: -0.2 }
  },
  {
    id: 'q140',
    hand: '85s',
    position: 'BB',
    heroStack: 100,
    scenario: 'bb_defense',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'fold',
    correctFrequency: 0.55,
    explanation: '85s vs BTN open no BB: borderline â€” solver mistura quase 50/50. 85s Ã© um conector gapped baixo que tem equity marginal vs BTN range. O suit ajuda mas a mÃ£o tem gaps. Em tabelas exploitativas, fold Ã© defensÃ¡vel. Em GTO puro, Ã© um spot de mistura.',
    evComparison: { fold: 0, call: 0.0, raise: -0.2 }
  },

  // ============ PUSH/FOLD â€” 10 novas questÃµes (q141-q150) ============
  {
    id: 'q141',
    hand: 'A2s',
    position: 'UTG',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: 'A2s no UTG com 10bb: fold. A2s nÃ£o estÃ¡ no push range do UTG a 10bb â€” o UTG range de push Ã© muito tight (AA-99, AKs-ATs, AKo-AQo, KQs). A2s no UTG enfrenta muitos callers com mÃ£os melhores. Aguarde posiÃ§Ã£o melhor (SB/BTN) para push com A2s.',
    evComparison: { fold: 0, call: 0, raise: -1.5 }
  },
  {
    id: 'q142',
    hand: '66',
    position: 'BTN',
    heroStack: 12,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: '66 no BTN com 12bb: push. BTN push range a ~10-15bb inclui 66+ confortavelmente. VocÃª tem fold equity considerÃ¡vel vs SB/BB, e quando chamado, 66 tem ~45-50% equity vs maioria dos call ranges. Shove Ã© correto â€” esperar por mÃ£os melhores com 12bb Ã© muito passivo.',
    evComparison: { fold: 0, call: 0, raise: 2.5 }
  },
  {
    id: 'q143',
    hand: 'KTo',
    position: 'SB',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: 'KTo no SB com 10bb: shove. SB push range a 10bb Ã© amplo â€” vs apenas BB, vocÃª tem excelente fold equity e KTo estÃ¡ claramente no range. KTo tem ~58% equity vs BB call range. Push para ganhar os blinds ou entrar em pote com equity positiva. Fold seria muito passivo.',
    evComparison: { fold: 0, call: 0, raise: 3.0 }
  },
  {
    id: 'q144',
    hand: '87s',
    position: 'CO',
    heroStack: 8,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 0.85,
    explanation: '87s no CO com 8bb: shove. Com stack curtÃ­ssimo, conectores suited perdem implied odds mas tÃªm equity de push. A 8bb, 87s tem fold equity suficiente e ~38% equity quando chamado. O push EV Ã© positivo por causa do fold equity vs 3 players. Push Ã© correto.',
    evComparison: { fold: 0, call: 0, raise: 1.8 }
  },
  {
    id: 'q145',
    hand: 'Q9o',
    position: 'BTN',
    heroStack: 15,
    scenario: 'push_fold',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'Q9o no BTN com 15bb: fold/shove mix, levemente fold. A 15bb, o push range do BTN estÃ¡ entre ~50-60% das mÃ£os, mas Q9o Ã© borderline. Solver mistura aqui â€” a 15bb tem mais opÃ§Ãµes (pode abrir para 2.5x). Shove com Q9o pode ser chamado por mÃ£os que dominam. Fold/abertura normal sÃ£o preferÃ­veis.',
    evComparison: { fold: 0, call: 0, raise: 0.3 }
  },
  {
    id: 'q146',
    hand: 'JTo',
    position: 'SB',
    heroStack: 12,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 0.9,
    explanation: 'JTo no SB com 12bb: shove. SB push range a 12bb inclui JTo claramente. Vs apenas BB, vocÃª tem ~55% fold equity e JTo tem boa equity quando chamado (~45%). Push maximiza EV â€” muito melhor que limp/fold ou min-raise que desperdiÃ§a stack.',
    evComparison: { fold: 0, call: 0, raise: 2.8 }
  },
  {
    id: 'q147',
    hand: 'A3o',
    position: 'UTG',
    heroStack: 15,
    scenario: 'push_fold',
    correctAction: 'fold',
    correctFrequency: 0.75,
    explanation: 'A3o no UTG com 15bb: fold. UTG push range a 15bb Ã© tight (AA-TT, AKs-AJs, AKo-AQo). A3o offsuit nÃ£o estÃ¡ no UTG range â€” enfrenta muitos players atrÃ¡s que podem ter mÃ£os melhores. Aguarde posiÃ§Ã£o melhor ou mÃ£o melhor. A3s suited seria diferente.',
    evComparison: { fold: 0, call: 0, raise: -0.5 }
  },
  {
    id: 'q148',
    hand: '55',
    position: 'HJ',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: '55 no HJ com 10bb: shove. Par mÃ©dio com fold equity razoÃ¡vel e equity de ~50% quando chamado vs overcards. HJ push range a 10bb inclui 55+. Push faz sentido â€” vocÃª pode ganhar cegos imediatamente ou entrar em coinflip favorÃ¡vel. Fold seria muito tight com 10bb.',
    evComparison: { fold: 0, call: 0, raise: 2.2 }
  },
  {
    id: 'q149',
    hand: 'K8s',
    position: 'BTN',
    heroStack: 8,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: 'K8s no BTN com 8bb: shove obrigatÃ³rio. Com 8bb, quase toda mÃ£o razoÃ¡vel Ã© push no BTN. K8s tem excelente equity quando chamado (boa equity vs A-x, domina K7s-), e fold equity considerÃ¡vel vs SB/BB. Push tudo que tem equity positiva a 8bb na BTN.',
    evComparison: { fold: 0, call: 0, raise: 3.5 }
  },
  {
    id: 'q150',
    hand: '99',
    position: 'CO',
    heroStack: 15,
    scenario: 'push_fold',
    correctAction: 'shove',
    correctFrequency: 1.0,
    explanation: '99 no CO com 15bb: shove. Par mÃ©dio-alto com equity sÃ³lida. CO push range a 15bb inclui claramente 99. Quando chamado, 99 tem ~70% vs broadways e ~55% vs Ax. Fold equity razoÃ¡vel vs 3 players. Push maximiza EV â€” nÃ£o hÃ¡ razÃ£o para fold com 99 a 15bb.',
    evComparison: { fold: 0, call: 0, raise: 4.0 }
  },
]

// ------- CURSOS MOCKADOS -------
export const COURSES_DATA = [
  {
    id: 'c001',
    title: 'Fundamentos do GTO',
    description: 'Entenda os conceitos base de Game Theory Optimal e como aplicar em suas mesas',
    category: 'preflop' as const,
    difficulty: 'beginner' as const,
    totalMinutes: 120,
    isPremium: false,
    thumbnail: 'ðŸŽ¯',
    modules: [
      { id: 'm001', title: 'O que Ã© GTO?', lessons: [
        { id: 'l001', title: 'IntroduÃ§Ã£o ao equilÃ­brio de Nash', duration: 12, isCompleted: true, type: 'video' as const,
          content: 'O equilÃ­brio de Nash no poker significa jogar uma estratÃ©gia que nÃ£o pode ser exploitada â€” mesmo que o adversÃ¡rio conheÃ§a seu plano exato.\n\nðŸ”‘ Conceito chave: Em GTO, vocÃª joga RANGES, nÃ£o mÃ£os individuais. Ao invÃ©s de "eu tenho AK", pense "minha range nessa situaÃ§Ã£o Ã© {AA,KK,QQ,AKs,AKo...}".\n\nPor que isso importa? Se vocÃª sempre faz a mesma aÃ§Ã£o com a mesma mÃ£o (ex: sempre 3bet com AA), o villain pode exploitar isso. GTO mistura aÃ§Ãµes para ser imprevisÃ­vel.\n\nðŸ“Š Exemplo prÃ¡tico: Com QQ no BTN vs CO open, vocÃª 3bet 80% e call 20% â€” nÃ£o porque vocÃª aleatoriamente escolhe, mas porque sua range nesse spot precisa ter ambas as aÃ§Ãµes para ser balanceada.' },
        { id: 'l002', title: 'Ranges vs MÃ£os especÃ­ficas', duration: 8, isCompleted: true, type: 'article' as const,
          content: 'A maior evoluÃ§Ã£o no poker moderno foi parar de pensar em mÃ£os especÃ­ficas e comeÃ§ar a pensar em RANGES.\n\nâŒ Pensamento antigo: "Villain tem AK porque betou forte no flop de A-7-2"\nâœ… Pensamento moderno: "Villain tem {AA,AK,AQ,77,22,A7s...} nesse spot â€” uma range polarizada"\n\nðŸƒ Como construir uma range:\n1. Qual Ã© a posiÃ§Ã£o do villain?\n2. Qual foi a aÃ§Ã£o prÃ©-flop?\n3. Qual board favorece mais qual range?\n4. Qual Ã© o sizing usado?\n\nCom isso, vocÃª toma decisÃµes baseadas em frequÃªncias de EV, nÃ£o em intuiÃ§Ã£o sobre uma mÃ£o especÃ­fica.' },
        { id: 'l003', title: 'Quiz: Fundamentos GTO', duration: 5, isCompleted: false, type: 'quiz' as const,
          content: 'Teste seus conhecimentos sobre fundamentos GTO. Use o Treinador PrÃ©-Flop em modo Estudo para praticar os conceitos desta aula.' },
      ]},
      { id: 'm002', title: 'FrequÃªncias e Mixing', lessons: [
        { id: 'l004', title: 'Por que misturar frequÃªncias?', duration: 15, isCompleted: false, type: 'video' as const,
          content: 'Mixing (mistura de estratÃ©gias) Ã© um conceito fundamental do GTO. Significa fazer AÃ‡Ã•ES DIFERENTES com a mesma mÃ£o dependendo de uma frequÃªncia predefinida.\n\nðŸŽ² Por que misturar?\nSe vocÃª sempre raise com AA, o villain folda sempre que vocÃª raise forte. Se vocÃª sempre call com AA, o villain vai bluffar muito contra vocÃª. A soluÃ§Ã£o: misturar raise/call com AA em certas frequÃªncias para que o villain nÃ£o possa exploitar.\n\nðŸ“ Exemplo real â€” SB vs BB:\nâ€¢ K5o no SB: 60% raise, 40% limp\nâ€¢ NÃ£o porque a mÃ£o Ã© boa Ã s vezes e ruim outras\nâ€¢ Mas porque sua range do SB precisa ter ambas as aÃ§Ãµes com mÃ£os dessa categoria\n\nâš¡ Na prÃ¡tica: Para a maioria dos jogadores amadores, focar em RANGES SÃ“LIDAS Ã© mais valioso que mixing perfeito. Mixing importa mais nos nÃ­veis mais altos.' },
        { id: 'l005', title: 'Sizing e frequÃªncias pÃ³s-flop', duration: 10, isCompleted: false, type: 'article' as const,
          content: 'O sizing que vocÃª escolhe no pÃ³s-flop deve ser consistente com sua RANGE completa, nÃ£o apenas com sua mÃ£o especÃ­fica.\n\nðŸ’° Regras de sizing GTO:\nâ€¢ Bet 33% pot: thin value, bluffs com equity, boards onde ranges estÃ£o prÃ³ximas\nâ€¢ Bet 50-67% pot: value mÃ©dio, semi-bluffs em boards coordenados\nâ€¢ Bet 75-100% pot: valor premium, bluffs polarizados em boards secos\nâ€¢ Overbet (>pot): range muito polarizada (nuts ou ar), normalmente no river\n\nðŸ”‘ PrincÃ­pio fundamental: Use o mesmo sizing com mÃ£os de valor E com bluffs do mesmo tipo. Exemplo: se vocÃª bets 75% pot com top set, tambÃ©m bets 75% com seus bluffs naquele board â€” nÃ£o com 33%.' },
      ]},
    ],
  },
  {
    id: 'c002',
    title: 'Ranges PrÃ©-Flop Completos',
    description: 'Domine todas as posiÃ§Ãµes em cash game 6-max e tornamentos',
    category: 'preflop' as const,
    difficulty: 'intermediate' as const,
    totalMinutes: 240,
    isPremium: false,
    thumbnail: 'ðŸ“Š',
    modules: [
      { id: 'm003', title: 'PosiÃ§Ãµes Early', lessons: [
        { id: 'l006', title: 'UTG e UTG+1 em 6-max', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'UTG (Under The Gun) Ã© a posiÃ§Ã£o mais difÃ­cil do 6-max. VocÃª age PRIMEIRO em todas as ruas â€” antes de saber o que os outros vÃ£o fazer.\n\nðŸ“Š Range UTG 6-max (~15% das mÃ£os):\nâ€¢ Pares: 88+\nâ€¢ Aces suited: ATs+\nâ€¢ Aces offsuit: AKo, AQo\nâ€¢ Broadways suited: KQs, KJs\n\nâŒ MÃ£os que parecem boas mas sÃ£o fold no UTG:\nâ€¢ JTs â€” joga bem em posiÃ§Ã£o, nÃ£o OOP vs 5 players\nâ€¢ 55/66 â€” set-mining precisa de implied odds profundos\nâ€¢ KJo â€” kicker mÃ©dio OOP Ã© problemÃ¡tico\n\nðŸŽ¯ Por que tÃ£o tight? VocÃª pode ser 3betado por qualquer posiÃ§Ã£o depois de vocÃª. Seu range precisa ser forte o suficiente para aguentar pressÃ£o de toda a mesa.' },
        { id: 'l007', title: 'HJ e CO â€” posiÃ§Ãµes de transiÃ§Ã£o', duration: 15, isCompleted: false, type: 'article' as const,
          content: 'HJ e CO sÃ£o as posiÃ§Ãµes de "transiÃ§Ã£o" â€” mais largas que early positions mas nÃ£o tÃ£o largas quanto BTN.\n\nðŸ“Š Range HJ (~22%):\nTudo do UTG+ adicionando: 77, A9s/A8s, K9s/KTs, QTs/Q9s, JTs, T9s, KQo\n\nðŸ“Š Range CO (~28%):\nTudo do HJ+ adicionando: 66/55, A7s-A5s, K8s, J9s, T8s, 98s, 87s, KJo, QJo, ATo/A9o\n\nðŸ”‘ PrincÃ­pio: A cada posiÃ§Ã£o que avanÃ§a, vocÃª adiciona mÃ£os especulativas (conectores, suited aces menores) que precisam de implied odds pÃ³s-flop.' },
        { id: 'l008', title: 'Drill: PosiÃ§Ãµes Early/MÃ©dio', duration: 15, isCompleted: false, type: 'quiz' as const,
          content: 'Pratique abertura de UTG e HJ no Treinador PrÃ©-Flop. Configure o cenÃ¡rio para "Open Raise" e a posiÃ§Ã£o para UTG ou HJ. Objetivo: â‰¥80% de precisÃ£o.' },
      ]},
      { id: 'm004', title: 'PosiÃ§Ãµes Late', lessons: [
        { id: 'l009', title: 'BTN stealing â€” o superpoder do poker', duration: 18, isCompleted: false, type: 'article' as const,
          content: 'O BTN (Button) Ã© a melhor posiÃ§Ã£o do poker. VocÃª age POR ÃšLTIMO em todas as ruas do flop em diante â€” uma vantagem enorme.\n\nðŸ“Š Range BTN (~45% das mÃ£os):\nPraticamente tudo com potencial: pares 22+, todos Ax suited, broadways, conectores suited atÃ© 54s, Kxs atÃ© K2s, offsuit atÃ© QJo/KTo.\n\nðŸŽ¯ Steal vs Blinds:\nâ€¢ SB e BB tÃªm que defender OOP â€” eles sÃ£o desvantajosos\nâ€¢ BTN pode abrir amplo e ganhar chips dos blinds frequentemente\nâ€¢ Valor do BTN steal: ~0.5-1 BB/mÃ£o em risco\n\nðŸ’¡ Regra prÃ¡tica: Se vocÃª abre no BTN e os blinds foldarem, vocÃª ganhou ~1.5 BBs sem ver flop. Fazendo isso consistentemente Ã© extremamente lucrativo a longo prazo.' },
        { id: 'l010', title: 'SB vs BB â€” o duelo especial', duration: 22, isCompleted: false, type: 'article' as const,
          content: 'SB vs BB Ã© o Ãºnico spot onde AMBOS os players estÃ£o fora de posiÃ§Ã£o. O SB age primeiro no pÃ³s-flop, entÃ£o o BB tem ligeira vantagem posicional.\n\nðŸ“Š EstratÃ©gia SB:\nâ€¢ Raise range: ~45% (bem largo â€” BB nÃ£o tem incentivo de foldar)\nâ€¢ Limp range: ~18% (mÃ£os que jogam bem multiway mas difÃ­ceis de abrir)\nâ€¢ Fold: ~37% (lixo puro)\n\nðŸ“Š EstratÃ©gia BB vs SB open:\nâ€¢ Defesa: ~65% (BB tem odds excelentes â€” jÃ¡ investiu 1 BB)\nâ€¢ 3bet: ~10% (mÃ£os premium + bluffs com bloqueadores)\n\nðŸ”‘ Insight: O BB deve foldar menos vs SB do que vs qualquer outra posiÃ§Ã£o, porque o SB abre muito amplo. Um SB range de 45% inclui muito trash que o BB domina facilmente.' },
      ]},
    ],
  },
  {
    id: 'c003',
    title: 'ICM e Tornamentos',
    description: 'Aprenda a tomar decisÃµes corretas considerando o Independent Chip Model',
    category: 'icm' as const,
    difficulty: 'advanced' as const,
    totalMinutes: 180,
    isPremium: false,
    thumbnail: 'ðŸ†',
    modules: [
      { id: 'm005', title: 'Fundamentos do ICM', lessons: [
        { id: 'l011', title: 'O que Ã© ICM e por que importa', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'ICM (Independent Chip Model) Ã© o modelo matemÃ¡tico que converte chips de torneio em valor monetÃ¡rio real ($EV).\n\nðŸ’¡ Por que chips nÃ£o valem linearmente:\nâ€¢ Em um torneio com R$1000 de prÃªmio e 100 chips, cada chip nÃ£o vale R$10\nâ€¢ O chip leader nÃ£o tem toda a vantagem proporcional\nâ€¢ Short stacks valem proporcionalmente MAIS em $ do que em chips\n\nðŸ“Š Exemplo:\nFinal table 3 players, R$500/300/200 (total R$1000)\nâ€¢ Stacks: 50 chips, 30 chips, 20 chips\nâ€¢ Chip %: 50%, 30%, 20%\nâ€¢ ICM $: ~44%, 32%, 24% (o leader perde, o short ganha proporcionalmente)\n\nðŸŽ¯ Impacto prÃ¡tico:\nâ€¢ Na bolha: aperte seu range â€” a diferenÃ§a de $ entre entrar no dinheiro e sair Ã© enorme\nâ€¢ Chip leader: nÃ£o precisa arriscar vs outros big stacks â€” deixe short stacks eliminar uns aos outros\nâ€¢ Short stack: precisa acumular chips â€” fold equidade Ã© seu inimigo' },
        { id: 'l012', title: 'ICM na bolha â€” quando foldar premium', duration: 25, isCompleted: false, type: 'article' as const,
          content: 'A bolha Ã© onde ICM muda mais drasticamente as decisÃµes corretas. SituaÃ§Ãµes onde vocÃª deveria foldar mÃ£os "fortes":\n\nâš ï¸ Exemplo clÃ¡ssico â€” JJ na bolha:\nâ€¢ 4 players, 3 pagam. VocÃª tem 35bb (quase garantido ITM se foldar)\nâ€¢ Short stack (5bb) vai all-in, chip leader (40bb) cold-call\nâ€¢ Resultado: FOLD com JJ!\nâ€¢ Por quÃª? VocÃª entra vs 2 ranges, sua equity cai muito, e se perder vai para ~10bb em risco real\n\nâœ… Quando continuar com premium na bolha:\nâ€¢ VocÃª Ã‰ o short stack â€” precisa acumular\nâ€¢ Ã‰ heads-up vs apenas 1 player, nÃ£o multiway\nâ€¢ Sua equity Ã© dominante (AA/KK vs 1 player com range wide)\n\nðŸ”‘ Frase-chave: "ICM te pede para foldar quando o custo de perder chips supera o benefÃ­cio de ganhar chips"' },
        { id: 'l013', title: 'ICM Drill â€” pratique no app', duration: 12, isCompleted: false, type: 'drill' as const,
          content: 'Pratique decisÃµes ICM na Calculadora â†’ ICM Drill. Resolva todos os 10 cenÃ¡rios e tente atingir 80%+ de acertos. Foque nos cenÃ¡rios de bolha onde o fold de premium Ã© correto.' },
      ]},
    ],
  },
  {
    id: 'c004',
    title: 'EstratÃ©gia PÃ³s-Flop AvanÃ§ada',
    description: 'DominÃ¢ncia de board, protegendo ranges, sizing correto em todas as ruas',
    category: 'postflop' as const,
    difficulty: 'advanced' as const,
    totalMinutes: 300,
    isPremium: false,
    thumbnail: 'ðŸƒ',
    modules: [
      { id: 'm006', title: 'Textura de Board', lessons: [
        { id: 'l014', title: 'Boards secos vs coordenados', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'A textura do board determina qual range tem vantagem e quais sizings sÃ£o corretos.\n\nðŸ§± Board SECO (ex: Aâ™ 7â™¦2â™£ rainbow):\nâ€¢ Poucos draws possÃ­veis\nâ€¢ Range advantage para quem abriu prÃ©-flop (more Aces)\nâ€¢ Sizing: bet pequeno (33%) com frequÃªncia alta â€” villain tem poucas draws pra chamar\nâ€¢ IP: bet ~70% da range, tamanho 25-33%\n\nðŸŒŠ Board COORDENADO (ex: Jâ™¥Tâ™ 9â™¥):\nâ€¢ Muitos draws, straights, flushdraws\nâ€¢ Ranges mais prÃ³ximas â€” nem aggressor nem caller tÃªm grande vantagem\nâ€¢ Sizing: bet maior (67-75%) com frequÃªncia menor\nâ€¢ Semi-bluffs com draws tÃªm alto EV aqui\n\nðŸ”‘ Regra: Em boards secos, bet pequeno e frequente. Em boards molhados, bet grande e seletivo.' },
        { id: 'l015', title: 'Range Advantage vs Nut Advantage', duration: 18, isCompleted: false, type: 'article' as const,
          content: 'Dois conceitos diferentes que guiam a estratÃ©gia pÃ³s-flop:\n\nðŸ“Š RANGE ADVANTAGE:\nSua range geral tem mais equity do que a range do villain naquele board.\nâ€¢ Ex: UTG opener vs BB caller no flop Aâ™ Kâ™£7â™¦ â€” UTG tem muito mais Aces e Kings\nâ€¢ Com range advantage: bet frequente com sizings menores\n\nðŸ¥‡ NUT ADVANTAGE:\nVocÃª tem proporcionalmente mais das mÃ£os MAIS FORTES (sets, dois pares, nuts)\nâ€¢ Pode existir mesmo sem range advantage total\nâ€¢ Com nut advantage: sizings maiores, overbets possÃ­veis\n\nðŸ’¡ Exemplo: No flop Jâ™¥Tâ™ 9â™¥, o BB caller pode ter mais straights e dois pares que o UTG opener â€” BB tem nut advantage apesar de range disadvantage global.' },
      ]},
      { id: 'm007', title: 'Turn e River', lessons: [
        { id: 'l016', title: 'DecisÃµes de turn â€” draws e equity', duration: 22, isCompleted: false, type: 'article' as const,
          content: 'No turn, ranges ficam mais polarizadas e decisÃµes de draws ficam crÃ­ticas.\n\nðŸŽ¯ Tipos de turn cards:\nâ€¢ GIN card: completou sua draw principal â€” agora vocÃª tem o melhor\nâ€¢ Scare card: completou possÃ­vel draw do villain, mudou a dinÃ¢mica\nâ€¢ Blank: neutro, mantÃ©m hierarquia do flop\n\nðŸ“ Sizing no turn:\nâ€¢ Draws que melhoraram: bet 50-67% para extrair valor\nâ€¢ Draws que nÃ£o melhoraram: check com frequÃªncia (preserve equity)\nâ€¢ MÃ£os fortes: bet 67-75%, construa o pote para o river\n\nâš¡ Conceito crÃ­tico â€” Pot commitment:\nCom SPR â‰¤ 2 no turn, vocÃª estÃ¡ "committed" â€” qualquer aposta forte te leva a all-in no river. Planeje sua linha antes de agir.' },
        { id: 'l017', title: 'River â€” value e bluff', duration: 25, isCompleted: false, type: 'article' as const,
          content: 'O river Ã© a rua de decisÃ£o final. Draws nÃ£o existem mais â€” vocÃª tem o que tem.\n\nðŸ’° THIN VALUE no river:\nBet com mÃ£os que ganham apenas do range especÃ­fico do villain:\nâ€¢ Top pair mÃ©dio kicker vs range de check-behind\nâ€¢ Bet 33% para extrair de pairs piores\nâ€¢ Evite value-betting mÃ£os que perdem de ~50% do range\n\nðŸŽ­ BLUFF RATIO no river:\nPara cada tamanho de bet, vocÃª precisa bluffar em certa proporÃ§Ã£o:\nâ€¢ Bet 33% pot: bluff ~25% das vezes (precisa funcionar 25% para ser lucrativo)\nâ€¢ Bet 75% pot: bluff ~43% das vezes\nâ€¢ Pot bet: bluff ~50% das vezes\n\nðŸ”‘ Escolha bluffs com mÃ£os que tÃªm ZERO showdown value (draws que nÃ£o completaram) â€” nÃ£o "bluff" com mÃ£os medianas que ainda podem ganhar no showdown.' },
      ]},
    ],
  },
  {
    id: 'c005',
    title: 'Bankroll Management',
    description: 'Regras de BRM por formato, como proteger seu bankroll e subir de stakes',
    category: 'mental' as const,
    difficulty: 'beginner' as const,
    totalMinutes: 90,
    isPremium: false,
    thumbnail: 'ðŸ’°',
    modules: [
      { id: 'm008', title: 'Fundamentos de BRM', lessons: [
        { id: 'l018', title: 'Por que BRM salva carreiras', duration: 15, isCompleted: false, type: 'article' as const,
          content: 'Bankroll Management (BRM) Ã© o conjunto de regras que protege seu bankroll da variÃ¢ncia natural do poker. Sem BRM, atÃ© players vencedores ficam broke.\n\nðŸ“Š A matemÃ¡tica da variÃ¢ncia:\nUm player com winrate de 5 BB/100 em NL50 ainda tem chances de ter downswings de 20-30 buy-ins. Com apenas 10 buy-ins, isso significa quebrar â€” mesmo sendo lucrativo a longo prazo.\n\nðŸŽ¯ Regras mÃ­nimas por formato:\n\nðŸ’µ Cash Game (6-max online):\nâ€¢ MÃ­nimo: 20 buy-ins para o stake\nâ€¢ Conservador: 30 buy-ins\nâ€¢ Ex: Para jogar NL50 (R$250 buy-in), precisa de R$5.000-7.500\n\nðŸ† MTT:\nâ€¢ MÃ­nimo: 50 buy-ins\nâ€¢ Alta variÃ¢ncia: 100+ buy-ins recomendado\nâ€¢ Ex: Para MTT de R$50, precisa de R$2.500-5.000\n\nðŸŽ° SNG:\nâ€¢ MÃ­nimo: 30 buy-ins\nâ€¢ Conservador: 50 buy-ins\n\nâš¡ Spin & Go:\nâ€¢ Alta variÃ¢ncia de prize pool: 100+ buy-ins' },
        { id: 'l019', title: 'Como subir e descer de stakes', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'ðŸš€ SUBIR DE STAKE:\nNÃ£o suba apenas porque "alcanÃ§ou os buy-ins". CritÃ©rios:\n1. Bankroll â‰¥ 30 buy-ins para o novo stake\n2. Winrate positivo no stake atual (mÃ­nimo 50k mÃ£os de amostra)\n3. Estudo do novo stake (villain pools sÃ£o diferentes)\n4. Estado mental adequado â€” nÃ£o suba apÃ³s bad beat\n\nðŸ“‰ DESCER DE STAKE (stop-loss):\nEscolha um nÃºmero ANTES de comeÃ§ar a sessÃ£o:\nâ€¢ DesÃ§a se perder 3-5 buy-ins na sessÃ£o\nâ€¢ DesÃ§a se bankroll cair abaixo de 15-20 buy-ins\nâ€¢ Nunca jogue "one more" depois do stop-loss\n\nðŸ”‘ Regra de ouro:\nQuando descer de stake, trate como decisÃ£o profissional, nÃ£o como derrota. Players vencedores descem durante downswings e sobem quando se estabilizam.\n\nðŸ’¡ Shot-taking:\nPode "experimentar" um stake maior ocasionalmente:\nâ€¢ Limite: 1-2% do bankroll total\nâ€¢ MÃ¡ximo 1 sessÃ£o de shot por semana\nâ€¢ Se perder o shot, volte imediatamente' },
        { id: 'l020', title: 'BRM Calculator â€” use no app', duration: 10, isCompleted: false, type: 'drill' as const,
          content: 'Use a aba Meta-Game nesta pÃ¡gina para calcular seu bankroll ideal para cada formato. Insira seu bankroll atual e veja o stake mÃ¡ximo recomendado.' },
      ]},
    ],
  },
  {
    id: 'c006',
    title: 'Mental Game & Meta-Jogo',
    description: 'Tilt control, variÃ¢ncia, game selection e HUD stats para jogar melhor',
    category: 'mental' as const,
    difficulty: 'intermediate' as const,
    totalMinutes: 150,
    isPremium: false,
    thumbnail: 'ðŸ§ ',
    modules: [
      { id: 'm009', title: 'Tilt Control', lessons: [
        { id: 'l021', title: 'Os 5 tipos de tilt', duration: 18, isCompleted: false, type: 'article' as const,
          content: 'Tilt Ã© qualquer desvio da sua estratÃ©gia Ã³tima causado por estado emocional. Tipos mais comuns:\n\nðŸ˜¡ 1. REVENGE TILT (mais comum)\nQuerer recuperar perdas imediatamente vs o mesmo jogador.\nSinais: Calling station, calls Ã³bvios com mÃ£os ruins\nSoluÃ§Ã£o: Foldar qualquer mÃ£o boa por 5 minutos apÃ³s bad beat\n\nðŸ˜¤ 2. RUNNING BAD TILT\nSentir que "nada funciona" e comeÃ§ar a chamar/bluffar mais.\nSinais: Loosening range, calling downs com bottom pair\nSoluÃ§Ã£o: Revisar hands â€” geralmente vocÃª estÃ¡ jogando bem\n\nðŸ˜° 3. FEAR TILT\nJogar muito tight com medo de perder mais.\nSinais: Folding too much, checking quando deveria bet\nSoluÃ§Ã£o: Lembrar que o EV de longo prazo nÃ£o muda\n\nðŸ¤© 4. EUPHORIA TILT\nJogar descuidado quando estÃ¡ ganhando.\nSinais: Bluffing too much, loosening ranges\nSoluÃ§Ã£o: SessÃµes tÃªm fim â€” ganhos nÃ£o sÃ£o "dinheiro da casa"\n\nðŸ˜© 5. ENTITLEMENT TILT\nAchar que merecia ganhar aquela mÃ£o.\nSinais: "Como ele pode chamar com isso?!"\nSoluÃ§Ã£o: Resultados ruins de jogadas boas = long term positivo' },
        { id: 'l022', title: 'Gerenciando downswings', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'Downswings sÃ£o inevitÃ¡veis no poker. A questÃ£o nÃ£o Ã© SE vai acontecer, mas QUANDO e como vocÃª vai reagir.\n\nðŸ“Š Downswings esperados por stake:\nâ€¢ NL50 winrate 5bb/100: espere -15 a -25 buy-ins em algum ponto\nâ€¢ Isso Ã© MATEMATICAMENTE ESPERADO, nÃ£o azar\n\nðŸ›¡ï¸ Como gerenciar:\n\n1. STOP-LOSS DIÃRIO\nDefina antes de sentar: "Se perder X buy-ins hoje, paro."\nRecomendado: 3 buy-ins cash, 5 MTTs\n\n2. VOLUME MÃNIMO ANTES DE JULGAR\nNÃ£o avalie performance com menos de 10k mÃ£os.\nVariÃ¢ncia do poker Ã© muito alta para amostras pequenas.\n\n3. SEPARAR RESULTADOS DE DECISÃ•ES\nPerguntas certas apÃ³s uma mÃ£o:\nâŒ "Fiz a jogada certa?" baseado no resultado\nâœ… "Fiz a jogada certa?" baseado no processo\n\n4. BREAK OBRIGATÃ“RIO apÃ³s 3 sessÃµes ruins consecutivas\nNÃ£o "forÃ§a" o resultado. Descanse, estude, volte renovado.' },
      ]},
      { id: 'm010', title: 'HUD Stats & Game Selection', lessons: [
        { id: 'l023', title: 'Lendo HUD stats dos vilains', duration: 25, isCompleted: false, type: 'article' as const,
          content: 'HUD (Heads-Up Display) mostra estatÃ­sticas dos adversÃ¡rios. As mais importantes:\n\nðŸ“Š VPIP (Voluntarily Put In Pot)\nâ€¢ < 15%: NitÃ£o â€” joga apenas premium, fÃ¡cil de ler\nâ€¢ 15-25%: TAG (Tight-Aggressive) â€” bom regular\nâ€¢ 25-35%: LAG (Loose-Aggressive) â€” pode ser boa estratÃ©gia ou leak\nâ€¢ > 35%: Fish â€” entra em pots demais, perde dinheiro\nâ€¢ > 50%: Mega-fish â€” alvo principal\n\nðŸ¹ PFR (Pre-Flop Raise)\nâ€¢ PFR perto de VPIP: raise muito, call pouco â†’ agressivo\nâ€¢ PFR muito menor que VPIP: call muito â†’ passivo prÃ©-flop\nâ€¢ PFR < 5%: Limper crÃ´nico â†’ exploite com re-raises\n\nðŸ”„ 3-Bet %\nâ€¢ < 3%: 3bet range Ã© apenas premium â†’ fold AQ/JJ vs 3bet deles\nâ€¢ 3-8%: Balanceado\nâ€¢ > 10%: 3betting muita lixo â†’ 4bet/call mais amplo\n\nðŸšª Fold to 3-Bet\nâ€¢ > 70%: Folda demais â†’ 3bet light\nâ€¢ < 50%: Defende muito â†’ 3bet apenas valor\nâ€¢ 55-65%: Balanceado' },
        { id: 'l024', title: 'Game Selection â€” selecionando mesas lucrativas', duration: 22, isCompleted: false, type: 'article' as const,
          content: 'Game selection Ã© uma das habilidades mais negligenciadas. Sentar na mesa certa vale tanto quanto jogar melhor.\n\nðŸŽ¯ O que procurar em mesas online:\nâ€¢ VPIP mÃ©dio da mesa > 25-30% â†’ mesas com fish\nâ€¢ Players com VPIP > 40% â†’ alvo principal\nâ€¢ Stacks acima do buy-in mÃ¡ximo â†’ players que tÃªm chips para perder\nâ€¢ Observe flops vistos (%) â€” acima de 30% Ã© bom sinal\n\nðŸª Ao vivo â€” sinais de mesa lucrativa:\nâ€¢ Players discutindo mÃ£os "impossÃ­veis" que jogaram\nâ€¢ Pilhas de fichas desiguais (alguÃ©m perdeu muito)\nâ€¢ Jogador bebendo, distraÃ­do\nâ€¢ "Loose" atmosphere â€” muita gente vendo flop\n\nâŒ Mesas para evitar:\nâ€¢ Apenas regulares/grinders\nâ€¢ Muitos stacks curtos (scared money)\nâ€¢ Mesa onde todos esperam um ao outro (nit game)\n\nðŸ’¡ Regra prÃ¡tica: Se vocÃª Ã© o melhor player da mesa, sua winrate serÃ¡ baixa. Busque ser o 2Âº-3Âº melhor â€” os piores serÃ£o seus alvos.' },
      ]},
    ],
  },
]

// ------- FLASHCARDS -------
export const FLASHCARDS_DATA = [
  {
    id: 'f001',
    front: 'O que Ã© MDF (Minimum Defense Frequency)?',
    back: 'Ã‰ a frequÃªncia mÃ­nima que vocÃª precisa defender sua range para tornar um bet do villain nÃ£o lucrativo. Calculado como: Pot / (Pot + Bet). Ex: se villain bets 1/2 pot, vocÃª precisa defender 67% da sua range.',
    category: 'matemÃ¡tica',
    difficulty: 2 as const,
    correctCount: 3,
    incorrectCount: 1,
  },
  {
    id: 'f002',
    front: 'Qual Ã© a regra dos 4 e dos 2?',
    back: 'Uma estimativa rÃ¡pida de equity com outs: â€¢ No FLOP com 2 ruas: multiplique seus outs por 4 â€¢ No TURN com 1 rua: multiplique seus outs por 2 Ex: Flush draw no flop (9 outs) â‰ˆ 36% equity',
    category: 'matemÃ¡tica',
    difficulty: 1 as const,
    correctCount: 5,
    incorrectCount: 0,
  },
  {
    id: 'f003',
    front: 'O que Ã© SPR (Stack-to-Pot Ratio)?',
    back: 'SPR = Stack Efetivo / Pot. Guia o comprometimento de stack: â€¢ SPR 1-3: FÃ¡cil de commitar (top pair+) â€¢ SPR 4-8: MÃ©dio, exige mÃ£os fortes â€¢ SPR 9+: Precisa de mÃ£os muito fortes para commitir todo o stack',
    category: 'conceitos',
    difficulty: 2 as const,
    correctCount: 2,
    incorrectCount: 2,
  },
  {
    id: 'f004',
    front: 'O que diferencia GTO de Exploitative?',
    back: 'GTO (Game Theory Optimal): EstratÃ©gia equilibrada que nÃ£o pode ser exploitada, mesmo que o villain saiba sua estratÃ©gia. Exploitative: Ajusta sua estratÃ©gia para explorar desvios especÃ­ficos do villain, potencialmente maximizando EV mas ficando vulnerÃ¡vel a contra-exploraÃ§Ã£o.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 1,
    incorrectCount: 3,
  },
  {
    id: 'f005',
    front: 'Quantos combos tem AKs? E AKo?',
    back: 'AKs = 4 combos (um por naipe: Aâ™ Kâ™ , Aâ™¥Kâ™¥, Aâ™¦Kâ™¦, Aâ™£Kâ™£)\nAKo = 12 combos (4 ases Ã— 4 kings - 4 suited = 12)\nTotal AK = 16 combos\n\nDica: Qualquer suited tem 4 combos, qualquer offsuit tem 12, qualquer par tem 6.',
    category: 'matemÃ¡tica',
    difficulty: 1 as const,
    correctCount: 4,
    incorrectCount: 1,
  },
  // --- Flashcards Meta-Game e ConteÃºdo ---
  {
    id: 'f006',
    front: 'Quantos buy-ins vocÃª precisa para jogar cash game de forma responsÃ¡vel?',
    back: 'MÃ­nimo: 20 buy-ins para o stake que pretende jogar.\nConservador/recomendado: 30 buy-ins.\n\nExemplo: Para NL50 (buy-in R$250), vocÃª precisa de R$5.000â€“7.500 de bankroll dedicado ao poker.',
    category: 'bankroll',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f007',
    front: 'O que significa VPIP 45% em um adversÃ¡rio?',
    back: 'VPIP 45% = entra voluntariamente em 45% dos pots. Ã‰ um fish/loose player.\nEle paga muito com mÃ£os fracas, excelente alvo.\n\nNormal para bom regular: VPIP 20-28% em 6-max.\nVPIP > 40% = perde dinheiro consistentemente.',
    category: 'hud',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f008',
    front: 'O que Ã© Fold to 3-Bet e como exploitar quando Ã© muito alto?',
    back: 'Fold to 3-Bet = % que o player folda quando 3betado.\n\n> 70%: Folda demais â†’ 3bete light com mÃ£os como K9s, JTs, A3s. EV positivo mesmo sem equity alta.\n< 50%: Defende demais â†’ 3bete apenas valor (QQ+/AK+).\n55-65%: Balanceado, use seu range normal.',
    category: 'hud',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f009',
    front: 'Quais sÃ£o os 3 principais tipos de tilt no poker?',
    back: '1. Revenge Tilt: querer recuperar de um player especÃ­fico\n2. Running Bad Tilt: sentir que tudo estÃ¡ contra vocÃª, loosear\n3. Entitlement Tilt: achar que "merecia" ganhar (bad beat rage)\n\nTodos levam ao mesmo resultado: desvio da estratÃ©gia Ã³tima.',
    category: 'mental',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f010',
    front: 'O que Ã© ICM e por que chips em tornamento nÃ£o tÃªm valor linear?',
    back: 'ICM (Independent Chip Model) converte chips em valor monetÃ¡rio real.\n\nChips nÃ£o valem linearmente porque:\nâ€¢ Dobrar seu stack nÃ£o dobra seus ganhos esperados\nâ€¢ Perder tudo = 0 prÃªmio, independente de quantos chips tinha\nâ€¢ Short stacks valem mais em $ proporcionalmente\n\nEx: 60% dos chips â‰  60% do prÃªmio total.',
    category: 'torneio',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f011',
    front: 'Qual Ã© a regra de stop-loss diÃ¡rio recomendada para cash game?',
    back: 'Stop-loss diÃ¡rio: pare de jogar ao perder 3 buy-ins na mesma sessÃ£o.\n\nPor quÃª? ApÃ³s 3 buy-ins perdidos:\nâ€¢ Estado mental costuma estar comprometido\nâ€¢ Tilt (consciente ou nÃ£o) aumenta erros\nâ€¢ Recuperar em tilt piora as perdas\n\nDecida o stop-loss ANTES de sentar, nunca depois.',
    category: 'bankroll',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f012',
    front: 'O que Ã© PFR e o que indica quando Ã© muito menor que o VPIP?',
    back: 'PFR (Pre-Flop Raise) = % de vezes que raise prÃ©-flop.\n\nPFR << VPIP (ex: VPIP 30, PFR 8) = player passivo/limper.\nEntra em pots mas prefere limp/call a raise.\n\nComo exploitar: 3bete/raise mais vs esse player, ele vai call/fold.\nNÃ£o respeite raises deles â€” tÃªm mÃ£o muito forte quando raise.',
    category: 'hud',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f013',
    front: 'Quantos buy-ins de MTT vocÃª precisa para ser sustentÃ¡vel?',
    back: 'MTT: mÃ­nimo 50 buy-ins, recomendado 100+.\n\nPor quÃª tÃ£o mais que cash?\nâ€¢ MTT tem variÃ¢ncia muito maior (pode ganhar 100x o buy-in ou zero)\nâ€¢ Downswings de 40-60 buy-ins sem lucro sÃ£o normais\nâ€¢ Com menos de 50 buy-ins, risco real de quebrar mesmo sendo lucrativo\n\nSpins (alta variÃ¢ncia): 100+ buy-ins essencial.',
    category: 'bankroll',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f014',
    front: 'O que Ã© nut advantage e como ele difere de range advantage?',
    back: 'Range Advantage: sua range total tem mais equity que a do villain naquele board.\n\nNut Advantage: vocÃª tem proporcionalmente mais das mÃ£os MAIS FORTES (sets, dois pares, nuts).\n\nExemplo: No flop J-T-9, o BB caller pode ter mais straights e dois pares que o UTG opener â†’ BB tem nut advantage mesmo sem range advantage.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f015',
    front: 'O que Ã© um downswing normal em NL cash game e como reagir?',
    back: 'Para um player vencedor com winrate 5bb/100:\nâ€¢ Downswing de 15-25 buy-ins Ã© estatisticamente normal\nâ€¢ NÃ£o indica que vocÃª estÃ¡ jogando mal\n\nComo reagir:\n1. Revise mÃ£os com solver (confirme que jogou certo)\n2. NÃ£o aumente volume "para recuperar"\n3. Considere descer de stake temporariamente\n4. Tire um dia de folga se estado mental estiver ruim',
    category: 'mental',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f016',
    front: 'Como identificar uma mesa lucrativa online?',
    back: 'Procure nas lobby stats:\nâ€¢ VPIP mÃ©dio da mesa > 28-30%\nâ€¢ Flops vistos % > 25-30%\nâ€¢ Pelo menos 1-2 players com VPIP > 40%\nâ€¢ Potes mÃ©dios maiores que normal\n\nFerramenta: Obs notes no HUD, poker tracker (PT4/HM3)\nDica: Sente no assento Ã  esquerda do fish â€” vocÃª age depois dele em mais situaÃ§Ãµes.',
    category: 'game-selection',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f017',
    front: 'O que Ã© o conceito de "Pot Geometry" e por que importa no pÃ³s-flop?',
    back: 'Pot Geometry = planejar o tamanho de bets em mÃºltiplas ruas para comprometer o stack do adversÃ¡rio de forma eficiente.\n\nExemplo com SPR 8 (stack = 8x pot):\nâ€¢ Flop bet 50% â†’ Pot dobra\nâ€¢ Turn bet 67% â†’ Pot dobra de novo\nâ€¢ River bet 100% â†’ Stack all-in natural\n\nPor que importa: Escolher sizing incoerente cria SPR estranho no river, forÃ§ando overbets ou underbets nÃ£o-ideais.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f018',
    front: 'Qual Ã© a diferenÃ§a entre bluff com air e semi-bluff?',
    back: 'Air bluff: sua mÃ£o nÃ£o tem equity real. Se chamado, perde na maioria das vezes. Requer fold equity alta.\n\nSemi-bluff: sua mÃ£o tem equity de draw (ex: flush draw 36%, OESD 32%). Mesmo se chamado, pode melhorar.\n\nPor que semi-bluffs sÃ£o melhores: Funcionam de 2 maneiras â€” villain folda (ganhou) OU vocÃª melhora e ganha showdown. Mais EV que air bluff no geral.',
    category: 'conceitos',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f019',
    front: 'O que Ã© "shot-taking" em BRM e quando fazer?',
    back: 'Shot-taking = jogar temporariamente um stake acima do normal para "experimentar".\n\nRegras para shot responsÃ¡vel:\nâ€¢ Limite: mÃ¡ximo 2% do bankroll total\nâ€¢ MÃ¡ximo 1-2 sessÃµes de shot por semana\nâ€¢ Stop: se perder o shot, volte imediatamente ao stake normal\nâ€¢ CritÃ©rio: Tenha 20+ buy-ins para o stake atual E 10+ para o stake superior\n\nObjectivo: Testar o novo stake sem comprometer bankroll.',
    category: 'bankroll',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f020',
    front: 'Na bolha de um MTT, quando Ã© correto foldar JJ?',
    back: 'Fold JJ na bolha Ã© correto quando:\n1. VocÃª estÃ¡ garantido de entrar no dinheiro se foldar (stack grande vs outros short stacks)\n2. Ã‰ uma situaÃ§Ã£o multiway (short stack all-in + big stack cold call)\n3. O custo de perder supera o benefÃ­cio de ganhar chips em termos de $EV\n\nFold com JJ NÃƒO Ã© correto quando:\nâ€¢ VocÃª Ã© o short stack (precisa de chips)\nâ€¢ Ã‰ heads-up (boa equity vs 1 range)',
    category: 'torneio',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f021',
    front: 'Como calcular o mÃ¡ximo buy-in com R$3.000 de bankroll para cash game?',
    back: 'Regra: mÃ¡ximo 5% do bankroll por buy-in (20 buy-ins).\n\nR$3.000 Ã· 20 = R$150 por buy-in\n\nTabela de stakes online (BB = centavos):\nâ€¢ R$150 buy-in â†’ NL25 (25Â¢/50Â¢ blinds, buy-in R$25... espera, cada site varia)\nâ€¢ Mais comum: max buy-in full = 100bb\nâ€¢ Verifique a tabela do stake especÃ­fico do seu site\n\nPor seguranÃ§a, use 25 buy-ins: R$3.000 Ã· 25 = R$120/buy-in.',
    category: 'bankroll',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f022',
    front: 'O que Ã© C-Bet (Continuation Bet) e quando fazer?',
    back: 'C-Bet = aposta no flop apÃ³s ter sido o aggressor prÃ©-flop.\n\nQuando fazer c-bet:\nâœ… Board favorece sua range (vocÃª tem mais Aces em board A-x-x)\nâœ… Villain tem range fraca (defesa de BB ou cold-caller passivo)\nâœ… VocÃª tem equity (pair, draw, overcards)\n\nQuando evitar c-bet:\nâŒ Board favorece o caller (J-T-9 favore quem coldcalou)\nâŒ Villain defende muito (high WTSD)\nâŒ VocÃª estÃ¡ em spot multiway (3+ players)',
    category: 'conceitos',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f023',
    front: 'O que significa WTSD% e como ajustar sua estratÃ©gia contra ele?',
    back: 'WTSD = Went to Showdown %. % de vezes que o player vai ao showdown apÃ³s ver o flop.\n\n> 30%: Chama demais no pÃ³s-flop â€” bluff pouco, value-bete muito\n< 22%: Folda demais no pÃ³s-flop â€” bluff mais, especialmente no river\n23-28%: RazoÃ¡vel\n\nChave: Player com WTSD alto + VPIP alto = pesca maximizar value. Nunca bluff vs ele.',
    category: 'hud',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f024',
    front: 'O que Ã© Equity Realization e por que mÃ£os OOP realizam menos equity?',
    back: 'Equity Realization = quanto da sua equity teÃ³rica vocÃª consegue converter em winnings reais.\n\nOOP (Out Of Position) realiza MENOS porque:\nâ€¢ Villain pode check-behind e ver carta grÃ¡tis\nâ€¢ VocÃª nÃ£o sabe o que villain vai fazer antes de agir\nâ€¢ Villain pode bet-fold quando vocÃª estÃ¡ Ã  frente\n\nExemplo: 54s tem ~38% equity vs range do villain, mas OOP pode realizar apenas ~30-32% â€” diferenÃ§a que faz a mÃ£o nÃ£o-lucrativa.\n\nPor isso: MÃ£os especulativas (conectores, pares pequenos) preferem posiÃ§Ã£o.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f025',
    front: 'Qual Ã© a diferenÃ§a entre um regular TAG e um fish?',
    back: 'TAG (Tight-Aggressive): VPIP 18-25%, PFR 15-22%, joga sÃ³lido\nâ€¢ DifÃ­cil de exploitar, joga prÃ³ximo do GTO\nâ€¢ Prefira evitar pots grandes com ele sem edge claro\n\nFish (Loose-Passive): VPIP 40%+, PFR < 15%, chama demais\nâ€¢ Value-bete mais grosso, nÃ£o bluff\nâ€¢ Procure sentar Ã  esquerda dele para agir depois dele\nâ€¢ Extraia valor com top-pairs, nÃ£o precise de monsters',
    category: 'game-selection',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
]

// ------- CONQUISTAS -------
// ============================================================
// ACHIEVEMENTS_DATA â€” 61 conquistas
// Ao adicionar novas conquistas: definir aqui + adicionar case em syncAchievements (store/index.ts)
// Categorias: start | streak | precision | volume | mastery | time | sessions | competition | content | level | xp | special
// ============================================================
export const ACHIEVEMENTS_DATA = [
  // ---- PRIMEIROS PASSOS ----
  { id: 'a001', category: 'start',     title: 'Primeiro Passo',       description: 'Complete sua primeira sessÃ£o de treino',         icon: 'ðŸŽ¯', progress: 0, maxProgress: 1 },

  // ---- STREAK / CONSISTÃŠNCIA ----
  { id: 'a002', category: 'streak',    title: 'Em Chamas',            description: 'Mantenha 7 dias consecutivos de estudo',         icon: 'ðŸ”¥', progress: 0, maxProgress: 7 },
  { id: 'a007', category: 'streak',    title: 'Aquecendo',            description: 'Mantenha 3 dias consecutivos de estudo',         icon: 'ðŸŒ¡ï¸', progress: 0, maxProgress: 3 },
  { id: 'a008', category: 'streak',    title: 'Habitual',             description: 'Mantenha 14 dias consecutivos de estudo',        icon: 'ðŸ’ª', progress: 0, maxProgress: 14 },
  { id: 'a009', category: 'streak',    title: 'Dedicado',             description: 'Mantenha 30 dias consecutivos de estudo',        icon: 'ðŸ†', progress: 0, maxProgress: 30 },
  { id: 'a010', category: 'streak',    title: 'ImparÃ¡vel',            description: 'Mantenha 60 dias consecutivos de estudo',        icon: 'âš¡', progress: 0, maxProgress: 60 },
  { id: 'a011', category: 'streak',    title: 'Lenda do Estudo',      description: 'Mantenha 100 dias consecutivos de estudo',       icon: 'ðŸ‘‘', progress: 0, maxProgress: 100 },

  // ---- PRECISÃƒO â€” ACERTOS CONSECUTIVOS ----
  { id: 'a003', category: 'precision', title: 'PrecisÃ£o CirÃºrgica',   description: 'Acerte 10 questÃµes consecutivas',                icon: 'ðŸ¹', progress: 0, maxProgress: 10 },
  { id: 'a012', category: 'precision', title: 'Sniper',               description: 'Acerte 20 questÃµes consecutivas',                icon: 'ðŸŽ¯', progress: 0, maxProgress: 20 },
  { id: 'a013', category: 'precision', title: 'ImplacÃ¡vel',           description: 'Acerte 50 questÃµes consecutivas',                icon: 'ðŸ’Ž', progress: 0, maxProgress: 50 },
  { id: 'a014', category: 'precision', title: 'MÃ¡quina GTO',          description: 'Acerte 100 questÃµes consecutivas',               icon: 'ðŸ¤–', progress: 0, maxProgress: 100 },

  // ---- PRECISÃƒO â€” ACURÃCIA GERAL ----
  { id: 'a015', category: 'precision', title: 'Estudante Aplicado',   description: 'Atinja 60% de precisÃ£o geral',                   icon: 'ðŸ“Š', progress: 0, maxProgress: 60 },
  { id: 'a016', category: 'precision', title: 'Jogador SÃ³lido',       description: 'Atinja 70% de precisÃ£o geral',                   icon: 'ðŸ“ˆ', progress: 0, maxProgress: 70 },
  { id: 'a017', category: 'precision', title: 'Sharp Player',         description: 'Atinja 80% de precisÃ£o geral',                   icon: 'ðŸŽ–ï¸', progress: 0, maxProgress: 80 },
  { id: 'a018', category: 'precision', title: 'NitÃ£o',                description: 'Atinja 85% de precisÃ£o geral',                   icon: 'ðŸ”·', progress: 0, maxProgress: 85 },
  { id: 'a019', category: 'precision', title: 'GTO Bot',              description: 'Atinja 90% ou mais de precisÃ£o geral',           icon: 'ðŸ¦¾', progress: 0, maxProgress: 90 },

  // ---- VOLUME â€” QUESTÃ•ES TOTAIS ----
  { id: 'a020', category: 'volume',    title: 'Primeiras Respostas',  description: 'Responda 50 questÃµes no total',                  icon: 'ðŸ“', progress: 0, maxProgress: 50 },
  { id: 'a021', category: 'volume',    title: 'Treinando Firme',      description: 'Responda 100 questÃµes no total',                 icon: 'ðŸ“–', progress: 0, maxProgress: 100 },
  { id: 'a022', category: 'volume',    title: '250 Respondidas',      description: 'Responda 250 questÃµes no total',                 icon: 'ðŸ“š', progress: 0, maxProgress: 250 },
  { id: 'a023', category: 'volume',    title: 'Maratonista',          description: 'Responda 500 questÃµes no total',                 icon: 'ðŸƒ', progress: 0, maxProgress: 500 },
  { id: 'a024', category: 'volume',    title: 'Mil QuestÃµes',         description: 'Responda 1.000 questÃµes no total',               icon: 'ðŸ’¯', progress: 0, maxProgress: 1000 },
  { id: 'a025', category: 'volume',    title: 'Mestre do Volume',     description: 'Responda 2.500 questÃµes no total',               icon: 'ðŸ‹ï¸', progress: 0, maxProgress: 2500 },
  { id: 'a026', category: 'volume',    title: 'Rei das Reps',         description: 'Responda 5.000 questÃµes no total',               icon: 'â™¾ï¸', progress: 0, maxProgress: 5000 },

  // ---- DOMÃNIO â€” POR CENÃRIO ----
  { id: 'a004', category: 'mastery',   title: 'Ãs do PrÃ©-Flop',       description: 'Complete 100 drills de open raise',              icon: 'â™ ',  progress: 0, maxProgress: 100 },
  { id: 'a027', category: 'mastery',   title: 'CaÃ§ador de 3-Bets',    description: 'Complete 100 questÃµes de 3-bet',                 icon: 'â™£', progress: 0, maxProgress: 100 },
  { id: 'a028', category: 'mastery',   title: 'Push or Fold',         description: 'Complete 75 questÃµes de push/fold',              icon: 'ðŸ’°', progress: 0, maxProgress: 75 },
  { id: 'a029', category: 'mastery',   title: 'Defensor do BB',       description: 'Complete 75 questÃµes de defesa do BB',           icon: 'ðŸ›¡ï¸', progress: 0, maxProgress: 75 },
  { id: 'a030', category: 'mastery',   title: 'SB vs BB Expert',      description: 'Complete 50 questÃµes de SB vs BB',               icon: 'âš”ï¸', progress: 0, maxProgress: 50 },
  { id: 'a031', category: 'mastery',   title: 'Especialista Squeeze',  description: 'Complete 30 questÃµes de squeeze',               icon: 'ðŸ—œï¸', progress: 0, maxProgress: 30 },
  { id: 'a032', category: 'mastery',   title: '4-Bet Specialist',     description: 'Complete 30 questÃµes de 4-bet',                  icon: 'ðŸ’¥', progress: 0, maxProgress: 30 },
  { id: 'a033', category: 'mastery',   title: 'Call RFI Master',      description: 'Complete 50 questÃµes de call vs raise',          icon: 'ðŸ“ž', progress: 0, maxProgress: 50 },
  { id: 'a006', category: 'mastery',   title: 'Mestre PÃ³s-Flop',      description: 'Complete 50 drills de pÃ³s-flop',                 icon: 'ðŸŽ²', progress: 0, maxProgress: 50 },

  // ---- TEMPO DE ESTUDO ----
  { id: 'a005', category: 'time',      title: 'Estudioso',            description: 'Estude por 10 horas totais',                    icon: 'ðŸ“š', progress: 0, maxProgress: 10 },
  { id: 'a034', category: 'time',      title: 'Aplicado',             description: 'Estude por 25 horas totais',                    icon: 'ðŸ“–', progress: 0, maxProgress: 25 },
  { id: 'a035', category: 'time',      title: 'Dedicado ao Estudo',   description: 'Estude por 50 horas totais',                    icon: 'ðŸŽ“', progress: 0, maxProgress: 50 },
  { id: 'a036', category: 'time',      title: 'Scholar do Poker',     description: 'Estude por 100 horas totais',                   icon: 'ðŸ›ï¸', progress: 0, maxProgress: 100 },

  // ---- SESSÃ•ES ----
  { id: 'a037', category: 'sessions',  title: 'Cinco em Campo',       description: 'Complete 5 sessÃµes de treino',                   icon: 'ðŸŽ®', progress: 0, maxProgress: 5 },
  { id: 'a038', category: 'sessions',  title: 'Veterano de SessÃ£o',   description: 'Complete 25 sessÃµes de treino',                  icon: 'ðŸŽ–ï¸', progress: 0, maxProgress: 25 },
  { id: 'a039', category: 'sessions',  title: 'CentenÃ¡rio',           description: 'Complete 100 sessÃµes de treino',                 icon: 'ðŸ’¯', progress: 0, maxProgress: 100 },
  { id: 'a040', category: 'sessions',  title: 'Profissional das SessÃµes', description: 'Complete 250 sessÃµes de treino',             icon: 'ðŸƒ', progress: 0, maxProgress: 250 },
  { id: 'a041', category: 'sessions',  title: 'GrÃ£o-Mestre das SessÃµes', description: 'Complete 500 sessÃµes de treino',             icon: 'ðŸ†', progress: 0, maxProgress: 500 },

  // ---- COMPETIÃ‡ÃƒO ----
  { id: 'a042', category: 'competition', title: 'Primeira Batalha',   description: 'Jogue 1 partida no modo competiÃ§Ã£o',             icon: 'ðŸ…', progress: 0, maxProgress: 1 },
  { id: 'a043', category: 'competition', title: 'Bronze Competidor',  description: 'Alcance score 50+ no modo competiÃ§Ã£o',           icon: 'ðŸ¥‰', progress: 0, maxProgress: 1 },
  { id: 'a044', category: 'competition', title: 'Prata Competidor',   description: 'Alcance score 150+ no modo competiÃ§Ã£o',          icon: 'ðŸ¥ˆ', progress: 0, maxProgress: 1 },
  { id: 'a045', category: 'competition', title: 'Ouro Competidor',    description: 'Alcance score 300+ no modo competiÃ§Ã£o',          icon: 'ðŸ¥‡', progress: 0, maxProgress: 1 },
  { id: 'a046', category: 'competition', title: 'Platina Competidor', description: 'Alcance score 500+ no modo competiÃ§Ã£o',          icon: 'ðŸ’Ž', progress: 0, maxProgress: 1 },
  { id: 'a047', category: 'competition', title: 'CampeÃ£o Supremo',    description: 'Alcance score 700+ no modo competiÃ§Ã£o',          icon: 'ðŸ†', progress: 0, maxProgress: 1 },

  // ---- CURSOS E FLASHCARDS ----
  { id: 'a048', category: 'content',   title: 'Leitor de Poker',      description: 'Complete 1 aula de um curso',                    icon: 'ðŸ“–', progress: 0, maxProgress: 1 },
  { id: 'a049', category: 'content',   title: 'Flashcard Warrior',    description: 'Revise 50 flashcards',                           icon: 'ðŸƒ', progress: 0, maxProgress: 50 },
  { id: 'a050', category: 'content',   title: 'Flashcard Master',     description: 'Revise 200 flashcards',                          icon: 'ðŸŽ´', progress: 0, maxProgress: 200 },

  // ---- NÃVEIS ATINGIDOS ----
  { id: 'a051', category: 'level',     title: 'Sobe de NÃ­vel',        description: 'Alcance o nÃ­vel 5',                             icon: 'ðŸ“ˆ', progress: 0, maxProgress: 5 },
  { id: 'a052', category: 'level',     title: 'Meio Caminho',         description: 'Alcance o nÃ­vel 10',                            icon: 'â­', progress: 0, maxProgress: 10 },
  { id: 'a053', category: 'level',     title: 'Veterano de NÃ­vel',    description: 'Alcance o nÃ­vel 20',                            icon: 'ðŸŒŸ', progress: 0, maxProgress: 20 },
  { id: 'a054', category: 'level',     title: 'Elite',                description: 'Alcance o nÃ­vel 35',                            icon: 'ðŸ’Ž', progress: 0, maxProgress: 35 },
  { id: 'a055', category: 'level',     title: 'LendÃ¡rio',             description: 'Alcance o nÃ­vel 50',                            icon: 'ðŸ‘‘', progress: 0, maxProgress: 50 },

  // ---- XP ACUMULADO ----
  { id: 'a056', category: 'xp',        title: 'Primeiros Mil XP',     description: 'Acumule 1.000 XP no total',                     icon: 'âš¡', progress: 0, maxProgress: 1000 },
  { id: 'a057', category: 'xp',        title: 'Acumulador',           description: 'Acumule 5.000 XP no total',                     icon: 'ðŸ”‹', progress: 0, maxProgress: 5000 },
  { id: 'a058', category: 'xp',        title: 'Mestre do XP',         description: 'Acumule 25.000 XP no total',                    icon: 'ðŸŒŸ', progress: 0, maxProgress: 25000 },
  { id: 'a059', category: 'xp',        title: 'Lenda de XP',          description: 'Acumule 100.000 XP no total',                   icon: 'ðŸŒ™', progress: 0, maxProgress: 100000 },

  // ---- ESPECIAIS / RAROS ----
  { id: 'a060', category: 'special',   title: 'NitÃ£o Supremo',        description: '95%+ de precisÃ£o com 200+ questÃµes respondidas', icon: 'ðŸŽ–ï¸', progress: 0, maxProgress: 1 },
  { id: 'a061', category: 'special',   title: 'Maratonista do Dia',   description: 'Responda 100 questÃµes em uma Ãºnica sessÃ£o',       icon: 'ðŸŒªï¸', progress: 0, maxProgress: 100 },
]
