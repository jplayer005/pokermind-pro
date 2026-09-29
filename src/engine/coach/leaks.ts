// ============================================================
// ENGINE: vazamentos. Cada decisao do coach cai num contexto (ex.: PF_OPEN_HJ);
// aqui ficam a taxa de erro por contexto, o ranking, a tendencia, a revisao
// espacada e o destino do treino direcionado. Puro: o store so guarda o estado.
// ============================================================
import { formatoPorId, posDisplay } from '../spotCatalog'
import { isLeak, type Grade } from './types'

export interface LeakStat {
  ctx: string
  /** Decisoes avaliadas neste contexto. */
  n: number
  /** Dessas, quantas foram imprecisao, erro ou erro grave. */
  leaks: number
  /** Perda estimada acumulada em bb (so decisoes com EV estimado). */
  evLossBB: number
  lastSeen: number
  /** Tag mais recente de vazamento neste contexto (ex.: PF_OPEN_HJ_TOO_LOOSE). */
  lastTag: string
  /** Ultimas 20 decisoes: '1' = vazamento, '0' = ok. */
  recent: string
  /** Revisao espacada: intervalo em dias e proxima data (AAAA-MM-DD). Vazio = nunca vazou. */
  interval: number
  nextReview: string
}

export interface DecisionInput {
  ctx: string
  tag: string
  grade: Grade
  evLossBB: number | null
}

const RECENT_MAX = 20
export const MIN_SAMPLE = 4

export function dateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** Aplica uma decisao a um contexto. Vazamento agenda revisao para amanha; acerto em revisao alonga o intervalo. */
export function recordDecision(prev: LeakStat | undefined, d: DecisionInput, now: Date = new Date()): LeakStat {
  const today = dateStr(now)
  const leak = isLeak(d.grade)
  const s: LeakStat = prev
    ? { ...prev }
    : { ctx: d.ctx, n: 0, leaks: 0, evLossBB: 0, lastSeen: 0, lastTag: '', recent: '', interval: 0, nextReview: '' }

  s.n += 1
  s.lastSeen = now.getTime()
  s.recent = (s.recent + (leak ? '1' : '0')).slice(-RECENT_MAX)

  if (leak) {
    s.leaks += 1
    s.lastTag = d.tag || s.lastTag
    if (d.evLossBB) s.evLossBB = Math.round((s.evLossBB + d.evLossBB) * 10) / 10
    s.interval = 1
    s.nextReview = addDays(today, 1)
  } else if (s.leaks > 0 && s.nextReview && today >= s.nextReview) {
    // acertou o contexto na hora da revisao: espaca mais (1, 2, 4, 8... ate 30 dias)
    s.interval = Math.min(Math.max(s.interval, 1) * 2, 30)
    s.nextReview = addDays(today, s.interval)
  }
  return s
}

export const leakRate = (s: LeakStat) => (s.n > 0 ? s.leaks / s.n : 0)

/** Contextos com vazamento, do pior para o menos grave. A amostra pequena pesa menos. */
export function rankLeaks(stats: Record<string, LeakStat>, minN = MIN_SAMPLE): LeakStat[] {
  return Object.values(stats)
    .filter((s) => s.leaks > 0 && s.n >= minN)
    .sort((a, b) => {
      const wa = leakRate(a) * Math.min(1, a.n / 10) + a.evLossBB / 100
      const wb = leakRate(b) * Math.min(1, b.n / 10) + b.evLossBB / 100
      return wb - wa
    })
}

/** 'down' = melhorando (menos vazamentos nas ultimas 10 que nas 10 anteriores). null = pouca amostra. */
export function trend(s: LeakStat): 'up' | 'down' | 'flat' | null {
  if (s.recent.length < 14) return null
  const last = s.recent.slice(-10)
  const before = s.recent.slice(0, -10)
  const rate = (t: string) => t.split('').filter((c) => c === '1').length / t.length
  const diff = rate(last) - rate(before)
  return diff > 0.1 ? 'up' : diff < -0.1 ? 'down' : 'flat'
}

/** Contextos que vazaram antes e estao na hora de revisar. */
export function dueLeaks(stats: Record<string, LeakStat>, today: string): LeakStat[] {
  return Object.values(stats).filter((s) => s.leaks > 0 && s.nextReview && s.nextReview <= today)
}

// ---------------------------------------------------------------- texto e destino

const STREET_PT: Record<string, string> = { FLOP: 'flop', TURN: 'turn', RIVER: 'river' }

export function labelFor(ctx: string): string {
  let m = ctx.match(/^PF_(PUSH|CALLSHOVE)_([^_]+)_(.+)_(\d+)BB$/)
  if (m) {
    const fmt = safeFormat(m[2])
    const pos = posDisplay(m[3])
    return m[1] === 'PUSH'
      ? `Push/fold ${fmt}, ${pos}, ${m[4]}bb`
      : `Pagar all-in ${fmt}, ${pos}, ${m[4]}bb`
  }
  m = ctx.match(/^PF_OPEN_(.+)$/)
  if (m) return m[1] === 'BB' ? 'Opção do BB (pote limpado)' : `Abrir o pote no ${m[1]}`
  m = ctx.match(/^PF_VSRAISE_(.+)$/)
  if (m) return m[1] === 'BB' ? 'Defender o BB contra aumento' : `Responder a aumento no ${m[1]}`
  m = ctx.match(/^PF_VS3BET_(.+)$/)
  if (m) return `Responder a 3-bet no ${m[1]}`
  m = ctx.match(/^POST_([A-Z]+)_(FACING|OPEN)$/)
  if (m) {
    const st = STREET_PT[m[1]] ?? m[1].toLowerCase()
    return m[2] === 'FACING' ? `Pós-flop no ${st}: pagar ou foldar diante de aposta` : `Pós-flop no ${st}: apostar ou dar check`
  }
  return ctx
}

function safeFormat(id: string): string {
  try {
    return formatoPorId(id).label
  } catch {
    return id
  }
}

export interface DrillTarget {
  path: string
  state: Record<string, unknown> | null
}

/** Para onde levar o jogador para treinar exatamente este contexto. */
export function drillTarget(ctx: string): DrillTarget {
  let m = ctx.match(/^PF_(?:PUSH|CALLSHOVE)_([^_]+)_(.+)_(\d+)BB$/)
  if (m) return { path: '/pushfold', state: { formatId: m[1], stack: Number(m[3]), autoStart: true } }
  m = ctx.match(/^PF_OPEN_/)
  if (m) return { path: '/preflop', state: { scenario: 'open_raise', mode: 'drill', autoStart: true } }
  m = ctx.match(/^PF_VSRAISE_(.+)$/)
  if (m) {
    return {
      path: '/preflop',
      state: { scenario: m[1] === 'BB' ? 'bb_defense' : 'vs_raise', mode: 'drill', autoStart: true },
    }
  }
  if (/^PF_VS3BET_/.test(ctx)) return { path: '/preflop', state: { scenario: '4bet', mode: 'drill', autoStart: true } }
  return { path: '/postflop', state: null }
}
