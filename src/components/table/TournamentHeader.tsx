// ============================================================
// Cabecalho do torneio: nivel, blinds/ante, jogadores restantes, bolha/dinheiro,
// proximo nivel e (no Sit&Go) a equity ICM do heroi.
// Layout defensivo: o que pode crescer (blinds) trunca; o que e curto nao encolhe;
// as etiquetas quebram de linha em vez de se sobrepor (testado de 320 a 390 px).
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
      {/* linha 1: nivel + blinds (trunca se ficar muito grande) | proximo nivel (fixo) */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0">
            <Badge variant="gold">Nível {tour.levelIdx + 1}</Badge>
          </span>
          <span className="min-w-0 truncate text-xs font-mono text-text-primary">
            {n(lvl.sb)}/{n(lvl.bb)}
            {lvl.ante > 0 ? ` a${n(lvl.ante)}` : ''}
          </span>
        </div>
        <span className="shrink-0 whitespace-nowrap text-[10px] text-text-muted font-mono">
          próx. nível: {left} {left === 1 ? 'mão' : 'mãos'}
        </span>
      </div>
      {/* linha 2: restantes/premiados + etiquetas (quebram de linha) | ICM (fixo) */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <span className="whitespace-nowrap text-xs text-text-secondary font-mono">
            Restam <span className="text-text-primary font-bold">{tour.remaining}</span>/{tour.config.fieldSize}
          </span>
          <span className="whitespace-nowrap text-[11px] text-text-muted">paga {paidPlaces(tour)}</span>
          {bubble && <Badge variant="crimson">Bolha</Badge>}
          {money && !tour.done && <Badge variant="emerald">No dinheiro</Badge>}
        </div>
        {icm !== null && (
          <span className="shrink-0 whitespace-nowrap text-[11px] text-text-secondary font-mono">ICM {icm.toFixed(1)}%</span>
        )}
      </div>
    </div>
  )
}
