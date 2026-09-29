// ============================================================
// ENGINE: coach. Avalia a decisao do heroi ANTES de ela ser aplicada.
//  - stack curto (<= 25bb): spots push/fold resolvidos (Nash/ICM), pela frequencia;
//  - pre-flop com stack normal: jogada de referencia por ranges (faixa, sem EV);
//  - pos-flop: equity contra um range suposto do vilao (estimativa, marcada approx).
// Nao e um solver: as notas de pos-flop e de ranges sao aproximacoes de treino.
// ============================================================
import { canonical169, type Rng } from '../cards'
import { equityVsCombos } from '../equity'
import { legalActions, positionsBySeat, potTotal } from '../game/reducer'
import type { Action, GameState, LegalActions } from '../game/types'
import { combosUpToPercentile, preflopReference } from '../bots/policy'
import { profileOf } from '../bots/profiles'
import { peekSpots } from '../spots'
import { formatoPorId, nearestStack, type SpotRef } from '../spotCatalog'
import { gradePushFold, explainPushFold } from './pushfold'
import { isLeak, type Grade, type GradedDecision, type Kind } from './types'

const round1 = (n: number) => Math.round(n * 10) / 10
const pct = (x: number) => `${Math.round(x * 100)}%`

function kindOf(a: Action): Kind {
  return a.type === 'fold' ? 'fold' : a.type === 'check' ? 'check' : a.type === 'call' ? 'call' : 'raise'
}

const LABEL: Record<Kind, string> = { fold: 'Fold', check: 'Check', call: 'Call', raise: 'Bet/Raise' }

/** Nota por perda estimada em bb (so quando a acao tomada difere da melhor). */
function gradeByLoss(lossBB: number): Grade {
  if (lossBB <= 0.5) return 'good'
  if (lossBB <= 1.5) return 'inaccuracy'
  if (lossBB <= 4) return 'mistake'
  return 'blunder'
}

export interface GradeContext {
  /** Sit&Go: usa os spots ICM do solver (sng6_top2 / sng9_top2) quando a mesa esta cheia. */
  sng?: boolean
}

export function gradeDecision(
  state: GameState, action: Action, rng: Rng = Math.random, ctx: GradeContext = {},
): GradedDecision {
  const seat = state.seats[state.toAct]
  const la = legalActions(state)
  const hole = seat.cards as [number, number]
  const base = {
    handNumber: state.handNumber,
    street: state.street,
    took: kindOf(action),
    potBefore: potTotal(state),
    toCall: la.callAmount,
    hole,
    board: [...state.board],
  }
  return state.street === 'preflop'
    ? gradePreflop(state, action, la, base, ctx)
    : gradePostflop(state, action, la, base, rng)
}

type Base = Pick<GradedDecision, 'handNumber' | 'street' | 'took' | 'potBefore' | 'toCall' | 'hole' | 'board'>

// ---------------------------------------------------------------- pre-flop

const POS_KEY: Record<string, string> = { 'UTG+1': 'UTG1', 'UTG+2': 'MP' }

