// ============================================================
// Mesa jogavel: feltro, assentos girados para o heroi ficar embaixo,
// apostas, botao do dealer, board e pote. So apresenta; nao tem regra.
// ============================================================
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import PlayingCard from '@/components/poker/PlayingCard'
import { fromInt } from '@/engine/cards'
import { positionsBySeat, potTotal } from '@/engine/game/reducer'
import { profileOf } from '@/engine/bots/profiles'
import type { GameState, Seat } from '@/engine/game/types'
import { fmtChips } from '@/hooks/useTableEngine'
import { hudLine, type HudStats } from '@/engine/bots/hud'

interface Props {
  game: GameState
  heroId: number
  unit: 'bb' | 'chips'
  showProfiles: boolean
  /** Estatisticas acumuladas por assento; mostradas quando showHud e ha amostra minima. */
  hud?: Record<number, HudStats>
  showHud?: boolean
  /**
   * Altura (px) que o resto da tela ocupa (cabecalho, menu, barra de acoes...). Na mesa vertical a
   * largura e limitada por (altura da tela - reserva) para a mesa inteira, com a mao do heroi,
   * caber acima da barra de acoes em telefones baixos.
   */
  reservePx?: number
}

const RX = 43
const RY = 41
// Mesa vertical (celular em pe): os assentos seguem uma superelipse, que achata os lados e
// empurra os assentos para as bordas laterais, o formato de capsula dos apps modernos.
const RX_P = 39
const RY_P = 41
const SUPER_EXP = 2.5

function seatXY(k: number, n: number, portrait: boolean) {
  const a = ((90 + (k * 360) / n) * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  if (!portrait) return { x: 50 + RX * c, y: 50 + RY * s }
  const e = 2 / SUPER_EXP
  return {
    x: 50 + RX_P * Math.sign(c) * Math.pow(Math.abs(c), e),
    y: 50 + RY_P * Math.sign(s) * Math.pow(Math.abs(s), e),
  }
}

/** true com a tela em pe (retrato): mesa vertical. Deitada ou no desktop: mesa horizontal. */
function usePortrait(): boolean {
  const query = '(orientation: portrait)'
  const [portrait, setPortrait] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true,
  )
  useEffect(() => {
    if (!window.matchMedia) return
    const m = window.matchMedia(query)
    const onChange = () => setPortrait(m.matches)
    onChange()
    m.addEventListener?.('change', onChange)
    return () => m.removeEventListener?.('change', onChange)
  }, [])
  return portrait
}

const PROFILE_TONE: Record<string, string> = {
  tag: 'border-accent-blue/60',
  nit: 'border-slate-400/60',
  lag: 'border-accent-gold/70',
  maniac: 'border-accent-crimson/70',
  station: 'border-accent-emerald/60',
}

export default function PokerTableView({ game, heroId, unit, showProfiles, hud, showHud, reservePx = 344 }: Props) {
  const n = game.seats.length
  const bb = game.cfg.bb
  const pos = positionsBySeat(game)
  const revealAll = game.over && !!game.result?.showdown
  const winners = new Map((game.result?.winners ?? []).map((w) => [w.seat, w]))
  const pot = potTotal(game)
  const portrait = usePortrait()

  return (
    <div
      className={cn(
        'relative w-full mx-auto select-none',
        portrait
          ? 'max-w-md aspect-[5/6]'
          : 'aspect-[16/10] max-w-[min(42rem,max(24rem,calc((100vh-220px)*1.6)))]',
      )}
      style={portrait ? { width: `min(100%, max(15rem, calc((100vh - ${reservePx}px) * 0.8333)))` } : undefined}
    >
      {/* feltro: capsula vertical no celular em pe, elipse horizontal nas telas largas */}
      <div
        className={cn(
          'absolute border-[6px] border-[#2a1d12] bg-[radial-gradient(ellipse_at_center,#1f6b46_0%,#155235_55%,#0e3b26_100%)] shadow-[inset_0_0_40px_rgba(0,0,0,0.55),0_8px_30px_rgba(0,0,0,0.5)]',
          portrait ? 'inset-[3%_9%] rounded-[999px]' : 'inset-[7%_5%] rounded-[50%]',
        )}
      >
        <div className={cn('absolute inset-[6%] border border-white/10', portrait ? 'rounded-[999px]' : 'rounded-[50%]')} />
      </div>

      {/* pote + board (em mesa cheia na vertical o board encolhe para caber entre os assentos laterais) */}
      <div
        className={cn(
          'absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2',
          portrait ? 'top-[46%]' : 'top-[44%]',
          portrait && n >= 7 && 'scale-[0.86]',
        )}
      >
        <div className="px-3 py-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-mono text-white">
          Pote <span className="text-accent-gold font-bold">{fmtChips(pot, bb, unit)}</span>
          {unit === 'bb' ? ' bb' : ''}
        </div>
        <div className="flex gap-1 items-center justify-center">
          {Array.from({ length: 5 }).map((_, i) =>
            game.board[i] !== undefined ? (
              <PlayingCard key={i} card={fromInt(game.board[i])} size="sm" animate delay={0.05} />
            ) : (
              <div key={i} className="w-9 h-14 rounded-md border border-dashed border-white/15 bg-black/15" />
            ),
          )}
        </div>
      </div>

      {/* assentos */}
      {game.seats.map((seat) => {
        const k = (seat.id - heroId + n) % n
        const { x, y } = seatXY(k, n, portrait)
        const toward = (f: number) => ({ left: `${x + (50 - x) * f}%`, top: `${y + (50 - y) * f}%` })
        const isTurn = game.toAct === seat.id && !game.over
        const win = winners.get(seat.id)
        return (
          <div key={seat.id}>
            {/* aposta da rua */}
            <AnimatePresence>
              {seat.bet > 0 && (
                <motion.div
                  key="bet"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/55 border border-accent-gold/40"
                  style={toward(0.42)}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-gold border border-yellow-200/60" />
                  <span className="text-[10px] font-mono font-bold text-white">{fmtChips(seat.bet, bb, unit)}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* botao do dealer */}
            {game.button === seat.id && !seat.out && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold flex items-center justify-center shadow"
                style={toward(0.24)}
              >
                D
              </div>
            )}

            <SeatView
              seat={seat}
              x={x}
              y={y}
              label={pos[seat.id]}
              bb={bb}
              unit={unit}
              isTurn={isTurn}
              reveal={revealAll && !seat.folded}
              win={win?.amount}
              handName={win?.handName}
              showProfile={showProfiles}
              hero={seat.id === heroId}
              hudText={showHud && seat.id !== heroId ? hudLine(hud?.[seat.id]) : ""}
              bottomAnchor={portrait && k === 0}
            />
          </div>
        )
      })}
    </div>
  )
}

