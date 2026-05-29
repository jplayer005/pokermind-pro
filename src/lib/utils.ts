import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Combina classes Tailwind de forma inteligente */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formata números grandes (1200 → 1.2k) */
export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

/** Formata percentual */
export function formatPercent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`
}

/** Formata tempo em minutos */
export function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ============================================================
// SISTEMA DE NÍVEIS PROGRESSIVO
// Tiers: cada 5 níveis formam um tier. Níveis 1-50 têm nomes únicos.
// XP por step: 500 (lvl 1-10) → 1k (11-20) → 2k (21-30) → 3.5k (31-40) → 5k (41-50) → …
// Compatibilidade: xpForStep(1..10) = 500 (idêntico ao sistema anterior)
// ============================================================

const TIER_NAMES = [
  '',            // 0 (não usado)
  'Iniciante',   // tier 1: níveis 1-5
  'Recreativo',  // tier 2: níveis 6-10
  'Amador',      // tier 3: níveis 11-15
  'Competidor',  // tier 4: níveis 16-20
  'Semi-Pro',    // tier 5: níveis 21-25
  'Profissional',// tier 6: níveis 26-30
  'Expert',      // tier 7: níveis 31-35
  'Mestre',      // tier 8: níveis 36-40
  'Grão-Mestre', // tier 9: níveis 41-45
  'Lendário',    // tier 10: níveis 46-50
]

const TIER_COLORS = [
  '',
  'text-gray-400',    // Iniciante
  'text-blue-400',    // Recreativo
  'text-emerald-400', // Amador
  'text-yellow-400',  // Competidor
  'text-orange-400',  // Semi-Pro
  'text-purple-400',  // Profissional
  'text-red-400',     // Expert
  'text-amber-400',   // Mestre
  'text-cyan-400',    // Grão-Mestre
  'text-white',       // Lendário
]

const TIER_ICONS = [
  '',
  '♣', '♦', '♥', '★', '◆',
  '♛', '🔥', '👑', '💎', '🃏',
]

const SUB_NAMES = ['I', 'II', 'III', 'IV', 'V']

export interface LevelData {
  level: number
  tier: number
  tierName: string
  subName: string
  fullName: string
  color: string
  icon: string
}

/** Retorna dados de exibição para qualquer nível (sem limite) */
export function getLevelData(level: number): LevelData {
  const lv = Math.max(1, level)
  const tier = Math.min(Math.ceil(lv / 5), 10)
  const subIdx = (lv - 1) % 5
  const tierName = TIER_NAMES[tier] || `Supremo ${Math.ceil(lv / 5) - 10}`
  const subName = SUB_NAMES[subIdx]
  const color = TIER_COLORS[tier] || 'text-yellow-300'
  const icon = TIER_ICONS[tier] || '🏆'
  return { level: lv, tier, tierName, subName, fullName: `${tierName} ${subName}`, color, icon }
}

/** XP necessário para avançar do nível N ao N+1 */
export function xpForStep(level: number): number {
  if (level <= 10)  return 500
  if (level <= 20)  return 1000
  if (level <= 30)  return 2000
  if (level <= 40)  return 3500
  if (level <= 50)  return 5000
  if (level <= 60)  return 7000
  if (level <= 70)  return 10000
  if (level <= 80)  return 14000
  if (level <= 90)  return 18000
  return 25000
}

/** XP acumulado total necessário para atingir o nível alvo (a partir do nível 1) */
export function totalXPForLevel(targetLevel: number): number {
  if (targetLevel <= 1) return 0
  let total = 0
  for (let i = 1; i < targetLevel; i++) total += xpForStep(i)
  return total
}

/** Deriva o nível a partir do XP total acumulado */
export function levelFromXP(totalXP: number): number {
  let level = 1
  let remaining = totalXP
  while (remaining >= xpForStep(level)) {
    remaining -= xpForStep(level)
    level++
    if (level > 9999) break // limite de segurança
  }
  return level
}

/** Progresso de XP para o próximo nível */
export function xpToNextLevel(currentXP: number): { current: number; needed: number; percent: number; level: number } {
  const level = levelFromXP(currentXP)
  const levelStart = totalXPForLevel(level)
  const needed = xpForStep(level)
  const current = Math.max(0, currentXP - levelStart)
  return { current, needed, percent: Math.min(current / needed, 1), level }
}

// ============================================================
// RECOMPENSAS DE XP
// Usar estas constantes em todo o app para consistência.
// ==== XP_HOOK: ao adicionar nova fonte de XP, defina aqui e use getDifficultyXPMultiplier ====
// ============================================================

export const XP_REWARDS = {
  CORRECT_STUDY: 10,       // questão correta modo estudo
  CORRECT_DRILL: 12,       // questão correta modo drill
  CORRECT_EXAM: 15,        // questão correta modo exame
  CORRECT_POSTFLOP: 10,    // acerto no pós-flop (por rua)
  CORRECT_POSTFLOP_ALT: 5, // ação alternativa aceitável no pós-flop
  SESSION_COMPLETE: 50,    // bônus por completar sessão (10+ questões)
  PERFECT_SESSION: 100,    // bônus sessão perfeita (100%, 15+ questões)
  // ==== XP_HOOK: LESSON_COMPLETE — chamar addXP(XP_REWARDS.LESSON_COMPLETE) ao completar aula em Study.tsx ====
  LESSON_COMPLETE: 200,
  // ==== XP_HOOK: COURSE_COMPLETE — chamar addXP(XP_REWARDS.COURSE_COMPLETE) ao concluir curso em Study.tsx ====
  COURSE_COMPLETE: 500,
  // ==== XP_HOOK: FLASHCARD_REVIEW — chamar addXP(XP_REWARDS.FLASHCARD_REVIEW * n) por n flashcards revisados ====
  FLASHCARD_REVIEW: 2,
  // ==== XP_HOOK: COMPETITION — XP de competição já calculado por score em PreflopTrainer ====
} as const

/** Multiplicador de XP por dificuldade */
export const DIFFICULTY_XP_MULTIPLIER = {
  easy:   1.2,
  medium: 1.0,
  hard:   0.75,
} as const

export function getDifficultyXPMultiplier(difficulty: 'easy' | 'medium' | 'hard'): number {
  return DIFFICULTY_XP_MULTIPLIER[difficulty] ?? 1.0
}

/** Delay para animações */
export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Shuffle de array */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