function gradePreflop(
  state: GameState, action: Action, la: LegalActions, base: Base, ctx: GradeContext,
): GradedDecision {
  const seat = state.seats[state.toAct]
  const bb = state.cfg.bb
  const posLabel = positionsBySeat(state)[seat.id] ?? 'BTN'
  const n = state.seats.filter((x) => !x.out).length
  const hand = canonical169(base.hole[0], base.hole[1])

  // ---- stack curto: spots push/fold
  const bank = peekSpots()
  const others = state.seats.filter((x) => !x.out && !x.folded && x.id !== seat.id)
  const eff = Math.min(seat.stack + seat.bet, Math.max(...others.map((x) => x.stack + x.bet), 0)) / bb
  const raiseEvents = state.history.filter((e) => e.street === 'preflop' && e.type === 'raise')
  const limps = state.history.filter((e) => e.street === 'preflop' && e.type === 'call').length

  if (bank && eff <= 25 && eff >= 2) {
    const sngIcm = !!ctx.sng && (n === 6 || n === 9)
    const prefix = sngIcm ? (n === 6 ? 'sng6_top2' : 'sng9_top2') : n === 2 ? 'HU' : n <= 6 ? '6max' : '9max'
    const bucket = nearestStack(eff)
    const heroKey = n === 2 ? (posLabel === 'BTN' ? 'SB' : 'BB') : (POS_KEY[posLabel] ?? posLabel)
    let ref: SpotRef | null = null

    if (raiseEvents.length === 0 && limps === 0 && la.canCall) {
      ref = { id: `${prefix}:${bucket}:${heroKey}`, hero: heroKey, acao: 'push', shover: heroKey }
    } else if (raiseEvents.length === 1 && state.seats[raiseEvents[0].seat].allIn) {
      const sh = positionsBySeat(state)[raiseEvents[0].seat] ?? ''
      const shKey = n === 2 ? (sh === 'BTN' ? 'SB' : 'BB') : (POS_KEY[sh] ?? sh)
      ref = {
        id: n === 2 ? `${prefix}:${bucket}:BB` : `${prefix}:${bucket}:${heroKey}_vs_${shKey}`,
        hero: heroKey, acao: 'call', shover: shKey,
      }
    }
    const spot = ref ? bank.get(ref.id) : undefined
    if (ref && spot) {
      const aggressive = base.took === 'raise' || (ref.acao === 'call' && base.took === 'call')
      const ev = gradePushFold(spot, hand, aggressive)
      const grade: Grade =
        ev.grade === 'correct' ? (ev.pChosen >= 0.95 ? 'best' : 'good')
        : ev.grade === 'acceptable' ? 'good'
        : ev.pChosen === 0 ? 'blunder' : 'mistake'
      const fmtId = sngIcm ? (n === 6 ? 'sng6' : 'sng9') : prefix === 'HU' ? 'hu' : prefix
      const best: Kind = ev.best === 'aggressive' ? (ref.acao === 'push' ? 'raise' : 'call') : 'fold'
      const leak = isLeak(grade)
      return {
        ...base, best, grade, evLossBB: null, approx: false,
        tag: leak ? `PF_${ref.acao === 'push' ? 'PUSH' : 'CALLSHOVE'}_${heroKey}_${bucket}BB` : '',
        explain: explainPushFold(spot, ref, formatoPorId(fmtId), bucket, hand, ev),
      }
    }
  }

  // ---- stack normal: jogada de referencia por ranges
  const ref = preflopReference(state)
  const took = base.took
  const m = Math.abs(ref.pct - ref.cutoff) / Math.max(ref.cutoff, 0.02)
  const tight = (took === 'fold' || took === 'check') && (ref.best === 'raise' || ref.best === 'call')
  const loose = (took === 'raise' || took === 'call') && (ref.best === 'fold' || ref.best === 'check')

  let grade: Grade = 'best'
  if (took !== ref.best) {
    if (m < 0.2) grade = 'good'
    else if (tight) grade = ref.pct < 0.03 ? 'blunder' : m < 0.6 ? 'inaccuracy' : 'mistake'
    else if (loose) grade = took === 'call' || m < 0.6 ? 'inaccuracy' : 'mistake'
    else grade = 'good' // pagar onde faria 3-bet, ou 3-bet onde pagaria: linhas aceitaveis
  }

  const sit = ref.situation === 'open' || ref.situation === 'bb_option' ? 'OPEN' : ref.situation === 'vs_raise' ? 'VSRAISE' : 'VS3BET'
  const dir = tight ? 'TOO_TIGHT' : loose ? 'TOO_LOOSE' : 'OFF_LINE'
  const leak = isLeak(grade)

  return {
    ...base,
    best: ref.best,
    grade,
    evLossBB: null,
    approx: false,
    tag: leak ? `PF_${sit}_${ref.pos}_${dir}` : '',
    explain: explainPreflop(ref, hand, base.took, grade),
  }
}

