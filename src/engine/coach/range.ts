// ============================================================
// ENGINE: range suposto do vilao no pos-flop, construido pelas ACOES dele.
//  1. pre-flop: abriu / pagou / 3-bet+ / so viu o flop -> largura inicial (por perfil);
//  2. a cada rua: aposta/raise mantem a parte mais forte NAQUELE board (mais apertado quanto
//     maior a aposta, com os draws mantidos como semi-blefe); call tira o topo e o ar;
//     check tira o topo (checar mao muito forte e raro) e mantem o resto.
// E uma estimativa de treino, nao um solver: o coach marca o resultado como aproximado.
// ============================================================
import { rankOf, suitOf } from '../cards'
import type { Combo } from '../equity'
import { evaluate } from '../evaluator'
import type { GameState, HandEvent, Street } from '../game/types'
import { preflopRangeFor } from './preflopRange'

export interface VillainRange {
  combos: Combo[]
  /** Assento do vilao considerado (o agressor mais recente, ou o que mais investiu). */
  seat: number
  /** Descricao curta de como o range foi montado, para a explicacao do coach. */
  steps: string[]
}

const STREET_ORDER: Street[] = ['preflop', 'flop', 'turn', 'river']
const streetIdx = (s: Street) => STREET_ORDER.indexOf(s)
const BOARD_LEN: Record<string, number> = { flop: 3, turn: 4, river: 5 }

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))


/** Flush draw (4 do mesmo naipe com uma carta da mao) ou straight draw (4 de 5 ranks seguidos). */
export function hasDraw(combo: Combo, board: readonly number[]): boolean {
  if (board.length >= 5) return false
  const cards = [...combo, ...board]
  const bySuit = [0, 0, 0, 0]
  for (const c of cards) bySuit[suitOf(c)]++
  for (let s = 0; s < 4; s++) {
    if (bySuit[s] === 4 && combo.some((c) => suitOf(c) === s)) return true
  }
  // bit 0 = As baixo (roda), bits 1..13 = 2..A
  let mask = 0
  for (const c of cards) mask |= 1 << (rankOf(c) + 1)
  if (mask & (1 << 13)) mask |= 1
  for (let lo = 0; lo <= 9; lo++) {
    const win = (mask >> lo) & 31
    let n = 0
    for (let k = 0; k < 5; k++) n += (win >> k) & 1
    if (n === 4 && combo.some((c) => { const r = rankOf(c) + 1; return (r >= lo && r < lo + 5) || (rankOf(c) === 12 && lo === 0) })) return true
  }
  return false
}

/** O vilao aumentou numa rua pos-flop posterior a `st`? (pagou antes e voltou agressivo) */
function raisedLater(state: GameState, vid: number, st: Street): boolean {
  return state.history.some(
    (e) => e.seat === vid && e.type === 'raise' && e.street !== 'preflop' && streetIdx(e.street) > streetIdx(st),
  )
}

/** Aposta relativa ao pote que ela enfrentava (pote + o que havia para pagar). */
function betFraction(e: HandEvent, bb: number): number {
  return clamp(e.amount / Math.max(e.potBefore + e.toCall, bb), 0, 3)
}

interface Scored { combo: Combo; score: number; draw: boolean }

function score(combos: Combo[], board: readonly number[]): Scored[] {
  return combos.map((combo) => ({
    combo,
    score: evaluate([...combo, ...board]),
    draw: hasDraw(combo, board),
  }))
}

/** Quem e o vilao principal: agressor mais recente; sem agressao, o que mais colocou no pote. */
function pickVillain(state: GameState, hero: number): number | null {
  const live = state.seats.filter((s) => !s.out && !s.folded && s.id !== hero)
  if (live.length === 0) return null
  const liveIds = new Set(live.map((s) => s.id))
  const aggr = [...state.history].reverse().find((e) => e.type === 'raise' && liveIds.has(e.seat))
  if (aggr) return aggr.seat
  return live.reduce((best, s) => (s.total > best.total ? s : best), live[0]).id
}

