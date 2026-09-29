// ============================================================
// Cabecalho do torneio: nivel, blinds/ante, jogadores restantes, bolha/dinheiro,
// proximo nivel e (no Sit&Go) a equity ICM do heroi.
// ============================================================
import { Badge } from '@/components/ui'
import { calculateICM } from '@/lib/poker'
import {
  currentLevel, inTheMoney, isBubble, paidPlaces, type TournamentState,
} from '@/engine/game/tournament'
import type { GameState } from '@/engine/game/types'

interface Props {
  tour: TournamentState
  game: GameState
  heroId: number
}

const n = (v: number) => v.toLocaleString('pt-BR')

/** Equity ICM (em % do premio total) de cada jogador vivo na mesa; so faz sentido com o campo todo sentado. */
function heroIcmPct(tour: TournamentState, game: GameState, heroId: number): number | null {
  if (tour.offTable > 0) return null
  const alive = game.seats.filter((s) => s.stack > 0)
  const idx = alive.findIndex((s) => s.id === heroId)
  if (idx < 0 || alive.length < 2) return null
  const pay = tour.config.payouts.map((p) => p * 100)
  const values = calculateICM(alive.map((s) => s.stack), pay)
  return values[idx]
}

export default function TournamentHeader({ tour, game, heroId }: Props) {
  const lvl = currentLevel(tour)
  const left = Math.max(0, tour.config.handsPerLevel - tour.handsInLevel)
  const bubble = isBubble(tour)
  const money = inTheMoney(tour)
  const icm = heroIcmPct(tour, game, heroId)

  return (
    <div className="rounded-xl border border-border-default bg-bg-elevated/70 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="gold">Nível {tour.levelIdx + 1}</Badge>
          <span className="text-xs font-mono text-text-primary truncate">
            {n(lvl.sb)}/{n(lvl.bb)}{lvl.ante > 0 ? ` ante ${n(lvl.ante)}` : ''}
          </span>
        </div>
        <span className="text-[11px] text-text-muted font-mono shrink-0">próx. nível em {left} {left === 1 ? 'mão' : 'mãos'}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-secondary font-mono">
            Restam <span className="text-text-primary font-bold">{tour.remaining}</span>/{tour.config.fieldSize}
          </span>
          <span className="text-[11px] text-text-muted">paga {paidPlaces(tour)}</span>
          {bubble && <Badge variant="crimson">Bolha</Badge>}
          {money && !tour.done && <Badge variant="emerald">No dinheiro</Badge>}
        </div>
        {icm !== null && (
          <span className="text-[11px] text-text-secondary font-mono">ICM {icm.toFixed(1)}%</span>
        )}
      </div>
    </div>
  )
}
