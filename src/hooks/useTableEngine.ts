// ============================================================
// Liga o motor puro (src/engine) ao React: estado da mesa, turnos dos bots,
// coach, HUD, proxima mao e resultado da sessao. Nao tem regra de poker aqui.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAction, createGame, legalActions, startHand } from '@/engine/game/reducer'
import { decideBot } from '@/engine/bots/policy'
import { updateHud, type HudStats } from '@/engine/bots/hud'
import { gradeDecision } from '@/engine/coach/grade'
import { isLeak, type GradedDecision } from '@/engine/coach/types'
import { toSavedHand } from '@/engine/game/replay'
import { loadSpots } from '@/engine/spots'
import { loadEquity169 } from '@/engine/equity169'
import { playSfx } from '@/lib/sfx'
import { runoutDurationMs } from '@/hooks/useRunoutBoard'
import { pickProfiles } from '@/engine/bots/profiles'
import { advanceAfterHand, icmPressure, type TournamentConfig, type TournamentState } from '@/engine/game/tournament'
import { useHandsStore, useLeakStore } from '@/store'
import type { Action, GameConfig, GameState, PlayerInit } from '@/engine/game/types'

export type Speed = 'slow' | 'normal' | 'fast'
/** off: sem coach. after: so a revisao depois da mao. live: aviso rapido apos cada jogada + revisao. */
export type CoachMode = 'off' | 'after' | 'live'

const BOT_DELAY: Record<Speed, [number, number]> = {
  slow: [1100, 1900],
  normal: [600, 1200],
  fast: [150, 350],
}
const NEXT_HAND_DELAY: Record<Speed, number> = { slow: 4500, normal: 3200, fast: 1400 }

export interface TableOptions {
  players: PlayerInit[]
  cfg: GameConfig
  /** Fichas de recompra (cash). */
  buyIn: number
  speed: Speed
  autoNext: boolean
  /** Tempo para o heroi agir, em segundos. 0 = sem limite. Ao estourar: check se der, senao fold. */
  timebankSec: number
  coach: CoachMode
  modeId: string
  modeLabel: string
  /** Torneio (SNG/MTT): sem recompra, blinds sobem por nivel e ha eliminacoes. */
  tournament?: { config: TournamentConfig; initial: TournamentState }
}

export interface Session {
  hands: number
  /** Ganho/perda do heroi em fichas, ja descontadas as recompras. */
  net: number
  rebuys: number
}

export interface Review {
  game: GameState
  decisions: GradedDecision[]
  savedId: string | null
  flagged: boolean
}

export interface LastGrade {
  d: GradedDecision
  key: number
}

