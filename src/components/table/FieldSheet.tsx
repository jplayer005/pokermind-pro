// ============================================================
// Painel do campo (folha inferior, aberta pelo jogador): onde voce esta no torneio, os lideres, a sua
// mesa com o estilo de cada um (e o HUD acumulado) e todas as mesas. Os estilos vem do campo real:
// cada bot tem tracos proprios (+ mais agressivo que o estilo base, - mais passivo).
// ============================================================
import { createPortal } from 'react-dom'
import { Trophy, Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hudLine, type HudStats } from '@/engine/bots/hud'
import type { FieldSummary, SummaryPlayer } from '@/engine/game/field'
import { useEscapeKey } from '@/hooks/useEscapeKey'

interface Props {
  summary: FieldSummary
  /** Estatisticas por jogador (nome): acompanham o jogador entre mesas. */
  hud: Record<string, HudStats>
  onClose: () => void
}

const bbText = (v: number) => (v >= 100 ? Math.round(v).toString() : v.toFixed(1))

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
      <p className="text-[10px] text-text-muted">{label}</p>
      <p className="font-mono text-sm font-bold text-text-primary">{value}</p>
      {hint && <p className="text-[10px] text-text-muted">{hint}</p>}
    </div>
  )
}

function PlayerRow({ p, rank, hud, showTable }: { p: SummaryPlayer; rank?: number; hud?: Record<string, HudStats>; showTable?: boolean }) {
  const stats = !p.isHero && hud ? hudLine(hud[p.name]) : ''
  return (
    <li className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs', p.isHero && 'bg-accent-gold/10')}>
      {rank !== undefined && <span className="w-4 shrink-0 text-right font-mono text-text-muted">{rank}</span>}
      <span className={cn('min-w-0 flex-1 truncate', p.isHero ? 'font-bold text-accent-gold' : 'text-text-primary')}>{p.name}</span>
      <span className="shrink-0 rounded-full border border-border-default px-1.5 py-0.5 text-[10px] text-text-secondary">{p.style}</span>
      {stats && <span className="hidden shrink-0 font-mono text-[10px] text-accent-blue sm:inline">{stats}</span>}
      {showTable && <span className="shrink-0 text-[10px] text-text-muted">{p.table === 0 ? 'sua mesa' : `mesa ${p.table + 1}`}</span>}
      <span className="w-12 shrink-0 text-right font-mono text-text-primary">{bbText(p.stackBB)}</span>
    </li>
  )
}

export default function FieldSheet({ summary: s, hud, onClose }: Props) {
  useEscapeKey(onClose)
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Campo do torneio" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
            <Users size={15} className="text-accent-gold" /> Campo do torneio
          </h3>
          <button aria-label="Fechar" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Restam" value={`${s.remaining} de ${s.fieldSize}`} hint={`${s.tables} ${s.tables === 1 ? 'mesa' : 'mesas'}`} />
          <Kpi
            label="Dinheiro"
            value={s.inMoney ? 'No dinheiro' : `Faltam ${s.toMoney}`}
            hint={`pagam ${s.paid}`}
          />
          <Kpi label="Seu lugar em fichas" value={`${s.heroRank}º`} hint={`${bbText(s.heroStackBB)} bb`} />
          <Kpi label="Stack médio" value={`${bbText(s.avgStackBB)} bb`} hint={s.heroStackBB >= s.avgStackBB ? 'você está acima' : 'você está abaixo'} />
        </div>

        <section>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-display font-bold text-text-secondary">
            <Trophy size={12} /> Líderes de fichas
          </h4>
          <ul>
            {s.leaders.map((p, i) => <PlayerRow key={p.name} p={p} rank={i + 1} showTable />)}
          </ul>
        </section>

        <section>
          <h4 className="mb-1 text-xs font-display font-bold text-text-secondary">Sua mesa</h4>
          <ul>
            {s.heroTable.map((p) => <PlayerRow key={p.name} p={p} hud={hud} />)}
          </ul>
          <p className="mt-1 text-[10px] text-text-muted">
            Estilo de cada bot: TAG, LAG, Nit, Calling Station ou Maníaco. O + indica mais agressivo que o normal do estilo, o - mais passivo. As estatísticas (V e P) são acumuladas das mãos que você viu e acompanham o jogador entre mesas.
          </p>
        </section>

        {s.tableRows.length > 1 && (
          <section>
            <h4 className="mb-1 text-xs font-display font-bold text-text-secondary">Todas as mesas</h4>
            <ul className="space-y-0.5">
              {s.tableRows.map((r) => (
                <li key={r.table} className={cn('flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs', r.isHeroTable && 'bg-accent-gold/10')}>
                  <span className={cn('shrink-0', r.isHeroTable ? 'font-bold text-accent-gold' : 'text-text-primary')}>
                    {r.isHeroTable ? 'Sua mesa' : `Mesa ${r.table + 1}`}
                  </span>
                  <span className="shrink-0 text-text-muted">{r.players} jogadores</span>
                  <span className="min-w-0 flex-1 truncate text-right text-text-secondary">
                    líder {r.leader}, <span className="font-mono">{bbText(r.leaderBB)} bb</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>,
    document.body,
  )
}