export function buildVillainRange(state: GameState): VillainRange | null {
  const hero = state.toAct
  const vid = pickVillain(state, hero)
  if (vid === null) return null
  const bb = state.cfg.bb
  const dead = new Set<number>([...(state.seats[hero].cards as number[]), ...state.board])
  const steps: string[] = []

  // ---- pre-flop
  const pf = preflopRangeFor(state, vid, dead)
  steps.push(pf.step)
  let combos = pf.combos

  // ---- ruas pos-flop ate agora
  for (const st of ['flop', 'turn', 'river'] as Street[]) {
    if (streetIdx(st) >= streetIdx(state.street)) break
    const board = state.board.slice(0, BOARD_LEN[st])
    const acts = state.history.filter((e) => e.street === st && e.seat === vid)
    if (acts.length === 0) continue
    const last = acts[acts.length - 1]
    const sc = score(combos.filter((c) => !board.includes(c[0]) && !board.includes(c[1])), board)
    if (sc.length < 12) break
    const order = [...sc].sort((a, b) => b.score - a.score)
    const name = st === 'flop' ? 'flop' : st === 'turn' ? 'turn' : 'river'
    let kept: Scored[]
    if (last.type === 'raise') {
      const f = betFraction(last, bb)
      // aposta pequena: range largo; grande: polarizado/forte. Draws seguem como semi-blefe.
      const keep = clamp(0.72 - 0.3 * Math.min(1.5, f), 0.22, 0.72)
      const cut = order[Math.max(0, Math.ceil(order.length * keep) - 1)].score
      kept = sc.filter((x) => x.score >= cut || (x.draw && st !== 'river'))
      steps.push(`apostou ${Math.round(f * 100)}% do pote no ${name}`)
    } else if (last.type === 'call') {
      const top = order[Math.floor(order.length * 0.1)].score
      const bottom = order[Math.min(order.length - 1, Math.floor(order.length * 0.7))].score
      if (raisedLater(state, vid, st)) {
        // pagou e depois voltou aumentando: o topo que "teria aumentado" volta (slowplay)
        kept = sc.filter((x) => x.score >= bottom || x.draw)
        steps.push(`só pagou no ${name} e depois aumentou (pode ser slowplay)`)
      } else {
        kept = sc.filter((x) => (x.score <= top && x.score >= bottom) || x.draw)
        steps.push(`pagou uma aposta no ${name}`)
      }
    } else {
      const top = order[Math.floor(order.length * 0.08)].score
      kept = sc.filter((x) => x.score <= top)
      steps.push(`deu check no ${name}`)
    }
    if (kept.length >= 8) combos = kept.map((x) => x.combo)
  }

  // ---- acao atual do vilao na rua em que o heroi decide (aposta que ele enfrenta)
  if (state.street !== 'preflop') {
    const board = [...state.board]
    const now = state.history.filter((e) => e.street === state.street && e.seat === vid)
    const last = now[now.length - 1]
    if (last && last.type === 'raise') {
      const sc = score(combos.filter((c) => !board.includes(c[0]) && !board.includes(c[1])), board)
      if (sc.length >= 12) {
        const f = betFraction(last, bb)
        const order = [...sc].sort((a, b) => b.score - a.score)
        // quem so pagou nas ruas anteriores e agora aposta/aumenta tem, em geral, mao bem mais forte
        const earlier = state.history.filter((e) => e.seat === vid && e.street !== 'preflop' && e.street !== state.street)
        const passive = earlier.some((e) => e.type === 'call') && !earlier.some((e) => e.type === 'raise')
        const keep = clamp((0.7 - 0.3 * Math.min(1.5, f)) * (passive ? 0.7 : 1), 0.14, 0.7)
        const cut = order[Math.max(0, Math.ceil(order.length * keep) - 1)].score
        const kept = sc.filter((x) => x.score >= cut || (x.draw && board.length < 5))
        if (kept.length >= 8) combos = kept.map((x) => x.combo)
        steps.push(`apostou ${Math.round(f * 100)}% do pote agora${passive ? ' depois de só pagar antes' : ''}`)
      }
    }
  }

  const alive = combos.filter((c) => !dead.has(c[0]) && !dead.has(c[1]))
  if (alive.length < 6) return null
  return { combos: alive, seat: vid, steps }
}

/** Frase para o coach: como o range foi montado e quanto ele cobre das maos possiveis. */
export function describeRange(r: VillainRange, deadCount: number): string {
  const total = ((52 - deadCount) * (51 - deadCount)) / 2
  const share = Math.max(1, Math.round((r.combos.length / total) * 100))
  const path = r.steps.length ? `Ele ${r.steps.join(', ')}` : 'Sem ações dele'
  return `${path}: cerca de ${share}% das mãos restantes.`
}