interface SeatProps {
  seat: Seat
  x: number
  y: number
  label?: string
  bb: number
  unit: 'bb' | 'chips'
  isTurn: boolean
  reveal: boolean
  win?: number
  handName?: string
  showProfile: boolean
  hero: boolean
  hudText: string
  /** Ancora o assento na base da mesa (mesa vertical): a metade da altura do assento fica dentro da caixa. */
  bottomAnchor: boolean
}

function SeatView({ seat, x, y, label, bb, unit, isTurn, reveal, win, handName, showProfile, hero, hudText, bottomAnchor }: SeatProps) {
  const profile = profileOf(seat.profile)
  const faded = seat.out || seat.folded
  const cards = seat.cards
  const showCards = !!cards && !seat.out && (hero || reveal)
  return (
    <div
      className={cn('absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-[84px]', faded && 'opacity-45')}
      style={{ left: `${x}%`, top: bottomAnchor ? "calc(100% - 50px)" : `${y}%` }}
    >
      {/* cartas */}
      {cards && !seat.out && !seat.folded && (
        <div className={cn('flex z-0', hero ? 'gap-1 -mb-3' : '-space-x-2 -mb-1.5')}>
          {showCards ? (
            <>
              <PlayingCard card={fromInt(cards[0])} size={hero ? 'md' : 'sm'} />
              <PlayingCard card={fromInt(cards[1])} size={hero ? 'md' : 'sm'} />
            </>
          ) : (
            <>
              <PlayingCard faceDown size="xs" />
              <PlayingCard faceDown size="xs" />
            </>
          )}
        </div>
      )}

      {/* placa do jogador */}
      <div
        className={cn(
          'relative z-10 w-full rounded-xl border bg-[#0d1424]/95 px-1.5 py-1 text-center transition-shadow',
          hero ? 'border-accent-gold/70' : showProfile ? PROFILE_TONE[seat.profile] ?? 'border-white/15' : 'border-white/15',
          isTurn && 'ring-2 ring-accent-gold shadow-[0_0_14px_rgba(245,197,66,0.55)]',
          win && 'ring-2 ring-accent-emerald shadow-[0_0_16px_rgba(52,211,153,0.6)]',
        )}
      >
        <div className="flex items-center justify-center gap-1">
          <span className="text-[10px] font-body font-semibold text-text-primary truncate max-w-[52px]">
            {hero ? 'Você' : seat.name}
          </span>
          {label && <span className="text-[8px] font-mono text-text-muted">{label}</span>}
        </div>
        <div className="text-[11px] font-mono font-bold text-accent-gold leading-tight">
          {seat.out ? 'fora' : seat.allIn && seat.stack === 0 ? 'ALL-IN' : fmtChips(seat.stack, bb, unit)}
        </div>
        {showProfile && !hero && (
          <div className="text-[8px] text-text-muted leading-tight truncate">{profile.label}</div>
        )}
        {hudText && <div className="text-[8px] font-mono text-accent-blue leading-tight truncate">{hudText}</div>}
      </div>

      {/* ultima acao / vitoria */}
      {win ? (
        <div className="absolute -bottom-6 z-20 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-accent-emerald text-black text-[10px] font-bold">
          +{fmtChips(win, bb, unit)}{handName ? ` ${handName.split(',')[0]}` : ''}
        </div>
      ) : (
        seat.lastAction && !seat.out && (
          <div className="absolute -bottom-5 z-20 whitespace-nowrap px-1.5 py-0.5 rounded-md bg-black/70 border border-white/10 text-[9px] font-mono text-white">
            {seat.lastAction.replace(/\d+/, (m) => fmtChips(Number(m), bb, unit))}
          </div>
        )
      )}
    </div>
  )
}