function explainPreflop(ref: ReturnType<typeof preflopReference>, hand: string, took: Kind, grade: Grade): string[] {
  const out: string[] = []
  const topPct = Math.max(1, Math.round(ref.pct * 100))
  const cutPct = Math.round(ref.cutoff * 100)
  const pos = ref.pos
  switch (ref.situation) {
    case 'open':
      out.push(
        ref.best === 'raise'
          ? `${hand} está no range de abertura do ${pos} (cerca de ${cutPct}% das mãos).`
          : `${hand} está fora do range de abertura do ${pos} (cerca de ${cutPct}% das mãos). Sem aumento antes de você, o normal é foldar.`,
      )
      break
    case 'bb_option':
      out.push(
        ref.best === 'raise'
          ? `${hand} é forte o bastante (top ${topPct}%) para aumentar na opção do BB.`
          : `Com ${hand} (top ${topPct}%), o normal é dar check na opção do BB.`,
      )
      break
    case 'vs_raise':
      out.push(
        ref.best === 'raise'
          ? `${hand} está no range de 3-bet do ${pos}.`
          : ref.best === 'call'
            ? `${hand} (top ${topPct}%) entra no range de call do ${pos} contra esse aumento (até cerca de top ${cutPct}%).`
            : `${hand} (top ${topPct}%) está fora do range de call do ${pos} (até cerca de top ${cutPct}%). Contra um aumento, foldar é o padrão.`,
      )
      break
    case 'vs_3bet':
      out.push(
        ref.best === 'raise'
          ? `${hand} está no range de 4-bet.`
          : ref.best === 'call'
            ? `${hand} é forte o bastante para pagar o 3-bet.`
            : `${hand} não sustenta um 3-bet. Só as mãos mais fortes continuam.`,
      )
      break
  }
  if (took !== ref.best) {
    out.push(
      grade === 'good'
        ? `Sua jogada (${LABEL[took]}) é uma linha aceitável, mas a referência aqui é ${LABEL[ref.best]}.`
        : `Referência: ${LABEL[ref.best]}. Você fez ${LABEL[took]}.`,
    )
  } else {
    out.push(`Jogada de referência: ${LABEL[ref.best]}.`)
  }
  out.push('Baseado nos ranges do app, sem EV exato.')
  return out
}

// ---------------------------------------------------------------- pos-flop

export function estimateVillainWidth(state: GameState, facing: boolean, toCall: number, pot: number): number {
  const seat = state.seats[state.toAct]
  const lastRaise = [...state.history].reverse().find((e) => e.type === 'raise' && e.seat !== seat.id)
  const loose = lastRaise ? profileOf(state.seats[lastRaise.seat].profile).looseness : 1
  const bb = state.cfg.bb
  if (facing) {
    const frac = toCall / Math.max(pot - toCall, bb)
    return Math.min(0.85, Math.max(0.12, (0.52 - 0.22 * Math.min(1.2, frac)) * loose))
  }
  return Math.min(0.9, Math.max(0.2, 0.6 * loose))
}

