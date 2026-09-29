// ============================================================
// Liga o motor puro (src/engine) ao React: estado da mesa, turnos dos bots,
// proxima mao e resultado da sessao. Nao tem regra de poker aqui.
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAction, createGame, startHand } from '@/engine/game/reducer'
import { decideBot } from '@/engine/bots/policy'
import type { Action, GameConfig, GameState, PlayerInit } from '@/engine/game/types'

export type Speed = 'slow' | 'normal' | 'fast'

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
}

export interface Session {
  hands: number
  /** Ganho/perda do heroi em fichas, ja descontadas as recompras. */
  net: number
  rebuys: number
}

export function useTableEngine(opts: TableOptions) {
  const [game, setGame] = useState<GameState>(() => createGame(opts.players, opts.cfg, 0))
  const [archive, setArchive] = useState<GameState[]>([])
  const [session, setSession] = useState<Session>({ hands: 0, net: 0, rebuys: 0 })
  const gameRef = useRef(game)
  gameRef.current = game
  const optsRef = useRef(opts)
  optsRef.current = opts
  const counted = useRef(0)

  const heroId = game.seats.findIndex((s) => s.isHero)

  const nextHand = useCallback(() => {
    const cur = gameRef.current
    if (!cur.over) return
    const o = optsRef.current
    let rebuys = 0
    const seats = cur.seats.map((s) => {
      if (s.stack >= o.cfg.bb) return s
      if (s.isHero) rebuys++
      return { ...s, stack: o.buyIn }
    })
    if (rebuys > 0) setSession((x) => ({ ...x, rebuys: x.rebuys + rebuys }))
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
      setGame(applyAction(g, decideBot(g)))
    }, lo + Math.random() * (hi - lo))
    return () => clearTimeout(t)
  }, [game, opts.speed])

  // fim de mao: contabiliza, arquiva e agenda a proxima
  useEffect(() => {
    if (!game.over || !game.result || game.handNumber === counted.current) return
    counted.current = game.handNumber
    const net = heroId >= 0 ? game.result.net[heroId] : 0
    setSession((x) => ({ ...x, hands: x.hands + 1, net: x.net + net }))
    setArchive((a) => [game, ...a].slice(0, 8))
  }, [game, heroId])

  useEffect(() => {
    if (!game.over || game.gameOver || !opts.autoNext || game.handNumber === 0) return
    const t = setTimeout(nextHand, NEXT_HAND_DELAY[opts.speed])
    return () => clearTimeout(t)
  }, [game, opts.autoNext, opts.speed, nextHand])

  const act = useCallback((action: Action) => {
    const g = gameRef.current
    if (g.over || g.toAct < 0 || !g.seats[g.toAct].isHero) return
    setGame(applyAction(g, action))
  }, [])

  const heroTurn = !game.over && game.toAct >= 0 && game.seats[game.toAct]?.isHero

  return { game, archive, session, heroId, heroTurn, act, nextHand }
}

/** Formata fichas como bb (ou fichas) para exibir. */
export function fmtChips(chips: number, bb: number, unit: 'bb' | 'chips'): string {
  if (unit === 'chips') return String(Math.round(chips))
  const v = chips / bb
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
