// ============================================================
// POKERMIND PRO — DADOS MOCKADOS DE RANGES PRÉ-FLOP
// Ranges GTO simplificados para treino educacional
// ============================================================

import { PreflopDrillQuestion, Position, TableFormat } from '@/types'

// ------- FORMATO DE MESA: POSIÇÕES DISPONÍVEIS -------
// A lógica de range é baseada em "quantos jogadores ficam atrás de você"
// HU BTN = 1 atrás; 9max UTG = 8 atrás
export const POSITIONS_BY_FORMAT: Record<TableFormat, Position[]> = {
  'HU':   ['BTN', 'BB'],
  '6max': ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
  '9max': ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
}

// ------- RANGES DE OPEN RAISE POR POSIÇÃO -------
// Representados como arrays de mãos no formato padrão

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
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66',
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
    'KQo', 'KJo',
    'QJo',
  ],
  'BB':     [], // BB defende, não open-raise normalmente
  'UTG+2':  [], // definido em OPEN_RAISE_RANGES_BY_FORMAT
  'LJ':     [], // definido em OPEN_RAISE_RANGES_BY_FORMAT
}

// ------- RANGE DE DEFESA DO BB (vs open de cada posição) -------
// Representa mãos que o BB deve defender (call ou 3bet) vs open raise
export const BB_DEFENSE_RANGES: Record<Position, string[]> = {
  'BTN': [ // BB vs BTN open (~45% das mãos)
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
  'CO': [ // BB vs CO open (~40% das mãos)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s',
    'QJs', 'QTs', 'Q9s', 'Q8s',
    'JTs', 'J9s', 'J8s',
    'T9s', 'T8s', '98s', '87s', '76s', '65s',
    'KQo', 'KJo', 'KTo',
    'QJo', 'QTo',
    'JTo', 'T9o', '98o',
  ],
  'HJ': [ // BB vs HJ open (~35% das mãos)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s',
    'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
    'KQs', 'KJs', 'KTs', 'K9s', 'K8s',
    'QJs', 'QTs', 'Q9s',
    'JTs', 'J9s', 'T9s', '98s', '87s', '76s',
    'KQo', 'KJo', 'QJo', 'JTo',
  ],
  'UTG': [ // BB vs UTG open (~25% das mãos — range UTG é tight)
    'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44',
    'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s', 'A4s',
    'AKo', 'AQo', 'AJo',
    'KQs', 'KJs', 'KTs', 'K9s',
    'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s',
    'KQo', 'QJo',
  ],
  'SB': [ // BB vs SB open (~55% das mãos — SB abre muito wide)
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
  'BB':     [],  // BB não defende vs si mesmo
  'UTG+1':  [],  // mesmo range que UTG (villain tight)
  'UTG+2':  [],  // mesmo range que UTG
  'LJ':     [],  // mesmo range que UTG (range mais amplo vs LJ = igual vs UTG 6max)
}

// ------- RANGES DE 3BET -------
export const THREE_BET_RANGES: Record<Position, string[]> = {
  'BTN':    ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo', 'A5s', 'A4s', 'K5s'],
  'CO':     ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AJs', 'AKo', 'A5s'],
  'SB':     ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AJs', 'AKo', 'AQo', 'A5s', 'A4s', 'A3s', 'KQs'],
  'BB':     ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AQs', 'AJs', 'AKo', 'AQo', 'A9s', 'A4s', 'A3s', 'KJs'],
  'UTG':    ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo'],
  'UTG+1':  ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'],
  'UTG+2':  ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo'], // similar a UTG+1
  'LJ':     ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo', 'A5s'], // igual ao HJ
  'HJ':     ['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AQs', 'AKo', 'A5s'],
}

// ------- RANGES DE 4-BET (hero abriu, villain 3-betou, hero decide) -------
// Estratégia polarizada: valor (AA/KK/QQ/AK) + bluffs com bloqueadores (A5s-A2s)
// "position" = posição do hero (quem abriu e recebeu o 3-bet)
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

// ------- RANGES DE SQUEEZE (3-bet após raise + 1+ caller) -------
// Squeeze é mais tight que 3-bet HU: precisa de equity vs 2+ jogadores + fold equity menor
// "position" = posição do squeezer
export const SQUEEZE_RANGES: Record<Position, string[]> = {
  'UTG+2': ['AA', 'KK', 'AKs', 'AKo'],
  'LJ':    ['AA', 'KK', 'QQ', 'AKs', 'AKo', 'A5s'],
  'BTN': [
    // BTN squeeze vs open+caller: range sólido, IP
    'AA', 'KK', 'QQ', 'JJ', 'TT',
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
    // BB squeeze: melhor posição para squeeze, já investiu 1BB
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
    // UTG squeeze: raramente correto, só premiums
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
            'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'KQo', 'KJo'],
    'CO': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s',
           'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
           'KQs', 'KJs', 'KTs', 'KQo'],
    'SB': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
           'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
           'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o',
           'KQs', 'KJs', 'KTs', 'KQo', 'KJo'],
    'HJ': ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
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
// Cada formato define apenas as posições que diferem do 6-max.
// HJ, CO, BTN, SB, BB em qualquer formato full-ring = mesmo range que 6-max
// (têm o mesmo número de jogadores atrás).
// Posições early (UTG, UTG+1, UTG+2, LJ) ficam mais tight quanto maior a mesa.
export const OPEN_RAISE_RANGES_BY_FORMAT: Record<TableFormat, Partial<Record<Position, string[]>>> = {

  // ---- HU MTT (~65% das mãos) ----
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

  // ---- 6-max MTT (já definido em OPEN_RAISE_RANGES) ----
  '6max': {}, // usa OPEN_RAISE_RANGES como fallback

  // ---- 9-max MTT ----
  // UTG: 8 atrás → ~10%; UTG+1: 7 atrás → ~12%; UTG+2: 6 atrás → ~14%; LJ: 5 atrás = 6max UTG
  '9max': {
    'UTG': [ // ~10% — o spot mais tight do poker
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
    'LJ':  [], // usa 6max UTG (5 jogadores atrás)
    'HJ':  [],
    'CO':  [],
    'BTN': [],
    'SB':  [],
    'BB':  [],
  },
}

// Helper: busca o range correto considerando formato + fallback para 6max
// Posições early (UTG+1, UTG+2, LJ) em formatos onde não há range específico
// fazem fallback para 6max UTG (mesma quantidade de jogadores atrás ou equivalente).
export function getOpenRaiseRange(format: TableFormat, position: Position): string[] {
  const formatRanges = OPEN_RAISE_RANGES_BY_FORMAT[format]
  const formatSpecific = formatRanges?.[position]
  if (formatSpecific && formatSpecific.length > 0) return formatSpecific
  // fallback inteligente: posições early sem range próprio usam UTG do 6max
  const earlyFallback: Position[] = ['UTG+1', 'UTG+2', 'LJ']
  if (earlyFallback.includes(position) && (!OPEN_RAISE_RANGES[position] || OPEN_RAISE_RANGES[position].length === 0)) {
    return OPEN_RAISE_RANGES['UTG'] || []
  }
  return OPEN_RAISE_RANGES[position] || []
}

// ------- SB vs BB: RANGES ESPECÍFICOS -------
// Dinâmica única: SB é IP no preflop mas OOP no postflop.
// SB pode limp (completar a BB por 0.5BB extra) ou raise.

// Hands que SB deve RAISE (2.5x) vs BB (~45% das mãos)
export const SB_VS_BB_RAISE_RANGES: string[] = [
  // Todos os pares
  'AA','KK','QQ','JJ','TT','99','88','77','66','55','44','33','22',
  // Ax suited — todos
  'AKs','AQs','AJs','ATs','A9s','A8s','A7s','A6s','A5s','A4s','A3s','A2s',
  // Ax offsuit — a maioria
  'AKo','AQo','AJo','ATo','A9o','A8o','A7o','A6o',
  // Kx suited — todos
  'KQs','KJs','KTs','K9s','K8s','K7s','K6s','K5s','K4s','K3s','K2s',
  // Kx offsuit — forte+
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
  // Suited connectors médios
  '98s','97s','87s','86s','76s','65s',
]

// Hands que SB deve LIMP (completar, não raise) vs BB (~18% das mãos)
// Objetivo: ver flop barato, evitar build pote OOP com mãos marginais
export const SB_VS_BB_LIMP_RANGES: string[] = [
  // Ax offsuit fraco (prefere ver flop barato)
  'A5o','A4o','A3o','A2o',
  // Kx offsuit fraco
  'K7o','K6o','K5o','K4o','K3o','K2o',
  // Qx offsuit médio
  'Q8o','Q7o','Q6o',
  // J8o, J7o
  'J8o','J7o',
  // T8o, T7o
  'T8o','T7o',
  // Suited connectors especulativos baixos (mix de limp e raise)
  '98o','97o','87o','86o','76o','75o','65o','64o','54o',
]

// BB vs SB open: defesa ampla (SB abre wide ~45%)
// BB pode call ou 3-bet — não deve fold quase nunca
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

// BB vs SB: 3-bet range (mais agressivo que vs outras posições pois SB é wide)
export const BB_VS_SB_3BET_RANGES: string[] = [
  'AA','KK','QQ','JJ','TT','99',
  'AKs','AQs','AJs','ATs','AKo','AQo',
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
    explanation: 'AKs é uma mão premium que sempre deve ser jogada como open raise em qualquer posição. No UTG, o range é tight, mas AKs está claramente dentro dele. A mão tem excelente equidade e pode fazer grandes potes quando vai bem.',
    evComparison: { fold: 0, call: -0.5, raise: 2.8 }
  },
  {
    id: 'q002',
    hand: 'JTs',
    position: 'UTG',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.85,
    explanation: 'JTs no UTG é uma mão marginal. Em posição early, o range deve ser tight. JTs joga bem em posição mas perde muito valor OOP. A maioria dos solvers dobra JTs no UTG em 6-max, apesar de ser uma borderline spot.',
    evComparison: { fold: 0, call: 0, raise: 0.1 }
  },
  {
    id: 'q003',
    hand: 'KK',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'KK é uma das mãos mais fortes no poker. Quando há um open raise, sempre 3bet com KK para construir o pote com a melhor mão e maximizar EV.',
    evComparison: { fold: -1, call: 8.5, raise: 12.3 }
  },
  {
    id: 'q004',
    hand: 'A5s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'A5s contra CO open tem um misto de call e 3bet na estratégia GTO. O 3bet bluff com A5s é bom pois bloqueia combos de AA e tem boa equidade quando chamado. Porém, em posição (BTN vs CO), o call também é excelente.',
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
    explanation: '72o é a pior mão no poker. Nunca deve ser jogada como open raise em nenhuma posição em cash game padrão. Fold sempre.',
    evComparison: { fold: 0, call: 0, raise: -2.1 }
  },
  {
    id: 'q006',
    hand: 'QQ',
    position: 'SB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'QQ sempre faz 3bet em valor. Mesmo OOP no SB, QQ é forte o suficiente para construir pote. Chamar seria subestimar a mão e dar ao villain boas implied odds.',
    evComparison: { fold: -1, call: 7.2, raise: 11.8 }
  },
  {
    id: 'q007',
    hand: '87s',
    position: 'BTN',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: 'Com 10 BBs no BTN, 87s é um push lucrativo. A mão tem boa equidade quando chamada (suited conectors têm ~40% vs range de call razoável) e suficiente fold equity para ser profitable.',
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
    explanation: '22 no UTG é uma mão muito fraca para abrir. Em 100bb deep no UTG, a maioria dos solvers dobra 22 pois a mão tem dificuldade de navegar múltiplos jogadores OOP com um par pequeníssimo.',
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
    explanation: 'AQo no HJ é uma mão forte que sempre deve ser aberta. Tem boa blocagem em combos de AA/KK/AK e joga muito bem como agressora pré-flop.',
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
    explanation: 'T9s no CO é uma abertura padrão. Suited connectors têm excelente equity pós-flop com potencial de straights e flushes. No CO com menos jogadores atrás, o range se expande para incluí-los.',
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
    explanation: 'K4s no BTN é uma abertura padrão em GTO. O BTN abre todos os Kxs de K2s para cima (~50% das 169 mãos). K4s tem boa playability pós-flop (nut flush draw, top pair com kicker razoável) e fold equity suficiente vs os blinds.',
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
    explanation: 'J8s no UTG está fora do range. A posição early exige mãos muito mais fortes. J8s não tem blocagem suficiente nem equidade para justificar abrir nessa posição com vários jogadores atrás.',
    evComparison: { fold: 0, call: 0, raise: -0.4 }
  },
  // --- Mais Call RFI ---
  {
    id: 'q013',
    hand: 'AKo',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AKo no BB vs BTN open sempre faz 3bet. É uma mão premium que se beneficia de construir o pot como agressor. Chamar com AKo OOP desperdiça seu valor enorme.',
    evComparison: { fold: -1, call: 6.5, raise: 10.2 }
  },
  {
    id: 'q014',
    hand: 'JTs',
    position: 'BTN',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: 'JTs no BTN vs CO open é um call sólido. Em posição, JTs realiza sua equity de draw muito bem. O 3bet com JTs BTN vs CO é possível como bluff mas com menos frequência — call é o padrão.',
    evComparison: { fold: 0, call: 1.6, raise: 1.2 }
  },
  {
    id: 'q015',
    hand: 'A3s',
    position: 'SB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.75,
    explanation: 'A3s no SB vs BTN é um 3bet bluff clássico. Bloqueia combos de AA, tem bom equity quando chamado (nut flush draw potencial), e a posição OOP dificulta chamar. 3bet/fold é a linha padrão GTO.',
    evComparison: { fold: 0, call: 0.8, raise: 1.5 }
  },
  {
    id: 'q016',
    hand: 'KQs',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'SB',
    correctAction: '3bet',
    correctFrequency: 0.9,
    explanation: 'KQs no BB vs SB open quase sempre faz 3bet. O SB tem range muito amplo para abrir e KQs tem equidade forte vs esse range. 3bet vai vencer muitas vezes só pela fold equity, além de ter bom equity quando chamado.',
    evComparison: { fold: -0.5, call: 3.2, raise: 5.8 }
  },
  // --- Mais Push/Fold ---
  {
    id: 'q017',
    hand: 'A9o',
    position: 'SB',
    heroStack: 12,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: 'A9o com 12 BBs no SB é um jam claro. Com stack curto, A9o tem equity suficiente contra o range de call do BB e fold equity para lucrar. Abrir/fold desperdiça chips; jam é a jogada correta.',
    evComparison: { fold: 0, call: 0, raise: 1.8 }
  },
  {
    id: 'q018',
    hand: '55',
    position: 'BTN',
    heroStack: 8,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: 'Com 8 BBs no BTN, 55 é um jam muito lucrativo. Pares médios/pequenos jamam de forma muito ampla com stack curto pois têm ~50% vs overcards quando chamados e excelente fold equity contra os blinds.',
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
    explanation: 'T9s é uma defesa clara do BB vs BTN open. Tem excelente equity pós-flop com potencial de straight e flush draws. Mesmo OOP, os implied odds justificam chamada. 3bet raramente (mão não tem blocagem suficiente em AA/KK/AK).',
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
    explanation: 'Q7o no BB vs UTG open é fold. O range do UTG é muito tight (premium e mãos fortes), e Q7o não tem equity suficiente para justificar chamada OOP vs esse range. MDF sugere que não precisamos defender todas as mãos — Q7o está bem abaixo do threshold.',
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
    explanation: '55 no BB vs BTN open é uma defesa standard. Pares pequenos têm excelente implied odds — quando você seta (10.8% do tempo), o pot pode ser enorme. Flat call é a linha correta; 3bet com 55 seria demasiado loose.',
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
    explanation: 'KJs no BB vs CO open é um 3bet frequente. A mão tem blocagem em combos de AA/KK/AKs, boa equidade quando chamada e ganha muito por fold equity. OOP, 3bet/fold é superior a call pois maximiza equity vs range do CO.',
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
    explanation: '72o no BB vs qualquer open é fold. Mesmo sendo o BB (já pagou 1BB), a mão tem equidade tão baixa vs qualquer range razoável que chamada seria negativa. MDF não exige que defendamos com as piores mãos do range — 72o nunca entra.',
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
    explanation: 'A9s no BB vs SB open é quase sempre 3bet. O SB abre muito wide (~55% das mãos), então A9s tem equidade excelente vs esse range. A blocagem em AA + nut flush potential fazem de A9s um 3bet de valor/semi-bluff ideal BB vs SB.',
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
    explanation: 'AA sempre faz 3bet em qualquer posição e vs qualquer open. Construa o pot com a melhor mão pré-flop. Chamar seria desperdiçar equity enorme — AA quer jogo deep em pote grande.',
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
    explanation: 'A5s no BTN vs UTG open é geralmente fold ou call, não 3bet. O range do UTG é muito tight (88+, ATs+, AQo+, KQs), e A5s tem equidade ruim vs esse range. 3bet seria arriscar muito com pouco — fold/call são superiores.',
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
    explanation: 'TT no CO vs UTG open é principalmente call, não 3bet. Vs range tight do UTG, TT está atrás de JJ+ e flip vs AK. 3bet se torna chamada ampla de JJ/QQ+ criando spot ruim. Flat call em posição é melhor — realize equity barato.',
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
    explanation: 'A4s no SB vs BTN open é um 3bet bluff clássico. Bloqueia combos de AA, tem nut flush draw potential, e OOP não conseguimos realizar equity de A4s com flat call. 3bet/fold: se vilão 4bet, fold. Se chama, jogamos flop com equity e blocagem.',
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
    explanation: 'AA sempre faz 4-bet. Quando você abriu do BTN e o BB 3-betou, AA quer construir o pote o máximo possível. Chamar o 3-bet seria um erro — você desperdiça equity enorme. Tamanho ideal de 4-bet: 2.2x-2.5x o 3-bet (ex: 3-bet foi 9bb → 4-bet para ~22bb).',
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
    explanation: 'QQ vs 3-bet do BTN é quase sempre 4-bet. O BTN 3-beta muito wide (15-18% vs CO), então QQ tem equity excelente vs o range dele. Chamar é possível mas deixa você OOP com uma mão que prefere pot grande. 4-bet para ~22bb força fold das mãos fracas do BTN e extrai valor de JJ/AKo.',
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
    explanation: 'A5s é o 4-bet bluff padrão. Motivos: (1) Bloqueia combos de AA — reduzo de 6 para 3 os combos que me batem; (2) Bloqueia AK, AQ — mãos que o villain chamaria; (3) Quando chamado, tenho nut flush draw + overcard. Estratégia: 4-bet/fold vs jam do villain.',
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
    explanation: 'KQs vs 3-bet do BB é principalmente call. KQs tem equity boa mas não bloqueia suficientemente (não segura ases). 4-bet aqui seria muito transparente — seu range de 4-bet bluff deve ter blockers fortes. Prefira chamar IP e jogar o flop com position advantage.',
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
    explanation: 'JJ vs 3-bet do BB quando você abriu UTG é geralmente call. O BB 3-beta tight vs UTG (QQ+, AK, bluffs com A4s/A3s). JJ tem ~38% de equity vs esse range — bom para chamar, ruim para 4-bet. Se 4-betar, você faz o villain foldar exatamente as mãos que você bate (bluffs), e só continua com QQ+/AK onde você está atrás.',
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
    explanation: 'AKo sempre 4-beta quando você abriu SB e o BB 3-betou. AKo tem 50% de equity vs QQ, bate KK/QQ/JJ, e tem blocagem dupla em AA e KK. Chamar seria um erro — OOP com stack de 100bb e AKo, você quer jogo grande ou sair antes do flop.',
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
    explanation: 'AA sempre faz squeeze. Você está no BB, UTG abriu e CO chamou — squeeze com AA para 12-14bb. Você isola a pior mão do CO e constrói pote enorme com a melhor mão. Nunca chame com AA em squeeze spot — você quer o pote grande.',
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
    explanation: 'JTs no BTN com CO open e HJ caller é call, não squeeze. Squeeze com JTs seria bluff puro — você precisa de blockers fortes para squeezar eficientemente. JTs tem boa equity mas não bloqueia nada relevante. Prefira chamar IP para realizar equity com position.',
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
    explanation: 'AQs no SB com BTN open e BB caller é squeeze clara. AQs tem blocagem em AA/AK, equity excelente quando chamada, e você está OOP — squeeze/fold é superior a call OOP vs 2 jogadores. Tamanho: 4x o open (BTN abriu 2.5bb → squeeze para ~10bb).',
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
    explanation: 'KQo no BB vs HJ open + CO caller é call, não squeeze. KQo não tem blocagem suficiente (segura apenas K e Q, não bloqueia A). Squeeze seria arriscado pois você precisa que os dois foldarem. Prefira chamar e jogar o flop com posição do pot.',
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
    explanation: 'TT no BTN vs HJ open + CO caller é call. TT prefere realizar equity IP vs 2 jogadores. Squeeze aqui é marginal — TT não bloqueia AK/AQ e vs o caller (que pode ter JJ-QQ) você pode estar em trouble. Chame e jogue flop em posição.',
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
    explanation: 'A4s no BB vs CO open + BTN caller é squeeze de bluff perfeita. Blockers: A4s bloqueia AA (6→3 combos), AK (16→12 combos), AQ. Quando squeezar e os dois foldarem, você ganha o pote de graça. Quando chamado, tem nut flush potential. Tamanho: 4x o open.',
    evComparison: { fold: 0, call: 0.9, raise: 2.1 }
  },

  // ===== SB vs BB SCENARIOS (com gtoMix para ensinar frequências) =====
  {
    id: 'q041',
    hand: 'AA',
    position: 'SB',
    heroStack: 100,
    scenario: 'sb_vs_bb',
    correctAction: 'raise',
    correctFrequency: 0.7,
    gtoMix: { raise: 0.70, limp: 0.30 },
    explanation: 'AA no SB vs BB: raise (70%) ou limp (30%). Raise extrai valor imediato. Limp balanceia seu range de limp e pode induzir squeeze do BB (limp/reraise). GTO mistura ambas para não ser explorado — se você só raisa AA/KK do SB, BB pode fold sempre ao seu raise.',
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
    explanation: 'KK no SB: quase sempre raise (85%). Precisa construir pote e proteger vs overcard de Às. Limp 15% para balancear range de limp com strong hands. Se BB 3-bets depois do seu raise, 4-bet para valor.',
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
    explanation: 'T8s no SB: principalmente limp (70%). Mão especulativa que prefere ver flop barato — OOP vs BB, sem posição postflop. Raise (20%) como mistura para balancear. Fold (10%) em spots onde BB é muito agressivo com 3-bets.',
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
    explanation: '72o no SB: fold. Mesmo vs apenas o BB, 72o tem equity tão baixa que limp não é lucrativo OOP. MDF não exige defender com lixo — a pior mão do deck é fold sempre.',
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
    explanation: 'A7o no SB: raise (65%) ou limp (35%). A7o tem equity decente mas é difícil de jogar OOP. Raise constrói pote com posição preflop; limp realiza equity barato. GTO mistura para prevenir exploração do BB.',
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
    explanation: 'JTs no SB: principalmente raise (75%). Mão com boa playability, equity forte e potencial de semi-bluff. Raise extrai fold equity + value. Limp (25%) para misturar e realizarequity em spots passivos.',
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
    explanation: '55 no SB: principalmente limp (60%). Par pequeno que prefere setear barato — OOP vs BB, implied odds são a principal fonte de valor. Raise (40%) como mistura para representar range forte e evitar ser explorado.',
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
    explanation: 'AQo no SB: sempre raise. Mão forte que se beneficia de construir pote e tomar iniciativa. Limp seria desperdiçar equity — AQo supera a maioria do range do BB e deve apostar isso. Vs 3-bet do BB, 4-bet ou call dependendo do tamanho.',
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
    explanation: 'K4s no SB: raise (55%) ou limp (40%). Suited gapper com nut flush potential. Raise tem blocagem em KK e bom fold equity. Limp realiza equity barato com uma mão que joga bem em flops baratos. Quase nunca fold.',
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
    explanation: 'QTo no SB: 50/50 raise ou limp — genuína mistura GTO. Mão borderline: forte suficiente para raise, mas OOP é difícil de defender. Esta é a essência do mixed strategy: villain não consegue explorar você seja qual for sua ação.',
    evComparison: { fold: 0, call: 0.2, raise: 0.4 }
  },

  // ============ OPEN RAISE — 15 novas questões (q051-q065) ============
  {
    id: 'q051',
    hand: 'T9s',
    position: 'HJ',
    heroStack: 100,
    scenario: 'open_raise',
    correctAction: 'fold',
    correctFrequency: 0.8,
    explanation: 'T9s no HJ é uma mão borderline. O range do HJ é relativamente tight e T9s fica fora da maioria dos solvers. A mão joga bem em posição mas perde muito EV no HJ contra os players que ficam atrás. Fold é a jogada sólida aqui.',
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
    explanation: '87s no BTN é uma abertura padrão. Na BTN, o range é muito amplo (~45%), e 87s é um conector suited com boa jogabilidade pós-flop — draws a straight, flush, pair. Esta mão cria equity e bluffs bem-constru­ídos em boards coordenados.',
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
    explanation: 'KJo no CO é uma abertura padrão. CO tem um range amplo (~30%) e KJo possui boa equity pré-flop e jogabilidade pós-flop. É uma mão de "top-pair, top-kicker" frequente — aproveita bem a posição no flop, turn e river.',
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
    explanation: 'Q9s no BTN é uma abertura padrão. Na BTN, mãos como Q9s têm equity suficiente e jogabilidade pós-flop sólida — draws, top-pair médio, backdoor flush draws. Com posição garantida, o EV de abertura é positivo.',
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
    explanation: '44 no UTG está fora do range padrão de 6-max. Pares pequenos precisam de implied odds para justificar a abertura, e no UTG você enfrenta muitos jogadores atrás com ranges fortes. A mão tem equity ruim quando chamada e é difícil de defender pós-flop.',
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
    explanation: '55 no HJ é uma abertura padrão — o HJ range inclui pares a partir de 55/66. Pares pequenos no HJ têm valor de set-mining e fold equity vs blinds. Diferente do UTG, no HJ há apenas 3-4 players atrás, tornando a abertura lucrativa a longo prazo.',
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
    explanation: 'K9s no HJ está dentro do range padrão. É uma mão com boa equity, backdoor flush draw, e top-pair decente quando acerta. Solvers incluem K9s no HJ range de 6-max como abertura clara.',
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
    explanation: 'QJs no UTG é uma mão marginal — alguns solvers a incluem, outros não. O problema é que pós-flop você estará OOP contra todo mundo. QJs prefere jogar em posição. Fold é a jogada mais segura no UTG de 6-max, especialmente para iniciantes.',
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
    explanation: 'T8s no CO é uma abertura padrão. Conectores suited ganham valor especialmente no CO e BTN onde você tem maior chance de jogar em posição. T8s tem boa playability — draws a straight/flush, double backdoors, e value quando pega pair.',
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
    explanation: '76s no BTN é uma abertura clara. Conectores suited são valiosos na BTN porque jogam bem em posição, criam draws poderosos e têm boa equity realizada. 76s especificamente tem boa cobertura de board (acerta muitos middling boards).',
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
    explanation: 'A4s no BTN é uma abertura padrão — qualquer Ax suited é abertura na BTN. A4s tem boa equity vs mãos de call dos blinds, nut-flush draw potencial e pode montar nuts straight (A2345). Em posição com stack de 100bb é uma abertura clara.',
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
    explanation: 'A8o no SB é uma abertura borderline — o range do SB para raise é ~45% incluindo suited aces, mas A8o offsuit tem equity ruim OOP. A maioria dos solvers dá mix entre raise e fold aqui. Fold é mais conservador e evita spots difíceis fora de posição.',
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
    explanation: 'KTo no SB é uma abertura padrão — o range do SB inclui KTo como raise. A mão tem boa equity nominal e aproveita a fold equity vs BB. Embora OOP, é forte o suficiente para justificar a abertura vs apenas 1 player (BB).',
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
    explanation: '98o no BTN é uma abertura que o solver mistura — principalmente raise com frequência >50%. Offsuit connectors na BTN têm valor porque a posição compensa a falta do suit. Em tabela exploitativa, fold não é errado, mas GTO é raise a maioria das vezes.',
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
    explanation: 'J8s no CO está geralmente fora do range padrão. O CO range tem ~28% das mãos e prioriza conectores mais fortes (JTs, T9s) sobre J8s. A mão joga melhor em BTN onde a posição é garantida. Fold é a jogada sólida aqui.',
    evComparison: { fold: 0, call: 0, raise: -0.05 }
  },

  // ============ CALL RFI — 15 novas questões (q066-q080) ============
  {
    id: 'q066',
    hand: '77',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: '77 vs BTN open no BB é um call padrão. Pares médios não têm valor suficiente para 3bet com frequência aqui, mas têm excelente equity no call. Você fecha a ação com odds implícitas de set-mining e pode c/r flops drawy. Ocasionalmente pode 3bet como variação.',
    evComparison: { fold: 0, call: 2.1, raise: 2.0 }
  },
  {
    id: 'q067',
    hand: 'KQo',
    position: 'CO',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.7,
    explanation: 'KQo vs BTN open no CO: mix entre call e 3bet. KQo tem boa equity mas não tem bloqueadores ideais para 3bet (sem Aces). Chamar em posição (CO vs BTN não é posição, CO age antes) — na verdade CO está fora de posição vs BTN. Então call é mais conservador.',
    evComparison: { fold: 0, call: 1.8, raise: 2.0 }
  },
  {
    id: 'q068',
    hand: '66',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '66 vs CO open no BB é um call claro. Par médio com set-mining value. O BB tem odds favoráveis para chamar (precisa de menos de 33% equity com posição ruim, mas fecha a ação). 66 realiza bem sua equity como set-mining hand.',
    evComparison: { fold: 0, call: 1.5, raise: 0.8 }
  },
  {
    id: 'q069',
    hand: 'JTs',
    position: 'BTN',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'JTs no BTN vs CO open é predominantemente um call. Em posição, JTs realiza excelente equity — draws a straight/flush, top-pair decente. Pode ser 3bet ocasionalmente como linear 3bet mas call é mais comum por JTs preferir ver o flop em posição.',
    evComparison: { fold: 0, call: 2.4, raise: 2.6 }
  },
  {
    id: 'q070',
    hand: 'AQo',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: '3bet',
    correctFrequency: 0.65,
    explanation: 'AQo vs UTG open no BB: 3bet (65%). AQo está no range de 3bet do BB por bloquear AA/AK do villain. Vs UTG tight range, call também é defensável — solver mistura. Porém, AQo é forte o suficiente para reraize: extrai valor vs KK/QQ/AK e consegue fold equity vs JJ/TT.',
    evComparison: { fold: 0, call: 2.8, raise: 3.1 }
  },
  {
    id: 'q071',
    hand: '55',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'HJ',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: '55 vs HJ open no BB é um call claro. Set-mining hand com equity suficiente para defender o BB. O BB precisa de apenas ~33% equity para ser lucrativo, e 55 tem ~52% vs HJ range. Call e set-mine — quando pega set, ganha pote gigante.',
    evComparison: { fold: 0, call: 1.3, raise: 0.5 }
  },
  {
    id: 'q072',
    hand: 'A9s',
    position: 'CO',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.65,
    explanation: 'A9s no CO vs BTN open: call. CO está OOP vs BTN, mas A9s tem equity suficiente e implied odds para jogar o flop. Não está no range de 3bet do CO (muito speculative como bluff OOP). Call é melhor — veja o flop, decida com mais informação. Fold também é defensável dado a posição desfavorável.',
    evComparison: { fold: 0, call: 1.5, raise: 1.0 }
  },
  {
    id: 'q073',
    hand: 'QJs',
    position: 'SB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.6,
    explanation: 'QJs vs BTN open no SB: mix entre call e fold. OOP com 2 streets dificeis. QJs joga bem em posição mas no SB é complicado. Solver geralmente mistura entre call e fold. Call mantém equity realizada, fold evita spots OOP difíceis. Aqui call é levemente preferido.',
    evComparison: { fold: 0, call: 0.5, raise: 0.8 }
  },
  {
    id: 'q074',
    hand: 'KJs',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'KJs vs CO open no BB: mix entre call e 3bet. KJs tem bons blockers (K bloqueia KK, J bloqueia JJ) e boa equity. No entanto, contra CO range razoável, call também é lucrativo. Solver mistura ~80% call e ~20% 3bet. Call é a jogada mais frequente.',
    evComparison: { fold: 0, call: 2.2, raise: 2.5 }
  },
  {
    id: 'q075',
    hand: 'T9s',
    position: 'BTN',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'UTG',
    correctAction: 'fold',
    correctFrequency: 0.8,
    explanation: 'T9s no BTN vs UTG open é um fold surpreendente para muitos. O range do UTG é very tight (~15%) e inclui mãos como AA/KK/QQ/JJ/TT/AK que dominam T9s pesadamente. Mesmo em posição, T9s não tem equity suficiente para chamar um raise tight de UTG.',
    evComparison: { fold: 0, call: -0.3, raise: -0.5 }
  },
  {
    id: 'q076',
    hand: 'A3s',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 0.70,
    explanation: 'A3s vs BTN open no BB: 3bet bluff. A3s bloqueia combos de AA do villain (Ace blocker), tem potential de nut flush draw e força fold de hands medíocres do BTN. GTO classifica A3s/A4s como bluffs de 3bet do BB. Call é aceitável, mas 3bet tem maior EV vs range wide do BTN.',
    evComparison: { fold: 0, call: 1.2, raise: 1.6 }
  },
  {
    id: 'q077',
    hand: '99',
    position: 'HJ',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.75,
    explanation: '99 no HJ vs CO open: principalmente call. HJ está fora de posição vs CO, e 99 não tem equity suficiente para 3bet com frequência. Call e realiza equity como set-mining. Se 3bet, villain defende com mãos que dominam (TT-AA). Call é mais lucrativo aqui.',
    evComparison: { fold: 0, call: 2.0, raise: 1.7 }
  },
  {
    id: 'q078',
    hand: 'JTo',
    position: 'BB',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 1.0,
    explanation: 'JTo vs BTN open no BB é um call padrão. O BB tem odds implícitas para chamar com mãos como JTo que têm boa conectividade. JTo pode formar straightdraws, top-pairs medianos e tem equity suficiente para defender. A posição do BTN não muda a equação aqui.',
    evComparison: { fold: 0, call: 0.8, raise: 0.3 }
  },
  {
    id: 'q079',
    hand: 'Q9s',
    position: 'CO',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.5,
    explanation: 'Q9s no CO vs BTN open: mix equilibrado entre call e fold. CO está OOP vs BTN — isso penaliza mãos que precisam de posição como Q9s. Solver mistura ~50/50. Call pode ser justificado pela playability do Q9s suited, mas fold não é erro.',
    evComparison: { fold: 0, call: 0.4, raise: 0.2 }
  },
  {
    id: 'q080',
    hand: '88',
    position: 'BTN',
    heroStack: 100,
    scenario: 'call_rfi',
    villainAction: 'raise',
    villainPosition: 'SB',
    correctAction: 'call',
    correctFrequency: 0.85,
    explanation: '88 no BTN vs SB open é um call claro em posição. SB vs BTN: você fica em posição no BTN. 88 tem excelente set-mining value, não precisa de 3bet. Call, jogue flop em posição. Quando pega set (1 em 8 vezes), ganhe pote enorme.',
    evComparison: { fold: 0, call: 2.3, raise: 1.9 }
  },

  // ============ 3-BET — 15 novas questões (q081-q095) ============
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
    explanation: 'QQ no SB vs BTN open é sempre um 3bet. QQ tem equity premium vs todo o range do BTN e quer construir pote OOP. 3bet com QQ protege sua equity, restringe range do villain e cria spot onde você pode c/b com equity forte na maioria dos boards.',
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
    explanation: 'A5s é um 3bet bluff ideal vs CO open. Motivos: (1) Bloqueia combos de AA — villain tem menos AA quando você segura um Ace; (2) Quando chamado, tem equity de flush/straight draw; (3) Em posição (BTN vs CO), realiza equity bem. A5s é melhor como 3bet do que call aqui.',
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
    explanation: 'KQs no BB vs CO open é predominantemente 3bet. KQs tem blockers (K e Q reduzem combos premium do villain), equity forte e jogabilidade excelente pós-flop. OOP no BB, 3bet é preferível a call porque protege equity e cria potes maiores quando à frente.',
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
    explanation: 'JJ vs BTN open no BB: mix entre call e 3bet, com leve preferência por call. BTN range é muito amplo (~45%), e JJ está à frente de muito do range. No entanto, 3bet pode ser chamado por mãos que dominam (QQ-AA). Call mantém villain no range wide e realiza equity OOP.',
    evComparison: { fold: 0, call: 5.5, raise: 5.8 }
  },
  {
    id: 'q085',
    hand: '99',
    position: 'CO',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: '99 no CO vs BTN open: mix entre fold e call. CO está OOP vs BTN, e 99 não tem valor de 3bet — seria chamado apenas por mãos que dominam. O problema é que call OOP com 99 sem set é muito difícil de jogar. Fold/call mistura, com fold sendo seguro.',
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
    explanation: 'AQs no SB vs BTN open é sempre 3bet. Mão forte (top 8%), OOP, que precisa construir pote e não perder equidade chamando. AQs tem bloqueadores (A bloqueia AA/AK), flush nut draw e conectividade. 3bet com AQs SB vs BTN é a base da estratégia GTO.',
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
    explanation: 'K9s no BB vs CO open: predominantemente fold. K9s não tem equity suficiente para 3bet (CO range é razoavelmente tight), e call OOP com K9s cria spots difíceis. A mão não tem blockers ideais e perde muito quando 3bet é chamado por hands dominantes.',
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
    explanation: 'A3s no BTN vs CO open é um bom 3bet bluff. Razões: (1) Bloqueador de Ace reduz combos de AA; (2) Em posição (BTN vs CO); (3) Quando chamado, tem equity de flush e pode apanhar nut. A3s como 3bet balanceia seu range de 3bets com valor (QQ+/AK+) com um bluff com equity.',
    evComparison: { fold: 0, call: 1.3, raise: 1.8 }
  },
  {
    id: 'q089',
    hand: 'TT',
    position: 'HJ',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'CO',
    correctAction: 'call',
    correctFrequency: 0.8,
    explanation: 'TT no HJ vs CO open: principalmente call. HJ está OOP vs CO, e TT não tem stack suficiente de equity para 3bet com frequência. Call e realize equity. Se 3bet, villain com QQ-AA domina você. Call e procure sets/overcards favoráveis no flop.',
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
    explanation: 'KJs no SB vs BTN open: solver mistura entre call e 3bet, com leve preferência por call. KJs tem blockers mas o BTN range é muito wide — 3bet pode ser chamado por muito trash que você domina. Call e realize equity em posição... espera, SB está OOP. Então mix, levemente call.',
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
    explanation: 'JTs no BTN vs UTG open é geralmente fold/call mas não 3bet. UTG range é muito tight (~15%) — quando 3bet, villain raramente folda (tem AA-QQ/AK que adoram 4bet). JTs como 3bet bluff perde muito quando chamado por range strong do UTG. Fold ou call são melhores.',
    evComparison: { fold: 0, call: 0.3, raise: -0.5 }
  },
  {
    id: 'q092',
    hand: 'AKs',
    position: 'CO',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: '3bet',
    correctFrequency: 1.0,
    explanation: 'AKs no CO vs BTN open é sempre 3bet. AKs é a melhor mão não-par do poker. 3bet para construir pote, denegar equity de SCDs do villain e criar spots onde você fica bem vs grande parte do range. OOP (CO vs BTN), 3bet é obrigatório com AKs.',
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
    explanation: '77 no BB vs BTN open é um call claro. Pares médios no BB preferem chamar e set-minar. 3bet com 77 vs BTN wide range é arriscado — você é chamado por muitas mãos com overcards. Call OOP é melhor: realizando equity quando bate set, e fold quando board é ruim.',
    evComparison: { fold: 0, call: 2.5, raise: 1.8 }
  },
  {
    id: 'q094',
    hand: 'KQo',
    position: 'CO',
    heroStack: 100,
    scenario: '3bet',
    villainAction: 'raise',
    villainPosition: 'BTN',
    correctAction: 'call',
    correctFrequency: 0.75,
    explanation: 'KQo no CO vs BTN open: principalmente call. Embora KQo seja forte, CO está OOP vs BTN. 3bet com KQo pode ser chamado por AK/QQ+ que dominam. Call em OOP com KQo allowed, mas cuidado com K/Q flopped sendo dominado. Solver prefere call aqui.',
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
    explanation: 'A2s no BTN vs CO open: solver geralmente fold/call. A2s é a mão de Ace mais fraca — como 3bet bluff, os bloqueadores são valiosos, mas quando chamado, o hand realiza mal. CO range é razoavelmente tight. Fold/call é a linha mais usada, não 3bet.',
    evComparison: { fold: 0, call: 0.6, raise: 0.4 }
  },

  // ============ 4-BET — 15 novas questões (q096-q110) ============
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
    explanation: 'AA é sempre 4bet. Quando você abre no UTG e o BTN 3bets, você tem a melhor mão possível. 4bet para construir o pote — você tem ~80% equity vs range de 3bet do BTN. Chamar seria desperdiçar equity. AA é o 4bet de valor mais óbvio.',
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
    explanation: 'KK é sempre 4bet quando enfrenta um 3bet. SB pode 3bet amplo (QQ+/AK+ e alguns bluffs), e KK tem ~75% equity vs todo esse range. 4bet para construir o pote com a 2ª melhor mão. Apenas AA domina você, e AA é uma fração pequena do range do SB.',
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
    explanation: 'A5s como 4bet bluff vs BB 3bet: excelente spot. A5s bloqueia AA (reduz combos de AA do villain), e quando chamado em 4bet pot, tem equity de flush draw e straight draw. A5s é o bluff ideal no 4bet spot — melhor que mãos como K8s que não têm bloqueadores de Ace.',
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
    explanation: 'QQ vs CO 3bet: mix entre call e 4bet, com leve preferência por call em muitos spots. CO 3bet range inclui AA/KK que dominam QQ. Chamar com QQ e jogar flop é lucrativo — você domina JJ-/AQ-/broadways e tem boa equity vs bluffs. Solver geralmente mistura ~65-70% call.',
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
    explanation: 'JJ vs SB 3bet no BTN: principalmente call. Em posição (BTN vs SB), chamar com JJ é excelente — você realiza equity pós-flop com posição. SB range de 3bet tem QQ-AA que dominam JJ, então 4bet seria chamado por range dominante. Call e jogue flop em posição.',
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
    explanation: 'AKs é sempre 4bet — é a mão de valor máximo não-par. Vs BTN 3bet, você tem equity forte e quer construir pote. AKs também bloqueia combos de AA (1 Ace fora) e pode ganhar flops como A-x-x ou K-x-x. 4bet/fold vs jam (preserva equity).',
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
    explanation: 'A4s como 4bet bluff SB vs BB: solver mistura aqui. A4s tem bloqueador de Ace (como A5s) e pode ser usado como 4bet bluff. BB 3bet range é amplo (inclui bluffs), e 4bet pode gerar fold. Quando chamado, A4s tem alguma equity. Mix ~50/50 4bet e fold é típico.',
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
    explanation: 'TT vs BTN 3bet no UTG: principalmente call. TT é uma mão de médio valor que não tem equity para 4bet frequentemente vs BTN 3bet range (QQ+/AKs+). Call e realize equity. Se 4bet, BTN pode jam com KK/AA — você está em mau spot. Call e jogue a mão OOP cuidadosamente.',
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
    explanation: 'KK no BTN vs BB 3bet é sempre 4bet. Em posição com a 2ª melhor mão, construa o pote. BB 3bet range tem bluffs (A5s, K5s, etc.) que KK domina. Apenas AA tem KK dominado, e AA é ~1.5% do range do BB. 4bet para maximizar EV.',
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
    explanation: 'AQs vs SB 3bet no CO: principalmente call. AQs é forte mas pode ser dominado por AK/AA quando 4-bets. Call e realize equity em posição (CO age depois do SB no flop). AQs hits board well — top pair top kicker ou flush draws. Call é mais lucrativo que 4bet aqui.',
    evComparison: { fold: 0, call: 4.5, raise: 4.0 }
  },
  {
    id: 'q106',
    hand: 'A3s',
    position: 'BTN',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'CO',
    correctAction: 'fold',
    correctFrequency: 0.7,
    explanation: 'A3s vs CO 3bet no BTN: solver prefere fold/call aqui, não 4bet. CO 3bet range é tight (QQ+/AKs principalmente) — 4bet bluff com A3s seria chamado/jammed por range strong. Em posição, call pode ser exploitable. Fold é conservador mas sólido vs tight 3bet.',
    evComparison: { fold: 0, call: 0.5, raise: 0.2 }
  },
  {
    id: 'q107',
    hand: '99',
    position: 'SB',
    heroStack: 100,
    scenario: '4bet',
    villainAction: '3bet',
    villainPosition: 'BTN',
    correctAction: 'fold',
    correctFrequency: 0.85,
    explanation: '99 vs BTN 3bet no SB: fold. SB OOP vs BTN, e 99 não tem equity suficiente para 4bet ou call confortável em 3bet pot OOP. BTN 3bet range inclui TT+/AQ+ que dominam 99. 4bet seria jammed por KK-AA. Call OOP em 3bet pot com 99 cria spots muito difíceis.',
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
    explanation: 'AKo no UTG vs BB 3bet: sempre 4bet. AKo é top hand que deve construir o pote. BB 3bet pode ter bluffs (A5s, etc.) e mãos de valor menores (JJ, QQ). 4bet com AKo maximiza EV contra bluffs (eles foldam), e você vai bem vs QQ/JJ (50%+ equity).',
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
    explanation: 'QQ no BTN vs BB 3bet: mix entre 4bet e call, com leve preferência por 4bet em posição. BB 3bet range inclui bluffs e valor médio. Em posição (BTN), 4bet com QQ explota bluffs e pega value vs JJ-. Chamar também é válido para proteger range de call. Solver ~65% 4bet.',
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
    explanation: 'A5o vs BTN 3bet no CO: fold. A5o offsuit é muito fraco para 4bet bluff — não tem a versatilidade do suited version. Em OOP (CO vs BTN), chamar é ruim. 4bet seria chamado por range que domina A5o. Fold limpa a situação. Só o A5s (suited) tem valor de 4bet bluff.',
    evComparison: { fold: 0, call: -0.8, raise: -0.3 }
  },

  // ============ SQUEEZE — 15 novas questões (q111-q125) ============
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
    explanation: 'QQ no BTN squeeze vs UTG open + caller: sempre squeeze. Você precisa proteger equity vs mãos de caller (pode ter pocket pairs que catcham set), e maximizar EV com premium hand. Squeeze com QQ nega equity de holdings baratos do caller e constrói pote com mão forte.',
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
    explanation: 'A5s no SB squeeze vs BTN open + BB caller: excelente squeeze bluff. A5s tem bloqueadores de Ace, equity quando chamado, e em multiway pot, squeeze nega equity de ambos os players. OOP no SB, squeeze é preferível a call — evita spots difíceis com mão borderline em multiway.',
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
    explanation: 'JTs no BB squeeze vs CO open + BTN caller: fold. JTs precisa de posição para realizar equity — squeeze multiway OOP com JTs é muito ruim. Quando chamado por 2+ players, você está OOP com mão de draw. Fold e preserve stack. Só squeeze com value premium ou blockers fortes.',
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
    explanation: 'KK no SB squeeze vs CO open + BTN caller: squeeze obrigatório. KK é a 2ª melhor mão e quer construir pote vs 2 players. Squeeze nega odds implícitas do caller (evita que ele set-mine vs você), e maximiza EV quando estão fora de posição vs CO/BTN ranges.',
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
    explanation: '77 no CO squeeze vs UTG open + HJ caller: fold. UTG range é muito tight — squeeze com 77 seria chamado/rejammed por AA-TT frequentemente. 77 é set-mining hand que precisa de implied odds, não de squeeze spots. Vs tight UTG opener, fold é claramente correto.',
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
    explanation: 'AKs no BTN squeeze vs UTG open + CO caller: sempre squeeze. AKs é top hand e deve construir pote. Em posição (BTN), squeeze isola os players e cria spot onde você tem posição com mão premium. AKs domina a maioria dos ranges e tem equity forte em spots multiway.',
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
    explanation: 'KQs no BB squeeze vs BTN open + SB caller: predominantly squeeze. KQs tem blockers (K/Q reduzem combos premium), boa equity multiway, e squeeze OOP com KQs é correto quando BTN range é wide. Constrói pote com mão forte que domina muito do range.',
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
    explanation: 'T9s no SB squeeze vs CO open + BTN caller: fold. T9s é mão de draw que precisa de posição e implied odds — não de squeeze. Multiway OOP, T9s tem equity realizada ruim mesmo quando hits draw. Fold e espere melhor spot em posição.',
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
    explanation: 'AA no BB squeeze vs CO open + BTN caller: squeeze obrigatório. AA é a melhor mão possível — sempre construa o pote. Squeeze com AA maximiza EV, nega odds do caller, e cria pote grande com equity dominante. Call seria desperdiçar o potencial da mão.',
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
    explanation: 'A4s no SB squeeze vs BTN open + BB caller: squeeze bluff válido. A4s tem bloqueador de Ace, equity quando chamado, e fold equity razoável. Solver mistura squeeze e fold aqui. Squeeze é preferível a call OOP. Se vai jogar a mão, squeeze; se não, fold.',
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
    explanation: 'JJ no BTN squeeze vs HJ open + CO caller: squeeze. Em posição com JJ, você deve construir o pote. Squeeze nega set-mining do caller e isola vs HJ range. JJ tem equity forte vs ambos os ranges e aproveita posição pós-flop. Squeeze sempre com premium pair em posição.',
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
    explanation: '66 no BB squeeze vs CO open + BTN caller: fold. Par pequeno OOP em multiway — não tem valor de squeeze e call multiway OOP com 66 é difícil. Set odds são bons só quando há implied odds grandes. Em squeeze pot, potes ficam grandes mas você está OOP. Fold.',
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
    explanation: 'KJs no SB squeeze vs BTN open + BB caller: mix entre fold e squeeze. KJs sem bloqueadores de Ace perfeitos e OOP no SB. Solver geralmente prefere fold aqui — BTN range é amplo mas KJs multiway OOP tem realização ruim. Fold conservador é sólido.',
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
    explanation: 'TT no BB squeeze vs UTG open + CO caller: mix entre call e squeeze, com leve preferência por call. TT tem boa equity vs UTG tight range, mas squeeze OOP vs 2 players exige mais valor. Call e realize equity — quando hits set, ganha; quando não, pode fold vs pressão.',
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
    explanation: 'AQs no SB squeeze vs CO open + BTN caller: squeeze. AQs tem boa equity, blockers (Ace), e OOP no SB, squeeze é melhor que call. Denegar implied odds do BTN caller e construir pote com mão forte. AQs squeeze é padrão de estratégia GTO no SB.',
    evComparison: { fold: 0, call: 2.0, raise: 4.0 }
  },

  // ============ BB DEFENSE — 15 novas questões (q126-q140) ============
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
    explanation: 'A7s vs UTG open no BB: mix entre fold e call. UTG range é muito tight (~15%) e inclui muitas mãos que dominam A7s (AK, AQ, AJ, AT, AA). Call OOP vs UTG tight range com A7s cria spots difíceis — você frequentemente tem pair fraco ou é dominado. Fold é sólido aqui.',
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
    explanation: '87s vs BTN open no BB é um call padrão. BTN range é amplo (~45%), e 87s tem boa playability — draws a straight, flush draws, pair médio. Com odds do BB (já tem 1 BB no pote), chamar é claramente lucrativo. 87s realiza equity bem vs range wide do BTN.',
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
    explanation: 'K6s vs CO open no BB: mix, com preferência por fold. CO range (~28%) tem mãos fortes que dominam K6s (KQ, KJ, KT, AK). Chamar com K6s cria spots onde você tem K com kicker fraco e dificulta tomar decisões. Solver geralmente fold aqui com K6s vs CO.',
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
    explanation: 'Q9o vs BTN open no BB é um call. BTN range é wide, e Q9o tem equity suficiente para defender. Q9o pode formar top-pair médio, straightdraws e dois-pares. Com odds do BB e BTN range amplo, call é claramente correto. Evite 3bet com Q9o — prefira call.',
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
    explanation: 'J8s vs HJ open no BB é um call. HJ range é ~22% — moderado. J8s tem boa playability suited, pode formar draws fortes e top-pair. O BB sempre fecha a ação com odds boas, e J8s tem equity suficiente vs HJ range para defender. Call é padrão.',
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
    explanation: '22 vs CO open no BB: call padrão. O BB fecha a ação com odds implícitas de set-mining. 22 tem equity de ~50% vs AKo, mas seu valor principal é pegar set (1 em 8 vezes). Quando pega set, ganhe pote enorme. CO range não justifica fold de 22 no BB.',
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
    explanation: 'T7s vs BTN open no BB: call. BTN range amplíssimo — T7s tem equity suficiente para defender. Conectores suited médios têm boa playability OOP: draws a straight/flush, top-pair medium. O BB tem as melhores odds do poker (já investiu 1 BB), justificando call com T7s.',
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
    explanation: '64s vs BTN open no BB: mix entre call e fold. BTN range é muito wide — 64s tem equity borderline. Solver mistura ~65% call e ~35% fold. O suit (potential flush/straight draw) torna call razoável, mas é a parte mais fraca do range defensivo do BB.',
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
    explanation: 'A6o vs BTN open no BB: call padrão. BTN range inclui muitas mãos que A6o domina — qualquer A com kicker menor, pares 22-55, conectores. A6o tem equity ~48% vs BTN range amplo. Com odds do BB, call é claramente lucrativo.',
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
    explanation: '97s vs CO open no BB: call. CO range é ~28% e 97s tem boa equity vs esse range. Conector suited com draws a straight/flush. O BB fecha a ação e 97s é forte o suficiente para defender vs CO. Não 3bet — call e realize equity pós-flop.',
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
    explanation: 'K4s vs UTG open no BB: fold. UTG tight range tem muitas mãos que dominam K4s — AK, KK, KQ, KJ. Chamar com K4s cria spots difíceis de second/third pair com kicker ruim. Solver fold K4s vs UTG na maioria dos configs. Só defenda KXs vs opens mais fracos (BTN/SB).',
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
    explanation: 'QJo vs HJ open no BB: call. QJo tem boa equity vs HJ range — top-pair frequente, broadways, straightdraws. Com odds do BB, call é correto. QJo pode 3bet ocasionalmente mas call é mais frequente. É uma das mãos de defesa mais sólidas do BB range vs HJ.',
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
    explanation: 'J9s vs SB open no BB: call padrão. SB vs BB é o spot mais favorável para defender — SB range pode ser wide e você fecha a ação. J9s tem excelente playability: straightdraws, top-pair middle kicker, flush draws. Call é correto vs qualquer SB raise aqui.',
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
    explanation: 'T6s vs BTN open no BB: mix, levemente call. BTN range muito wide — T6s tem equity marginal mas suficiente. Solver mistura call/fold aqui. O suit torna call mais atraente. T6s is one of the weaker hands in BB defense range mas vs BTN wide range ainda é lucrativo.',
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
    explanation: '85s vs BTN open no BB: borderline — solver mistura quase 50/50. 85s é um conector gapped baixo que tem equity marginal vs BTN range. O suit ajuda mas a mão tem gaps. Em tabelas exploitativas, fold é defensável. Em GTO puro, é um spot de mistura.',
    evComparison: { fold: 0, call: 0.0, raise: -0.2 }
  },

  // ============ PUSH/FOLD — 10 novas questões (q141-q150) ============
  {
    id: 'q141',
    hand: 'A2s',
    position: 'UTG',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'fold',
    correctFrequency: 0.9,
    explanation: 'A2s no UTG com 10bb: fold. A2s não está no push range do UTG a 10bb — o UTG range de push é muito tight (AA-99, AKs-ATs, AKo-AQo, KQs). A2s no UTG enfrenta muitos callers com mãos melhores. Aguarde posição melhor (SB/BTN) para push com A2s.',
    evComparison: { fold: 0, call: 0, raise: -1.5 }
  },
  {
    id: 'q142',
    hand: '66',
    position: 'BTN',
    heroStack: 12,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: '66 no BTN com 12bb: push. BTN push range a ~10-15bb inclui 66+ confortavelmente. Você tem fold equity considerável vs SB/BB, e quando chamado, 66 tem ~45-50% equity vs maioria dos call ranges. Jam é correto — esperar por mãos melhores com 12bb é muito passivo.',
    evComparison: { fold: 0, call: 0, raise: 2.5 }
  },
  {
    id: 'q143',
    hand: 'KTo',
    position: 'SB',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: 'KTo no SB com 10bb: jam. SB push range a 10bb é amplo — vs apenas BB, você tem excelente fold equity e KTo está claramente no range. KTo tem ~58% equity vs BB call range. Push para ganhar os blinds ou entrar em pote com equity positiva. Fold seria muito passivo.',
    evComparison: { fold: 0, call: 0, raise: 3.0 }
  },
  {
    id: 'q144',
    hand: '87s',
    position: 'CO',
    heroStack: 8,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 0.85,
    explanation: '87s no CO com 8bb: jam. Com stack curtíssimo, conectores suited perdem implied odds mas têm equity de push. A 8bb, 87s tem fold equity suficiente e ~38% equity quando chamado. O push EV é positivo por causa do fold equity vs 3 players. Push é correto.',
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
    explanation: 'Q9o no BTN com 15bb: fold/jam mix, levemente fold. A 15bb, o push range do BTN está entre ~50-60% das mãos, mas Q9o é borderline. Solver mistura aqui — a 15bb tem mais opções (pode abrir para 2.5x). Jam com Q9o pode ser chamado por mãos que dominam. Fold/abertura normal são preferíveis.',
    evComparison: { fold: 0, call: 0, raise: 0.3 }
  },
  {
    id: 'q146',
    hand: 'JTo',
    position: 'SB',
    heroStack: 12,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 0.9,
    explanation: 'JTo no SB com 12bb: jam. SB push range a 12bb inclui JTo claramente. Vs apenas BB, você tem ~55% fold equity e JTo tem boa equity quando chamado (~45%). Push maximiza EV — muito melhor que limp/fold ou min-raise que desperdiça stack.',
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
    explanation: 'A3o no UTG com 15bb: fold. UTG push range a 15bb é tight (AA-TT, AKs-AJs, AKo-AQo). A3o offsuit não está no UTG range — enfrenta muitos players atrás que podem ter mãos melhores. Aguarde posição melhor ou mão melhor. A3s suited seria diferente.',
    evComparison: { fold: 0, call: 0, raise: -0.5 }
  },
  {
    id: 'q148',
    hand: '55',
    position: 'HJ',
    heroStack: 10,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: '55 no HJ com 10bb: jam. Par médio com fold equity razoável e equity de ~50% quando chamado vs overcards. HJ push range a 10bb inclui 55+. Push faz sentido — você pode ganhar cegos imediatamente ou entrar em coinflip favorável. Fold seria muito tight com 10bb.',
    evComparison: { fold: 0, call: 0, raise: 2.2 }
  },
  {
    id: 'q149',
    hand: 'K8s',
    position: 'BTN',
    heroStack: 8,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: 'K8s no BTN com 8bb: jam obrigatório. Com 8bb, quase toda mão razoável é push no BTN. K8s tem excelente equity quando chamado (boa equity vs A-x, domina K7s-), e fold equity considerável vs SB/BB. Push tudo que tem equity positiva a 8bb na BTN.',
    evComparison: { fold: 0, call: 0, raise: 3.5 }
  },
  {
    id: 'q150',
    hand: '99',
    position: 'CO',
    heroStack: 15,
    scenario: 'push_fold',
    correctAction: 'jam',
    correctFrequency: 1.0,
    explanation: '99 no CO com 15bb: jam. Par médio-alto com equity sólida. CO push range a 15bb inclui claramente 99. Quando chamado, 99 tem ~70% vs broadways e ~55% vs Ax. Fold equity razoável vs 3 players. Push maximiza EV — não há razão para fold com 99 a 15bb.',
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
    thumbnail: '🎯',
    modules: [
      { id: 'm001', title: 'O que é GTO?', lessons: [
        { id: 'l001', title: 'Introdução ao equilíbrio de Nash', duration: 12, isCompleted: true, type: 'video' as const,
          content: 'O equilíbrio de Nash no poker significa jogar uma estratégia que não pode ser exploitada — mesmo que o adversário conheça seu plano exato.\n\n🔑 Conceito chave: Em GTO, você joga RANGES, não mãos individuais. Ao invés de "eu tenho AK", pense "minha range nessa situação é {AA,KK,QQ,AKs,AKo...}".\n\nPor que isso importa? Se você sempre faz a mesma ação com a mesma mão (ex: sempre 3bet com AA), o villain pode exploitar isso. GTO mistura ações para ser imprevisível.\n\n📊 Exemplo prático: Com QQ no BTN vs CO open, você 3bet 80% e call 20% — não porque você aleatoriamente escolhe, mas porque sua range nesse spot precisa ter ambas as ações para ser balanceada.' },
        { id: 'l002', title: 'Ranges vs Mãos específicas', duration: 8, isCompleted: true, type: 'article' as const,
          content: 'A maior evolução no poker moderno foi parar de pensar em mãos específicas e começar a pensar em RANGES.\n\n❌ Pensamento antigo: "Villain tem AK porque betou forte no flop de A-7-2"\n✅ Pensamento moderno: "Villain tem {AA,AK,AQ,77,22,A7s...} nesse spot — uma range polarizada"\n\n🃏 Como construir uma range:\n1. Qual é a posição do villain?\n2. Qual foi a ação pré-flop?\n3. Qual board favorece mais qual range?\n4. Qual é o sizing usado?\n\nCom isso, você toma decisões baseadas em frequências de EV, não em intuição sobre uma mão específica.' },
        { id: 'l003', title: 'Quiz: Fundamentos GTO', duration: 5, isCompleted: false, type: 'quiz' as const,
          content: 'Teste seus conhecimentos sobre fundamentos GTO. Use o Treinador Pré-Flop em modo Estudo para praticar os conceitos desta aula.' },
      ]},
      { id: 'm002', title: 'Frequências e Mixing', lessons: [
        { id: 'l004', title: 'Por que misturar frequências?', duration: 15, isCompleted: false, type: 'video' as const,
          content: 'Mixing (mistura de estratégias) é um conceito fundamental do GTO. Significa fazer AÇÕES DIFERENTES com a mesma mão dependendo de uma frequência predefinida.\n\n🎲 Por que misturar?\nSe você sempre raise com AA, o villain folda sempre que você raise forte. Se você sempre call com AA, o villain vai bluffar muito contra você. A solução: misturar raise/call com AA em certas frequências para que o villain não possa exploitar.\n\n📐 Exemplo real — SB vs BB:\n• K5o no SB: 60% raise, 40% limp\n• Não porque a mão é boa às vezes e ruim outras\n• Mas porque sua range do SB precisa ter ambas as ações com mãos dessa categoria\n\n⚡ Na prática: Para a maioria dos jogadores amadores, focar em RANGES SÓLIDAS é mais valioso que mixing perfeito. Mixing importa mais nos níveis mais altos.' },
        { id: 'l005', title: 'Sizing e frequências pós-flop', duration: 10, isCompleted: false, type: 'article' as const,
          content: 'O sizing que você escolhe no pós-flop deve ser consistente com sua RANGE completa, não apenas com sua mão específica.\n\n💰 Regras de sizing GTO:\n• Bet 33% pot: thin value, bluffs com equity, boards onde ranges estão próximas\n• Bet 50-67% pot: value médio, semi-bluffs em boards coordenados\n• Bet 75-100% pot: valor premium, bluffs polarizados em boards secos\n• Overbet (>pot): range muito polarizada (nuts ou ar), normalmente no river\n\n🔑 Princípio fundamental: Use o mesmo sizing com mãos de valor E com bluffs do mesmo tipo. Exemplo: se você bets 75% pot com top set, também bets 75% com seus bluffs naquele board — não com 33%.' },
      ]},
    ],
  },
  {
    id: 'c002',
    title: 'Ranges Pré-Flop Completos',
    description: 'Domine todas as posições em cash game 6-max e tornamentos',
    category: 'preflop' as const,
    difficulty: 'intermediate' as const,
    totalMinutes: 240,
    isPremium: false,
    thumbnail: '📊',
    modules: [
      { id: 'm003', title: 'Posições Early', lessons: [
        { id: 'l006', title: 'UTG e UTG+1 em 6-max', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'UTG (Under The Gun) é a posição mais difícil do 6-max. Você age PRIMEIRO em todas as ruas — antes de saber o que os outros vão fazer.\n\n📊 Range UTG 6-max (~15% das mãos):\n• Pares: 88+\n• Aces suited: ATs+\n• Aces offsuit: AKo, AQo\n• Broadways suited: KQs, KJs\n\n❌ Mãos que parecem boas mas são fold no UTG:\n• JTs — joga bem em posição, não OOP vs 5 players\n• 55/66 — set-mining precisa de implied odds profundos\n• KJo — kicker médio OOP é problemático\n\n🎯 Por que tão tight? Você pode ser 3betado por qualquer posição depois de você. Seu range precisa ser forte o suficiente para aguentar pressão de toda a mesa.' },
        { id: 'l007', title: 'HJ e CO — posições de transição', duration: 15, isCompleted: false, type: 'article' as const,
          content: 'HJ e CO são as posições de "transição" — mais largas que early positions mas não tão largas quanto BTN.\n\n📊 Range HJ (~22%):\nTudo do UTG+ adicionando: 77, A9s/A8s, K9s/KTs, QTs/Q9s, JTs, T9s, KQo\n\n📊 Range CO (~28%):\nTudo do HJ+ adicionando: 66/55, A7s-A5s, K8s, J9s, T8s, 98s, 87s, KJo, QJo, ATo/A9o\n\n🔑 Princípio: A cada posição que avança, você adiciona mãos especulativas (conectores, suited aces menores) que precisam de implied odds pós-flop.' },
        { id: 'l008', title: 'Drill: Posições Early/Médio', duration: 15, isCompleted: false, type: 'quiz' as const,
          content: 'Pratique abertura de UTG e HJ no Treinador Pré-Flop. Configure o cenário para "Open Raise" e a posição para UTG ou HJ. Objetivo: ≥80% de precisão.' },
      ]},
      { id: 'm004', title: 'Posições Late', lessons: [
        { id: 'l009', title: 'BTN stealing — o superpoder do poker', duration: 18, isCompleted: false, type: 'article' as const,
          content: 'O BTN (Button) é a melhor posição do poker. Você age POR ÚLTIMO em todas as ruas do flop em diante — uma vantagem enorme.\n\n📊 Range BTN (~45% das mãos):\nPraticamente tudo com potencial: pares 22+, todos Ax suited, broadways, conectores suited até 54s, Kxs até K2s, offsuit até QJo/KTo.\n\n🎯 Steal vs Blinds:\n• SB e BB têm que defender OOP — eles são desvantajosos\n• BTN pode abrir amplo e ganhar chips dos blinds frequentemente\n• Valor do BTN steal: ~0.5-1 BB/mão em risco\n\n💡 Regra prática: Se você abre no BTN e os blinds foldarem, você ganhou ~1.5 BBs sem ver flop. Fazendo isso consistentemente é extremamente lucrativo a longo prazo.' },
        { id: 'l010', title: 'SB vs BB — o duelo especial', duration: 22, isCompleted: false, type: 'article' as const,
          content: 'SB vs BB é o único spot onde AMBOS os players estão fora de posição. O SB age primeiro no pós-flop, então o BB tem ligeira vantagem posicional.\n\n📊 Estratégia SB:\n• Raise range: ~45% (bem largo — BB não tem incentivo de foldar)\n• Limp range: ~18% (mãos que jogam bem multiway mas difíceis de abrir)\n• Fold: ~37% (lixo puro)\n\n📊 Estratégia BB vs SB open:\n• Defesa: ~65% (BB tem odds excelentes — já investiu 1 BB)\n• 3bet: ~10% (mãos premium + bluffs com bloqueadores)\n\n🔑 Insight: O BB deve foldar menos vs SB do que vs qualquer outra posição, porque o SB abre muito amplo. Um SB range de 45% inclui muito trash que o BB domina facilmente.' },
      ]},
    ],
  },
  {
    id: 'c003',
    title: 'ICM e Tornamentos',
    description: 'Aprenda a tomar decisões corretas considerando o Independent Chip Model',
    category: 'icm' as const,
    difficulty: 'advanced' as const,
    totalMinutes: 180,
    isPremium: false,
    thumbnail: '🏆',
    modules: [
      { id: 'm005', title: 'Fundamentos do ICM', lessons: [
        { id: 'l011', title: 'O que é ICM e por que importa', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'ICM (Independent Chip Model) é o modelo matemático que converte chips de torneio em valor monetário real ($EV).\n\n💡 Por que chips não valem linearmente:\n• Em um torneio com R$1000 de prêmio e 100 chips, cada chip não vale R$10\n• O chip leader não tem toda a vantagem proporcional\n• Short stacks valem proporcionalmente MAIS em $ do que em chips\n\n📊 Exemplo:\nFinal table 3 players, R$500/300/200 (total R$1000)\n• Stacks: 50 chips, 30 chips, 20 chips\n• Chip %: 50%, 30%, 20%\n• ICM $: ~44%, 32%, 24% (o leader perde, o short ganha proporcionalmente)\n\n🎯 Impacto prático:\n• Na bolha: aperte seu range — a diferença de $ entre entrar no dinheiro e sair é enorme\n• Chip leader: não precisa arriscar vs outros big stacks — deixe short stacks eliminar uns aos outros\n• Short stack: precisa acumular chips — fold equidade é seu inimigo' },
        { id: 'l012', title: 'ICM na bolha — quando foldar premium', duration: 25, isCompleted: false, type: 'article' as const,
          content: 'A bolha é onde ICM muda mais drasticamente as decisões corretas. Situações onde você deveria foldar mãos "fortes":\n\n⚠️ Exemplo clássico — JJ na bolha:\n• 4 players, 3 pagam. Você tem 35bb (quase garantido ITM se foldar)\n• Short stack (5bb) vai all-in, chip leader (40bb) cold-call\n• Resultado: FOLD com JJ!\n• Por quê? Você entra vs 2 ranges, sua equity cai muito, e se perder vai para ~10bb em risco real\n\n✅ Quando continuar com premium na bolha:\n• Você É o short stack — precisa acumular\n• É heads-up vs apenas 1 player, não multiway\n• Sua equity é dominante (AA/KK vs 1 player com range wide)\n\n🔑 Frase-chave: "ICM te pede para foldar quando o custo de perder chips supera o benefício de ganhar chips"' },
        { id: 'l013', title: 'ICM Drill — pratique no app', duration: 12, isCompleted: false, type: 'drill' as const,
          content: 'Pratique decisões ICM na Calculadora → ICM Drill. Resolva todos os 10 cenários e tente atingir 80%+ de acertos. Foque nos cenários de bolha onde o fold de premium é correto.' },
      ]},
    ],
  },
  {
    id: 'c004',
    title: 'Estratégia Pós-Flop Avançada',
    description: 'Dominância de board, protegendo ranges, sizing correto em todas as ruas',
    category: 'postflop' as const,
    difficulty: 'advanced' as const,
    totalMinutes: 300,
    isPremium: false,
    thumbnail: '🃏',
    modules: [
      { id: 'm006', title: 'Textura de Board', lessons: [
        { id: 'l014', title: 'Boards secos vs coordenados', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'A textura do board determina qual range tem vantagem e quais sizings são corretos.\n\n🧱 Board SECO (ex: A♠7♦2♣ rainbow):\n• Poucos draws possíveis\n• Range advantage para quem abriu pré-flop (more Aces)\n• Sizing: bet pequeno (33%) com frequência alta — villain tem poucas draws pra chamar\n• IP: bet ~70% da range, tamanho 25-33%\n\n🌊 Board COORDENADO (ex: J♥T♠9♥):\n• Muitos draws, straights, flushdraws\n• Ranges mais próximas — nem aggressor nem caller têm grande vantagem\n• Sizing: bet maior (67-75%) com frequência menor\n• Semi-bluffs com draws têm alto EV aqui\n\n🔑 Regra: Em boards secos, bet pequeno e frequente. Em boards molhados, bet grande e seletivo.' },
        { id: 'l015', title: 'Range Advantage vs Nut Advantage', duration: 18, isCompleted: false, type: 'article' as const,
          content: 'Dois conceitos diferentes que guiam a estratégia pós-flop:\n\n📊 RANGE ADVANTAGE:\nSua range geral tem mais equity do que a range do villain naquele board.\n• Ex: UTG opener vs BB caller no flop A♠K♣7♦ — UTG tem muito mais Aces e Kings\n• Com range advantage: bet frequente com sizings menores\n\n🥇 NUT ADVANTAGE:\nVocê tem proporcionalmente mais das mãos MAIS FORTES (sets, dois pares, nuts)\n• Pode existir mesmo sem range advantage total\n• Com nut advantage: sizings maiores, overbets possíveis\n\n💡 Exemplo: No flop J♥T♠9♥, o BB caller pode ter mais straights e dois pares que o UTG opener — BB tem nut advantage apesar de range disadvantage global.' },
      ]},
      { id: 'm007', title: 'Turn e River', lessons: [
        { id: 'l016', title: 'Decisões de turn — draws e equity', duration: 22, isCompleted: false, type: 'article' as const,
          content: 'No turn, ranges ficam mais polarizadas e decisões de draws ficam críticas.\n\n🎯 Tipos de turn cards:\n• GIN card: completou sua draw principal — agora você tem o melhor\n• Scare card: completou possível draw do villain, mudou a dinâmica\n• Blank: neutro, mantém hierarquia do flop\n\n📐 Sizing no turn:\n• Draws que melhoraram: bet 50-67% para extrair valor\n• Draws que não melhoraram: check com frequência (preserve equity)\n• Mãos fortes: bet 67-75%, construa o pote para o river\n\n⚡ Conceito crítico — Pot commitment:\nCom SPR ≤ 2 no turn, você está "committed" — qualquer aposta forte te leva a all-in no river. Planeje sua linha antes de agir.' },
        { id: 'l017', title: 'River — value e bluff', duration: 25, isCompleted: false, type: 'article' as const,
          content: 'O river é a rua de decisão final. Draws não existem mais — você tem o que tem.\n\n💰 THIN VALUE no river:\nBet com mãos que ganham apenas do range específico do villain:\n• Top pair médio kicker vs range de check-behind\n• Bet 33% para extrair de pairs piores\n• Evite value-betting mãos que perdem de ~50% do range\n\n🎭 BLUFF RATIO no river:\nPara cada tamanho de bet, você precisa bluffar em certa proporção:\n• Bet 33% pot: bluff ~25% das vezes (precisa funcionar 25% para ser lucrativo)\n• Bet 75% pot: bluff ~43% das vezes\n• Pot bet: bluff ~50% das vezes\n\n🔑 Escolha bluffs com mãos que têm ZERO showdown value (draws que não completaram) — não "bluff" com mãos medianas que ainda podem ganhar no showdown.' },
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
    thumbnail: '💰',
    modules: [
      { id: 'm008', title: 'Fundamentos de BRM', lessons: [
        { id: 'l018', title: 'Por que BRM salva carreiras', duration: 15, isCompleted: false, type: 'article' as const,
          content: 'Bankroll Management (BRM) é o conjunto de regras que protege seu bankroll da variância natural do poker. Sem BRM, até players vencedores ficam broke.\n\n📊 A matemática da variância:\nUm player com winrate de 5 BB/100 em NL50 ainda tem chances de ter downswings de 20-30 buy-ins. Com apenas 10 buy-ins, isso significa quebrar — mesmo sendo lucrativo a longo prazo.\n\n🎯 Regras mínimas por formato:\n\n💵 Cash Game (6-max online):\n• Mínimo: 20 buy-ins para o stake\n• Conservador: 30 buy-ins\n• Ex: Para jogar NL50 (R$250 buy-in), precisa de R$5.000-7.500\n\n🏆 MTT:\n• Mínimo: 50 buy-ins\n• Alta variância: 100+ buy-ins recomendado\n• Ex: Para MTT de R$50, precisa de R$2.500-5.000\n\n🎰 SNG:\n• Mínimo: 30 buy-ins\n• Conservador: 50 buy-ins\n\n⚡ Spin & Go:\n• Alta variância de prize pool: 100+ buy-ins' },
        { id: 'l019', title: 'Como subir e descer de stakes', duration: 20, isCompleted: false, type: 'article' as const,
          content: '🚀 SUBIR DE STAKE:\nNão suba apenas porque "alcançou os buy-ins". Critérios:\n1. Bankroll ≥ 30 buy-ins para o novo stake\n2. Winrate positivo no stake atual (mínimo 50k mãos de amostra)\n3. Estudo do novo stake (villain pools são diferentes)\n4. Estado mental adequado — não suba após bad beat\n\n📉 DESCER DE STAKE (stop-loss):\nEscolha um número ANTES de começar a sessão:\n• Desça se perder 3-5 buy-ins na sessão\n• Desça se bankroll cair abaixo de 15-20 buy-ins\n• Nunca jogue "one more" depois do stop-loss\n\n🔑 Regra de ouro:\nQuando descer de stake, trate como decisão profissional, não como derrota. Players vencedores descem durante downswings e sobem quando se estabilizam.\n\n💡 Shot-taking:\nPode "experimentar" um stake maior ocasionalmente:\n• Limite: 1-2% do bankroll total\n• Máximo 1 sessão de shot por semana\n• Se perder o shot, volte imediatamente' },
        { id: 'l020', title: 'BRM Calculator — use no app', duration: 10, isCompleted: false, type: 'drill' as const,
          content: 'Use a aba Meta-Game nesta página para calcular seu bankroll ideal para cada formato. Insira seu bankroll atual e veja o stake máximo recomendado.' },
      ]},
    ],
  },
  {
    id: 'c006',
    title: 'Mental Game & Meta-Jogo',
    description: 'Tilt control, variância, game selection e HUD stats para jogar melhor',
    category: 'mental' as const,
    difficulty: 'intermediate' as const,
    totalMinutes: 150,
    isPremium: false,
    thumbnail: '🧠',
    modules: [
      { id: 'm009', title: 'Tilt Control', lessons: [
        { id: 'l021', title: 'Os 5 tipos de tilt', duration: 18, isCompleted: false, type: 'article' as const,
          content: 'Tilt é qualquer desvio da sua estratégia ótima causado por estado emocional. Tipos mais comuns:\n\n😡 1. REVENGE TILT (mais comum)\nQuerer recuperar perdas imediatamente vs o mesmo jogador.\nSinais: Calling station, calls óbvios com mãos ruins\nSolução: Foldar qualquer mão boa por 5 minutos após bad beat\n\n😤 2. RUNNING BAD TILT\nSentir que "nada funciona" e começar a chamar/bluffar mais.\nSinais: Loosening range, calling downs com bottom pair\nSolução: Revisar hands — geralmente você está jogando bem\n\n😰 3. FEAR TILT\nJogar muito tight com medo de perder mais.\nSinais: Folding too much, checking quando deveria bet\nSolução: Lembrar que o EV de longo prazo não muda\n\n🤩 4. EUPHORIA TILT\nJogar descuidado quando está ganhando.\nSinais: Bluffing too much, loosening ranges\nSolução: Sessões têm fim — ganhos não são "dinheiro da casa"\n\n😩 5. ENTITLEMENT TILT\nAchar que merecia ganhar aquela mão.\nSinais: "Como ele pode chamar com isso?!"\nSolução: Resultados ruins de jogadas boas = long term positivo' },
        { id: 'l022', title: 'Gerenciando downswings', duration: 20, isCompleted: false, type: 'article' as const,
          content: 'Downswings são inevitáveis no poker. A questão não é SE vai acontecer, mas QUANDO e como você vai reagir.\n\n📊 Downswings esperados por stake:\n• NL50 winrate 5bb/100: espere -15 a -25 buy-ins em algum ponto\n• Isso é MATEMATICAMENTE ESPERADO, não azar\n\n🛡️ Como gerenciar:\n\n1. STOP-LOSS DIÁRIO\nDefina antes de sentar: "Se perder X buy-ins hoje, paro."\nRecomendado: 3 buy-ins cash, 5 MTTs\n\n2. VOLUME MÍNIMO ANTES DE JULGAR\nNão avalie performance com menos de 10k mãos.\nVariância do poker é muito alta para amostras pequenas.\n\n3. SEPARAR RESULTADOS DE DECISÕES\nPerguntas certas após uma mão:\n❌ "Fiz a jogada certa?" baseado no resultado\n✅ "Fiz a jogada certa?" baseado no processo\n\n4. BREAK OBRIGATÓRIO após 3 sessões ruins consecutivas\nNão "força" o resultado. Descanse, estude, volte renovado.' },
      ]},
      { id: 'm010', title: 'HUD Stats & Game Selection', lessons: [
        { id: 'l023', title: 'Lendo HUD stats dos vilains', duration: 25, isCompleted: false, type: 'article' as const,
          content: 'HUD (Heads-Up Display) mostra estatísticas dos adversários. As mais importantes:\n\n📊 VPIP (Voluntarily Put In Pot)\n• < 15%: Nitão — joga apenas premium, fácil de ler\n• 15-25%: TAG (Tight-Aggressive) — bom regular\n• 25-35%: LAG (Loose-Aggressive) — pode ser boa estratégia ou leak\n• > 35%: Fish — entra em pots demais, perde dinheiro\n• > 50%: Mega-fish — alvo principal\n\n🏹 PFR (Pre-Flop Raise)\n• PFR perto de VPIP: raise muito, call pouco → agressivo\n• PFR muito menor que VPIP: call muito → passivo pré-flop\n• PFR < 5%: Limper crônico → exploite com re-raises\n\n🔄 3-Bet %\n• < 3%: 3bet range é apenas premium → fold AQ/JJ vs 3bet deles\n• 3-8%: Balanceado\n• > 10%: 3betting muita lixo → 4bet/call mais amplo\n\n🚪 Fold to 3-Bet\n• > 70%: Folda demais → 3bet light\n• < 50%: Defende muito → 3bet apenas valor\n• 55-65%: Balanceado' },
        { id: 'l024', title: 'Game Selection — selecionando mesas lucrativas', duration: 22, isCompleted: false, type: 'article' as const,
          content: 'Game selection é uma das habilidades mais negligenciadas. Sentar na mesa certa vale tanto quanto jogar melhor.\n\n🎯 O que procurar em mesas online:\n• VPIP médio da mesa > 25-30% → mesas com fish\n• Players com VPIP > 40% → alvo principal\n• Stacks acima do buy-in máximo → players que têm chips para perder\n• Observe flops vistos (%) — acima de 30% é bom sinal\n\n🏪 Ao vivo — sinais de mesa lucrativa:\n• Players discutindo mãos "impossíveis" que jogaram\n• Pilhas de fichas desiguais (alguém perdeu muito)\n• Jogador bebendo, distraído\n• "Loose" atmosphere — muita gente vendo flop\n\n❌ Mesas para evitar:\n• Apenas regulares/grinders\n• Muitos stacks curtos (scared money)\n• Mesa onde todos esperam um ao outro (nit game)\n\n💡 Regra prática: Se você é o melhor player da mesa, sua winrate será baixa. Busque ser o 2º-3º melhor — os piores serão seus alvos.' },
      ]},
    ],
  },
]

// ------- FLASHCARDS -------
export const FLASHCARDS_DATA = [
  {
    id: 'f001',
    front: 'O que é MDF (Minimum Defense Frequency)?',
    back: 'É a frequência mínima que você precisa defender sua range para tornar um bet do villain não lucrativo. Calculado como: Pot / (Pot + Bet). Ex: se villain bets 1/2 pot, você precisa defender 67% da sua range.',
    category: 'matemática',
    difficulty: 2 as const,
    correctCount: 3,
    incorrectCount: 1,
  },
  {
    id: 'f002',
    front: 'Qual é a regra dos 4 e dos 2?',
    back: 'Uma estimativa rápida de equity com outs: • No FLOP com 2 ruas: multiplique seus outs por 4 • No TURN com 1 rua: multiplique seus outs por 2 Ex: Flush draw no flop (9 outs) ≈ 36% equity',
    category: 'matemática',
    difficulty: 1 as const,
    correctCount: 5,
    incorrectCount: 0,
  },
  {
    id: 'f003',
    front: 'O que é SPR (Stack-to-Pot Ratio)?',
    back: 'SPR = Stack Efetivo / Pot. Guia o comprometimento de stack: • SPR 1-3: Fácil de commitar (top pair+) • SPR 4-8: Médio, exige mãos fortes • SPR 9+: Precisa de mãos muito fortes para commitir todo o stack',
    category: 'conceitos',
    difficulty: 2 as const,
    correctCount: 2,
    incorrectCount: 2,
  },
  {
    id: 'f004',
    front: 'O que diferencia GTO de Exploitative?',
    back: 'GTO (Game Theory Optimal): Estratégia equilibrada que não pode ser exploitada, mesmo que o villain saiba sua estratégia. Exploitative: Ajusta sua estratégia para explorar desvios específicos do villain, potencialmente maximizando EV mas ficando vulnerável a contra-exploração.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 1,
    incorrectCount: 3,
  },
  {
    id: 'f005',
    front: 'Quantos combos tem AKs? E AKo?',
    back: 'AKs = 4 combos (um por naipe: A♠K♠, A♥K♥, A♦K♦, A♣K♣)\nAKo = 12 combos (4 ases × 4 kings - 4 suited = 12)\nTotal AK = 16 combos\n\nDica: Qualquer suited tem 4 combos, qualquer offsuit tem 12, qualquer par tem 6.',
    category: 'matemática',
    difficulty: 1 as const,
    correctCount: 4,
    incorrectCount: 1,
  },
  // --- Flashcards Meta-Game e Conteúdo ---
  {
    id: 'f006',
    front: 'Quantos buy-ins você precisa para jogar cash game de forma responsável?',
    back: 'Mínimo: 20 buy-ins para o stake que pretende jogar.\nConservador/recomendado: 30 buy-ins.\n\nExemplo: Para NL50 (buy-in R$250), você precisa de R$5.000–7.500 de bankroll dedicado ao poker.',
    category: 'bankroll',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f007',
    front: 'O que significa VPIP 45% em um adversário?',
    back: 'VPIP 45% = entra voluntariamente em 45% dos pots. É um fish/loose player.\nEle paga muito com mãos fracas, excelente alvo.\n\nNormal para bom regular: VPIP 20-28% em 6-max.\nVPIP > 40% = perde dinheiro consistentemente.',
    category: 'hud',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f008',
    front: 'O que é Fold to 3-Bet e como exploitar quando é muito alto?',
    back: 'Fold to 3-Bet = % que o player folda quando 3betado.\n\n> 70%: Folda demais → 3bete light com mãos como K9s, JTs, A3s. EV positivo mesmo sem equity alta.\n< 50%: Defende demais → 3bete apenas valor (QQ+/AK+).\n55-65%: Balanceado, use seu range normal.',
    category: 'hud',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f009',
    front: 'Quais são os 3 principais tipos de tilt no poker?',
    back: '1. Revenge Tilt: querer recuperar de um player específico\n2. Running Bad Tilt: sentir que tudo está contra você, loosear\n3. Entitlement Tilt: achar que "merecia" ganhar (bad beat rage)\n\nTodos levam ao mesmo resultado: desvio da estratégia ótima.',
    category: 'mental',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f010',
    front: 'O que é ICM e por que chips em tornamento não têm valor linear?',
    back: 'ICM (Independent Chip Model) converte chips em valor monetário real.\n\nChips não valem linearmente porque:\n• Dobrar seu stack não dobra seus ganhos esperados\n• Perder tudo = 0 prêmio, independente de quantos chips tinha\n• Short stacks valem mais em $ proporcionalmente\n\nEx: 60% dos chips ≠ 60% do prêmio total.',
    category: 'torneio',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f011',
    front: 'Qual é a regra de stop-loss diário recomendada para cash game?',
    back: 'Stop-loss diário: pare de jogar ao perder 3 buy-ins na mesma sessão.\n\nPor quê? Após 3 buy-ins perdidos:\n• Estado mental costuma estar comprometido\n• Tilt (consciente ou não) aumenta erros\n• Recuperar em tilt piora as perdas\n\nDecida o stop-loss ANTES de sentar, nunca depois.',
    category: 'bankroll',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f012',
    front: 'O que é PFR e o que indica quando é muito menor que o VPIP?',
    back: 'PFR (Pre-Flop Raise) = % de vezes que raise pré-flop.\n\nPFR << VPIP (ex: VPIP 30, PFR 8) = player passivo/limper.\nEntra em pots mas prefere limp/call a raise.\n\nComo exploitar: 3bete/raise mais vs esse player, ele vai call/fold.\nNão respeite raises deles — têm mão muito forte quando raise.',
    category: 'hud',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f013',
    front: 'Quantos buy-ins de MTT você precisa para ser sustentável?',
    back: 'MTT: mínimo 50 buy-ins, recomendado 100+.\n\nPor quê tão mais que cash?\n• MTT tem variância muito maior (pode ganhar 100x o buy-in ou zero)\n• Downswings de 40-60 buy-ins sem lucro são normais\n• Com menos de 50 buy-ins, risco real de quebrar mesmo sendo lucrativo\n\nSpins (alta variância): 100+ buy-ins essencial.',
    category: 'bankroll',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f014',
    front: 'O que é nut advantage e como ele difere de range advantage?',
    back: 'Range Advantage: sua range total tem mais equity que a do villain naquele board.\n\nNut Advantage: você tem proporcionalmente mais das mãos MAIS FORTES (sets, dois pares, nuts).\n\nExemplo: No flop J-T-9, o BB caller pode ter mais straights e dois pares que o UTG opener → BB tem nut advantage mesmo sem range advantage.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f015',
    front: 'O que é um downswing normal em NL cash game e como reagir?',
    back: 'Para um player vencedor com winrate 5bb/100:\n• Downswing de 15-25 buy-ins é estatisticamente normal\n• Não indica que você está jogando mal\n\nComo reagir:\n1. Revise mãos com solver (confirme que jogou certo)\n2. Não aumente volume "para recuperar"\n3. Considere descer de stake temporariamente\n4. Tire um dia de folga se estado mental estiver ruim',
    category: 'mental',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f016',
    front: 'Como identificar uma mesa lucrativa online?',
    back: 'Procure nas lobby stats:\n• VPIP médio da mesa > 28-30%\n• Flops vistos % > 25-30%\n• Pelo menos 1-2 players com VPIP > 40%\n• Potes médios maiores que normal\n\nFerramenta: Obs notes no HUD, poker tracker (PT4/HM3)\nDica: Sente no assento à esquerda do fish — você age depois dele em mais situações.',
    category: 'game-selection',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f017',
    front: 'O que é o conceito de "Pot Geometry" e por que importa no pós-flop?',
    back: 'Pot Geometry = planejar o tamanho de bets em múltiplas ruas para comprometer o stack do adversário de forma eficiente.\n\nExemplo com SPR 8 (stack = 8x pot):\n• Flop bet 50% → Pot dobra\n• Turn bet 67% → Pot dobra de novo\n• River bet 100% → Stack all-in natural\n\nPor que importa: Escolher sizing incoerente cria SPR estranho no river, forçando overbets ou underbets não-ideais.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f018',
    front: 'Qual é a diferença entre bluff com air e semi-bluff?',
    back: 'Air bluff: sua mão não tem equity real. Se chamado, perde na maioria das vezes. Requer fold equity alta.\n\nSemi-bluff: sua mão tem equity de draw (ex: flush draw 36%, OESD 32%). Mesmo se chamado, pode melhorar.\n\nPor que semi-bluffs são melhores: Funcionam de 2 maneiras — villain folda (ganhou) OU você melhora e ganha showdown. Mais EV que air bluff no geral.',
    category: 'conceitos',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f019',
    front: 'O que é "shot-taking" em BRM e quando fazer?',
    back: 'Shot-taking = jogar temporariamente um stake acima do normal para "experimentar".\n\nRegras para shot responsável:\n• Limite: máximo 2% do bankroll total\n• Máximo 1-2 sessões de shot por semana\n• Stop: se perder o shot, volte imediatamente ao stake normal\n• Critério: Tenha 20+ buy-ins para o stake atual E 10+ para o stake superior\n\nObjectivo: Testar o novo stake sem comprometer bankroll.',
    category: 'bankroll',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f020',
    front: 'Na bolha de um MTT, quando é correto foldar JJ?',
    back: 'Fold JJ na bolha é correto quando:\n1. Você está garantido de entrar no dinheiro se foldar (stack grande vs outros short stacks)\n2. É uma situação multiway (short stack all-in + big stack cold call)\n3. O custo de perder supera o benefício de ganhar chips em termos de $EV\n\nFold com JJ NÃO é correto quando:\n• Você é o short stack (precisa de chips)\n• É heads-up (boa equity vs 1 range)',
    category: 'torneio',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f021',
    front: 'Como calcular o máximo buy-in com R$3.000 de bankroll para cash game?',
    back: 'Regra: máximo 5% do bankroll por buy-in (20 buy-ins).\n\nR$3.000 ÷ 20 = R$150 por buy-in\n\nTabela de stakes online (BB = centavos):\n• R$150 buy-in → NL25 (25¢/50¢ blinds, buy-in R$25... espera, cada site varia)\n• Mais comum: max buy-in full = 100bb\n• Verifique a tabela do stake específico do seu site\n\nPor segurança, use 25 buy-ins: R$3.000 ÷ 25 = R$120/buy-in.',
    category: 'bankroll',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f022',
    front: 'O que é C-Bet (Continuation Bet) e quando fazer?',
    back: 'C-Bet = aposta no flop após ter sido o aggressor pré-flop.\n\nQuando fazer c-bet:\n✅ Board favorece sua range (você tem mais Aces em board A-x-x)\n✅ Villain tem range fraca (defesa de BB ou cold-caller passivo)\n✅ Você tem equity (pair, draw, overcards)\n\nQuando evitar c-bet:\n❌ Board favorece o caller (J-T-9 favore quem coldcalou)\n❌ Villain defende muito (high WTSD)\n❌ Você está em spot multiway (3+ players)',
    category: 'conceitos',
    difficulty: 2 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f023',
    front: 'O que significa WTSD% e como ajustar sua estratégia contra ele?',
    back: 'WTSD = Went to Showdown %. % de vezes que o player vai ao showdown após ver o flop.\n\n> 30%: Chama demais no pós-flop — bluff pouco, value-bete muito\n< 22%: Folda demais no pós-flop — bluff mais, especialmente no river\n23-28%: Razoável\n\nChave: Player com WTSD alto + VPIP alto = pesca maximizar value. Nunca bluff vs ele.',
    category: 'hud',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f024',
    front: 'O que é Equity Realization e por que mãos OOP realizam menos equity?',
    back: 'Equity Realization = quanto da sua equity teórica você consegue converter em winnings reais.\n\nOOP (Out Of Position) realiza MENOS porque:\n• Villain pode check-behind e ver carta grátis\n• Você não sabe o que villain vai fazer antes de agir\n• Villain pode bet-fold quando você está à frente\n\nExemplo: 54s tem ~38% equity vs range do villain, mas OOP pode realizar apenas ~30-32% — diferença que faz a mão não-lucrativa.\n\nPor isso: Mãos especulativas (conectores, pares pequenos) preferem posição.',
    category: 'conceitos',
    difficulty: 3 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
  {
    id: 'f025',
    front: 'Qual é a diferença entre um regular TAG e um fish?',
    back: 'TAG (Tight-Aggressive): VPIP 18-25%, PFR 15-22%, joga sólido\n• Difícil de exploitar, joga próximo do GTO\n• Prefira evitar pots grandes com ele sem edge claro\n\nFish (Loose-Passive): VPIP 40%+, PFR < 15%, chama demais\n• Value-bete mais grosso, não bluff\n• Procure sentar à esquerda dele para agir depois dele\n• Extraia valor com top-pairs, não precise de monsters',
    category: 'game-selection',
    difficulty: 1 as const,
    correctCount: 0,
    incorrectCount: 0,
  },
]

// ------- CONQUISTAS -------
// ============================================================
// ACHIEVEMENTS_DATA — 61 conquistas
// Ao adicionar novas conquistas: definir aqui + adicionar case em syncAchievements (store/index.ts)
// Categorias: start | streak | precision | volume | mastery | time | sessions | competition | content | level | xp | special
// ============================================================
export const ACHIEVEMENTS_DATA = [
  // ---- PRIMEIROS PASSOS ----
  { id: 'a001', category: 'start',     title: 'Primeiro Passo',       description: 'Complete sua primeira sessão de treino',         icon: '🎯', progress: 0, maxProgress: 1 },

  // ---- STREAK / CONSISTÊNCIA ----
  { id: 'a002', category: 'streak',    title: 'Em Chamas',            description: 'Mantenha 7 dias consecutivos de estudo',         icon: '🔥', progress: 0, maxProgress: 7 },
  { id: 'a007', category: 'streak',    title: 'Aquecendo',            description: 'Mantenha 3 dias consecutivos de estudo',         icon: '🌡️', progress: 0, maxProgress: 3 },
  { id: 'a008', category: 'streak',    title: 'Habitual',             description: 'Mantenha 14 dias consecutivos de estudo',        icon: '💪', progress: 0, maxProgress: 14 },
  { id: 'a009', category: 'streak',    title: 'Dedicado',             description: 'Mantenha 30 dias consecutivos de estudo',        icon: '🏆', progress: 0, maxProgress: 30 },
  { id: 'a010', category: 'streak',    title: 'Imparável',            description: 'Mantenha 60 dias consecutivos de estudo',        icon: '⚡', progress: 0, maxProgress: 60 },
  { id: 'a011', category: 'streak',    title: 'Lenda do Estudo',      description: 'Mantenha 100 dias consecutivos de estudo',       icon: '👑', progress: 0, maxProgress: 100 },

  // ---- PRECISÃO — ACERTOS CONSECUTIVOS ----
  { id: 'a003', category: 'precision', title: 'Precisão Cirúrgica',   description: 'Acerte 10 questões consecutivas',                icon: '🏹', progress: 0, maxProgress: 10 },
  { id: 'a012', category: 'precision', title: 'Sniper',               description: 'Acerte 20 questões consecutivas',                icon: '🎯', progress: 0, maxProgress: 20 },
  { id: 'a013', category: 'precision', title: 'Implacável',           description: 'Acerte 50 questões consecutivas',                icon: '💎', progress: 0, maxProgress: 50 },
  { id: 'a014', category: 'precision', title: 'Máquina GTO',          description: 'Acerte 100 questões consecutivas',               icon: '🤖', progress: 0, maxProgress: 100 },

  // ---- PRECISÃO — ACURÁCIA GERAL ----
  { id: 'a015', category: 'precision', title: 'Estudante Aplicado',   description: 'Atinja 60% de precisão geral',                   icon: '📊', progress: 0, maxProgress: 60 },
  { id: 'a016', category: 'precision', title: 'Jogador Sólido',       description: 'Atinja 70% de precisão geral',                   icon: '📈', progress: 0, maxProgress: 70 },
  { id: 'a017', category: 'precision', title: 'Sharp Player',         description: 'Atinja 80% de precisão geral',                   icon: '🎖️', progress: 0, maxProgress: 80 },
  { id: 'a018', category: 'precision', title: 'Nitão',                description: 'Atinja 85% de precisão geral',                   icon: '🔷', progress: 0, maxProgress: 85 },
  { id: 'a019', category: 'precision', title: 'GTO Bot',              description: 'Atinja 90% ou mais de precisão geral',           icon: '🦾', progress: 0, maxProgress: 90 },

  // ---- VOLUME — QUESTÕES TOTAIS ----
  { id: 'a020', category: 'volume',    title: 'Primeiras Respostas',  description: 'Responda 50 questões no total',                  icon: '📝', progress: 0, maxProgress: 50 },
  { id: 'a021', category: 'volume',    title: 'Treinando Firme',      description: 'Responda 100 questões no total',                 icon: '📖', progress: 0, maxProgress: 100 },
  { id: 'a022', category: 'volume',    title: '250 Respondidas',      description: 'Responda 250 questões no total',                 icon: '📚', progress: 0, maxProgress: 250 },
  { id: 'a023', category: 'volume',    title: 'Maratonista',          description: 'Responda 500 questões no total',                 icon: '🏃', progress: 0, maxProgress: 500 },
  { id: 'a024', category: 'volume',    title: 'Mil Questões',         description: 'Responda 1.000 questões no total',               icon: '💯', progress: 0, maxProgress: 1000 },
  { id: 'a025', category: 'volume',    title: 'Mestre do Volume',     description: 'Responda 2.500 questões no total',               icon: '🏋️', progress: 0, maxProgress: 2500 },
  { id: 'a026', category: 'volume',    title: 'Rei das Reps',         description: 'Responda 5.000 questões no total',               icon: '♾️', progress: 0, maxProgress: 5000 },

  // ---- DOMÍNIO — POR CENÁRIO ----
  { id: 'a004', category: 'mastery',   title: 'Ás do Pré-Flop',       description: 'Complete 100 drills de open raise',              icon: '♠',  progress: 0, maxProgress: 100 },
  { id: 'a027', category: 'mastery',   title: 'Caçador de 3-Bets',    description: 'Complete 100 questões de 3-bet',                 icon: '♣', progress: 0, maxProgress: 100 },
  { id: 'a028', category: 'mastery',   title: 'Push or Fold',         description: 'Complete 75 questões de push/fold',              icon: '💰', progress: 0, maxProgress: 75 },
  { id: 'a029', category: 'mastery',   title: 'Defensor do BB',       description: 'Complete 75 questões de defesa do BB',           icon: '🛡️', progress: 0, maxProgress: 75 },
  { id: 'a030', category: 'mastery',   title: 'SB vs BB Expert',      description: 'Complete 50 questões de SB vs BB',               icon: '⚔️', progress: 0, maxProgress: 50 },
  { id: 'a031', category: 'mastery',   title: 'Especialista Squeeze',  description: 'Complete 30 questões de squeeze',               icon: '🗜️', progress: 0, maxProgress: 30 },
  { id: 'a032', category: 'mastery',   title: '4-Bet Specialist',     description: 'Complete 30 questões de 4-bet',                  icon: '💥', progress: 0, maxProgress: 30 },
  { id: 'a033', category: 'mastery',   title: 'Call RFI Master',      description: 'Complete 50 questões de call vs raise',          icon: '📞', progress: 0, maxProgress: 50 },
  { id: 'a006', category: 'mastery',   title: 'Mestre Pós-Flop',      description: 'Complete 50 drills de pós-flop',                 icon: '🎲', progress: 0, maxProgress: 50 },

  // ---- TEMPO DE ESTUDO ----
  { id: 'a005', category: 'time',      title: 'Estudioso',            description: 'Estude por 10 horas totais',                    icon: '📚', progress: 0, maxProgress: 10 },
  { id: 'a034', category: 'time',      title: 'Aplicado',             description: 'Estude por 25 horas totais',                    icon: '📖', progress: 0, maxProgress: 25 },
  { id: 'a035', category: 'time',      title: 'Dedicado ao Estudo',   description: 'Estude por 50 horas totais',                    icon: '🎓', progress: 0, maxProgress: 50 },
  { id: 'a036', category: 'time',      title: 'Scholar do Poker',     description: 'Estude por 100 horas totais',                   icon: '🏛️', progress: 0, maxProgress: 100 },

  // ---- SESSÕES ----
  { id: 'a037', category: 'sessions',  title: 'Cinco em Campo',       description: 'Complete 5 sessões de treino',                   icon: '🎮', progress: 0, maxProgress: 5 },
  { id: 'a038', category: 'sessions',  title: 'Veterano de Sessão',   description: 'Complete 25 sessões de treino',                  icon: '🎖️', progress: 0, maxProgress: 25 },
  { id: 'a039', category: 'sessions',  title: 'Centenário',           description: 'Complete 100 sessões de treino',                 icon: '💯', progress: 0, maxProgress: 100 },
  { id: 'a040', category: 'sessions',  title: 'Profissional das Sessões', description: 'Complete 250 sessões de treino',             icon: '🃏', progress: 0, maxProgress: 250 },
  { id: 'a041', category: 'sessions',  title: 'Grão-Mestre das Sessões', description: 'Complete 500 sessões de treino',             icon: '🏆', progress: 0, maxProgress: 500 },

  // ---- COMPETIÇÃO ----
  { id: 'a042', category: 'competition', title: 'Primeira Batalha',   description: 'Jogue 1 partida no modo competição',             icon: '🏅', progress: 0, maxProgress: 1 },
  { id: 'a043', category: 'competition', title: 'Bronze Competidor',  description: 'Alcance score 50+ no modo competição',           icon: '🥉', progress: 0, maxProgress: 1 },
  { id: 'a044', category: 'competition', title: 'Prata Competidor',   description: 'Alcance score 150+ no modo competição',          icon: '🥈', progress: 0, maxProgress: 1 },
  { id: 'a045', category: 'competition', title: 'Ouro Competidor',    description: 'Alcance score 300+ no modo competição',          icon: '🥇', progress: 0, maxProgress: 1 },
  { id: 'a046', category: 'competition', title: 'Platina Competidor', description: 'Alcance score 500+ no modo competição',          icon: '💎', progress: 0, maxProgress: 1 },
  { id: 'a047', category: 'competition', title: 'Campeão Supremo',    description: 'Alcance score 700+ no modo competição',          icon: '🏆', progress: 0, maxProgress: 1 },

  // ---- CURSOS E FLASHCARDS ----
  { id: 'a048', category: 'content',   title: 'Leitor de Poker',      description: 'Complete 1 aula de um curso',                    icon: '📖', progress: 0, maxProgress: 1 },
  { id: 'a049', category: 'content',   title: 'Flashcard Warrior',    description: 'Revise 50 flashcards',                           icon: '🃏', progress: 0, maxProgress: 50 },
  { id: 'a050', category: 'content',   title: 'Flashcard Master',     description: 'Revise 200 flashcards',                          icon: '🎴', progress: 0, maxProgress: 200 },

  // ---- NÍVEIS ATINGIDOS ----
  { id: 'a051', category: 'level',     title: 'Sobe de Nível',        description: 'Alcance o nível 5',                             icon: '📈', progress: 0, maxProgress: 5 },
  { id: 'a052', category: 'level',     title: 'Meio Caminho',         description: 'Alcance o nível 10',                            icon: '⭐', progress: 0, maxProgress: 10 },
  { id: 'a053', category: 'level',     title: 'Veterano de Nível',    description: 'Alcance o nível 20',                            icon: '🌟', progress: 0, maxProgress: 20 },
  { id: 'a054', category: 'level',     title: 'Elite',                description: 'Alcance o nível 35',                            icon: '💎', progress: 0, maxProgress: 35 },
  { id: 'a055', category: 'level',     title: 'Lendário',             description: 'Alcance o nível 50',                            icon: '👑', progress: 0, maxProgress: 50 },

  // ---- XP ACUMULADO ----
  { id: 'a056', category: 'xp',        title: 'Primeiros Mil XP',     description: 'Acumule 1.000 XP no total',                     icon: '⚡', progress: 0, maxProgress: 1000 },
  { id: 'a057', category: 'xp',        title: 'Acumulador',           description: 'Acumule 5.000 XP no total',                     icon: '🔋', progress: 0, maxProgress: 5000 },
  { id: 'a058', category: 'xp',        title: 'Mestre do XP',         description: 'Acumule 25.000 XP no total',                    icon: '🌟', progress: 0, maxProgress: 25000 },
  { id: 'a059', category: 'xp',        title: 'Lenda de XP',          description: 'Acumule 100.000 XP no total',                   icon: '🌙', progress: 0, maxProgress: 100000 },

  // ---- ESPECIAIS / RAROS ----
  { id: 'a060', category: 'special',   title: 'Nitão Supremo',        description: '95%+ de precisão com 200+ questões respondidas', icon: '🎖️', progress: 0, maxProgress: 1 },
  { id: 'a061', category: 'special',   title: 'Maratonista do Dia',   description: 'Responda 100 questões em uma única sessão',       icon: '🌪️', progress: 0, maxProgress: 100 },
]