function gradePostflop(
  state: GameState, action: Action, la: LegalActions, base: Base, rng: Rng,
): GradedDecision {
  const seat = state.seats[state.toAct]
  const bb = state.cfg.bb
  const pot = base.potBefore
  const facing = la.canCall
  const toCall = la.callAmount
  const took = base.took
  const S = state.street.toUpperCase()
  const foes = Math.max(1, state.seats.filter((x) => !x.out && !x.folded).length - 1)

  const width = estimateVillainWidth(state, facing, toCall, pot)
  const combos = combosUpToPercentile(width, [...base.hole, ...state.board])
  const raw = equityVsCombos(base.hole, combos, state.board, 700, rng).equity
  const eq = Math.pow(raw, 1 + 0.7 * (foes - 1))
  const needed = facing ? toCall / (pot + toCall) : 0
  const bbs = (c: number) => `${round1(c / bb)} bb`

  const ctx = [
    `Equity estimada: ${pct(eq)} contra o top ${Math.round(width * 100)}% das mãos${foes > 1 ? ` (${foes} oponentes)` : ''}. Estimativa, não solver.`,
  ]

  let best: Kind
  let loss = 0 // em fichas
  let tag = ''
  const why: string[] = []

  if (facing) {
    const evCall = eq * (pot + toCall) - toCall
    ctx.push(`Para pagar você arrisca ${bbs(toCall)} para ganhar ${bbs(pot)}: precisa de ${pct(needed)} de equity.`)
    best = eq >= 0.72 && la.canRaise ? 'raise' : evCall > 0 ? 'call' : 'fold'
    if (took === 'fold') {
      loss = Math.max(0, evCall)
      if (best !== 'fold') { tag = `POST_${S}_FOLD_TOO_MUCH`; why.push(`Pagar tinha EV positivo (cerca de +${bbs(evCall)}). Fold jogou isso fora.`) }
    } else if (took === 'call') {
      loss = Math.max(0, -evCall)
      if (best === 'fold') { tag = `POST_${S}_CALL_LIGHT`; why.push(`Pagar perde cerca de ${bbs(-evCall)} em média: sua equity fica abaixo do necessário.`) }
    } else {
      // raise diante de aposta
      if (eq >= 0.72) loss = 0
      else if (eq >= needed + 0.05) loss = 0.2 * pot // ok, mas perde um pouco de controle
      else { loss = Math.max(0, -evCall) + 0.05 * pot; tag = `POST_${S}_WEAK_RAISE`; why.push('Aumentar sem equity nem mão forte costuma custar caro; foldar ou pagar tende a ser melhor.') }
    }
  } else {
    if (la.canCheck) {
      best = eq >= 0.62 ? 'raise' : 'check'
      const size = action.type === 'raise' ? action.to - seat.bet : 0
      if (took === 'fold') {
        loss = Math.max(0.5 * bb, 0.35 * eq * pot)
        tag = `POST_${S}_FOLD_FREE_CHECK`
        why.push('Check é de graça: foldar joga fora a equity da sua mão.')
      } else if (took === 'check') {
        if (eq >= 0.68) {
          loss = 0.3 * (eq - 0.55) * pot
          tag = `POST_${S}_MISSED_VALUE`
          why.push('Mão forte: apostar por valor rende mais do que o check.')
        }
      } else if (eq < 0.45) {
        if (eq < 0.25) loss = 0 // blefe puro: valido, depende de frequencia
        else { loss = 0.15 * pot; tag = `POST_${S}_WEAK_BET`; why.push('Mão com algum valor de showdown, mas sem força para apostar por valor nem para blefar bem.') }
      } else if (size > 1.3 * pot && eq < 0.7) {
        loss = 0.15 * pot
        tag = `POST_${S}_OVERBET`
        why.push('Aposta grande demais para essa força de mão.')
      }
    } else {
      best = 'check'
    }
  }

  const lossBB = loss / bb
  let grade: Grade = took === best ? 'best' : gradeByLoss(lossBB)
  // mesma categoria de acao (ex.: call vs raise com equity alta) nao deve punir
  if (took !== best && lossBB <= 0.05) grade = 'good'
  const leak = isLeak(grade)
  if (!leak) tag = ''

  const verdict =
    took === best
      ? `Jogada de referência: ${LABEL[best]}.`
      : `Referência: ${LABEL[best]}.${lossBB >= 0.1 ? ` Perda estimada: cerca de ${round1(lossBB)} bb.` : ''}`

  return {
    ...base,
    best,
    grade,
    evLossBB: took === best ? 0 : round1(lossBB),
    approx: true,
    equity: eq,
    needed: facing ? needed : undefined,
    tag,
    explain: [...ctx, ...why, verdict],
  }
}