export function useTableEngine(opts: TableOptions) {
  const [game, setGame] = useState<GameState>(() => createGame(opts.players, opts.cfg, 0))
  const [archive, setArchive] = useState<GameState[]>([])
  const [session, setSession] = useState<Session>({ hands: 0, net: 0, rebuys: 0 })
  const [reviews, setReviews] = useState<Review[]>([])
  const [lastGrade, setLastGrade] = useState<LastGrade | null>(null)
  const [hud, setHud] = useState<Record<number, HudStats>>({})
  const [tour, setTour] = useState<TournamentState | null>(() => opts.tournament?.initial ?? null)
  const tourRef = useRef(tour)
  tourRef.current = tour
  const gameRef = useRef(game)
  gameRef.current = game
  const optsRef = useRef(opts)
  optsRef.current = opts
  const reviewsRef = useRef<Review[]>([])
  reviewsRef.current = reviews
  const decisionsRef = useRef<GradedDecision[]>([])
  const counted = useRef(0)

  const heroId = game.seats.findIndex((s) => s.isHero)

  // o coach de stack curto usa os spots push/fold: carrega o chunk em segundo plano
  useEffect(() => {
    if (opts.coach !== 'off') {
      void loadSpots()
      void loadEquity169()
    }
  }, [opts.coach])

  const nextHand = useCallback(() => {
    const cur = gameRef.current
    if (!cur.over) return
    const o = optsRef.current
    // torneio: sem recompra; ao terminar, nao ha proxima mao
    if (tourRef.current) {
      if (tourRef.current.done) return
      decisionsRef.current = []
      setGame(startHand(cur))
      return
    }
    let rebuys = 0
    const seats = cur.seats.map((s) => {
      if (s.stack >= o.cfg.bb) return s
      if (s.isHero) rebuys++
      return { ...s, stack: o.buyIn }
    })
    if (rebuys > 0) setSession((x) => ({ ...x, rebuys: x.rebuys + rebuys }))
    decisionsRef.current = []
    setGame(startHand({ ...cur, seats }))
  }, [])

  // primeira mao
  useEffect(() => {
    nextHand()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // turno dos bots
  useEffect(() => {
    if (game.over || game.toAct < 0) return
    const seat = game.seats[game.toAct]
    if (seat.isHero) return
    const [lo, hi] = BOT_DELAY[opts.speed]
    const t = setTimeout(() => {
      const g = gameRef.current
      if (g.over || g.toAct !== seat.id) return
      const t = tourRef.current
      const live = g.seats.filter((x) => !x.out)
      const avg = live.length ? live.reduce((a, x) => a + x.stack + x.bet, 0) / live.length : 0
      const pressure = t ? icmPressure(t, seat.stack + seat.bet, avg) : 0
      setGame(applyAction(g, decideBot(g, Math.random, pressure)))
    }, lo + Math.random() * (hi - lo))
    return () => clearTimeout(t)
  }, [game, opts.speed])

  // fim de mao: contabiliza, atualiza HUD, arquiva, salva no Replayer quando vale a pena
  useEffect(() => {
    if (!game.over || !game.result || game.handNumber === counted.current) return
    counted.current = game.handNumber
    const o = optsRef.current
    const net = heroId >= 0 ? game.result.net[heroId] : 0
    setSession((x) => ({ ...x, hands: x.hands + 1, net: x.net + net }))
    setArchive((a) => [game, ...a].slice(0, 8))
    setHud((h) => updateHud(h, game))

    const decisions = decisionsRef.current
    decisionsRef.current = []
    let savedId: string | null = null
    if (o.coach !== 'off' && decisions.length > 0) {
      const heroSeat = game.seats[heroId]
      const big = Math.abs(net) >= 10 * o.cfg.bb
      const wentToShowdown = game.result.showdown && !!heroSeat && !heroSeat.folded
      if (decisions.some((d) => isLeak(d.grade)) || big || wentToShowdown) {
        const saved = toSavedHand(game, decisions, o.modeId, o.modeLabel)
        useHandsStore.getState().savePlayedHand(saved)
        savedId = saved.id
      }
    }
    if (decisions.length > 0) {
      setReviews((r) => [{ game, decisions, savedId, flagged: false }, ...r].slice(0, 8))
    }

    // torneio: registra eliminacoes, simula o campo, sobe o nivel e reabastece a mesa
    const t = tourRef.current
    if (t && !t.done) {
      const out = advanceAfterHand(t, game, Math.random, () => pickProfiles(1)[0])
      setTour(out.tour)
      setGame(out.game)
    }
  }, [game, heroId])

  useEffect(() => {
    if (!game.over || game.gameOver || !opts.autoNext || game.handNumber === 0) return
    if (tour?.done) return
    const t = setTimeout(nextHand, NEXT_HAND_DELAY[opts.speed] + runoutDurationMs(game))
    return () => clearTimeout(t)
  }, [game, tour, opts.autoNext, opts.speed, nextHand])

  const act = useCallback((action: Action, auto = false) => {
    const g = gameRef.current
    if (g.over || g.toAct < 0 || !g.seats[g.toAct].isHero) return
    if (optsRef.current.coach !== 'off' && !auto) {
      // a nota e calculada com o estado ANTES da jogada
      const d = gradeDecision(g, action, Math.random, { sng: optsRef.current.tournament?.config.kind === 'sng' })
      decisionsRef.current.push(d)
      setLastGrade({ d, key: Date.now() })
      useLeakStore.getState().record({ ctx: d.ctx, tag: d.tag, grade: d.grade, evLossBB: d.evLossBB })
    }
    playSfx(action.type === 'fold' ? 'fold' : action.type === 'check' ? 'deal' : 'chip')
    setGame(applyAction(g, action))
  }, [])

  /** Salva a mao no Replayer (se ainda nao estiver) e, opcionalmente, marca para revisar. */
  const saveReview = useCallback((handNumber: number, flag: boolean) => {
    const r = reviewsRef.current.find((x) => x.game.handNumber === handNumber)
    if (!r) return
    const o = optsRef.current
    const saved = toSavedHand(r.game, r.decisions, o.modeId, o.modeLabel, r.savedId ?? undefined)
    if (flag && !saved.tags.includes('revisar')) saved.tags.push('revisar')
    useHandsStore.getState().savePlayedHand(saved)
    setReviews((rs) =>
      rs.map((x) => (x.game.handNumber === handNumber ? { ...x, savedId: saved.id, flagged: x.flagged || flag } : x)),
    )
  }, [])

  const heroTurn = !game.over && game.toAct >= 0 && game.seats[game.toAct]?.isHero

  // Timebank (opcional): contagem regressiva a cada decisao do heroi; ao estourar, age sozinho
  // (check se possivel, senao fold) e essa jogada NAO e avaliada pelo coach.
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  useEffect(() => {
    const sec = opts.timebankSec
    if (!heroTurn || !sec) {
      setTimeLeft(null)
      return
    }
    const total = sec * 1000
    const start = Date.now()
    setTimeLeft(sec)
    const iv = setInterval(() => {
      const left = Math.max(0, total - (Date.now() - start))
      setTimeLeft(left / 1000)
      if (left <= 0) {
        clearInterval(iv)
        const g = gameRef.current
        if (g.over || g.toAct < 0 || !g.seats[g.toAct].isHero) return
        act(legalActions(g).canCheck ? { type: 'check' } : { type: 'fold' }, true)
      }
    }, 200)
    return () => clearInterval(iv)
    // reinicia a cada nova decisao do heroi (mesma mao, nova rua/aumento)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroTurn, game.history.length, game.handNumber, opts.timebankSec])

  // sons/vibracao (so tocam se a opcao Som estiver ligada nas configuracoes)
  useEffect(() => {
    if (heroTurn) playSfx('turn')
  }, [heroTurn, game.street, game.handNumber])
  useEffect(() => {
    if (game.handNumber > 0 && !game.over) playSfx('deal')
  }, [game.handNumber]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!game.over || !game.result || heroId < 0) return
    const n = game.result.net[heroId]
    if (n > 0) playSfx('win')
    else if (n < 0) playSfx('lose')
  }, [game.over, game.handNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  return { game, archive, session, heroId, heroTurn, act, nextHand, reviews, lastGrade, hud, saveReview, tour, timeLeft }
}

/** Formata fichas como bb (ou fichas) para exibir. */
export function fmtChips(chips: number, bb: number, unit: 'bb' | 'chips'): string {
  if (unit === 'chips') return String(Math.round(chips))
  const v = chips / bb
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
