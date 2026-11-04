// ============================================================
// Estatisticas dos jogadores (folha inferior, aberta pelo selo VPIP/PFR do cabecalho): as suas e as de
// cada bot que voce ja enfrentou. O PFR e comparado com a faixa que o treino persegue (20% a 25%).
// ============================================================
import { createPortal } from 'react-dom'
import { BarChart3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PFR_TARGET, statRows, type HudStats } from '@/engine/bots/hud'
import { useEscapeKey } from '@/hooks/useEscapeKey'

interface Props {
  hud: Record<string, HudStats>
  heroName: string | null
  /** Rotulo de estilo de quem esta no torneio ou na mesa (TAG, LAG+...); vazio para quem nao se conhece. */
  styleOf: (name: string) => string
  onClose: () => void
}

/** Verde dentro da faixa-alvo, dourado fora dela. */
const pfrTone = (pfr: number) => (pfr >= PFR_TARGET.min && pfr <= PFR_TARGET.max ? 'text-accent-emerald' : 'text-accent-gold')

export default function StatsSheet({ hud, heroName, styleOf, onClose }: Props) {
  useEscapeKey(onClose)
  const rows = statRows(hud, heroName)
  const hero = rows.find((r) => r.isHero)

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Estatísticas dos jogadores" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
            <BarChart3 size={15} className="text-accent-gold" /> Estatísticas
          </h3>
          <button aria-label="Fechar" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {hero && (
          <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
            <p className="text-[11px] text-text-muted">Você em {hero.hands} {hero.hands === 1 ? 'mão' : 'mãos'}</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono">
              <span className="text-sm text-text-primary">VPIP <b className="text-lg">{hero.vpip}%</b></span>
              <span className="text-sm text-text-primary">PFR <b className={cn('text-lg', pfrTone(hero.pfr))}>{hero.pfr}%</b></span>
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              O treino persegue um PFR de {PFR_TARGET.min}% a {PFR_TARGET.max}%
              {hero.hands < 30 ? '. Ainda são poucas mãos: o número oscila bastante.' : hero.pfr < PFR_TARGET.min ? `. Você está abaixo: abra mais mãos nas posições finais.` : hero.pfr > PFR_TARGET.max ? '. Você está acima: aperte as aberturas iniciais.' : '. Você está dentro da faixa.'}
            </p>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-xs text-text-muted">Ainda não há mãos jogadas. As estatísticas aparecem depois da primeira mão.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-xs">
              <thead>
                <tr className="text-left text-[10px] text-text-muted">
                  <th className="py-1 pr-2 font-normal">Jogador</th>
                  <th className="px-1 text-right font-normal">Mãos</th>
                  <th className="px-1 text-right font-normal">VPIP</th>
                  <th className="px-1 text-right font-normal">PFR</th>
                  <th className="px-1 text-right font-normal">3-bet</th>
                  <th className="px-1 text-right font-normal">AF</th>
                  <th className="pl-1 text-right font-normal">Fold/aposta</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {rows.map((r) => (
                  <tr key={r.name} className={cn('border-t border-border-subtle', r.isHero && 'bg-accent-gold/10')}>
                    <td className="max-w-[7.5rem] py-1.5 pr-2 font-body">
                      <span className={cn('block truncate', r.isHero ? 'font-bold text-accent-gold' : 'text-text-primary')}>{r.name}</span>
                      {!r.isHero && styleOf(r.name) && <span className="block text-[10px] text-text-muted">{styleOf(r.name)}</span>}
                    </td>
                    <td className="px-1 text-right text-text-secondary">{r.hands}</td>
                    <td className="px-1 text-right text-text-primary">{r.vpip}</td>
                    <td className={cn('px-1 text-right', r.isHero ? pfrTone(r.pfr) : 'text-text-primary')}>{r.pfr}</td>
                    <td className="px-1 text-right text-text-secondary">{r.threeBet}</td>
                    <td className="px-1 text-right text-text-secondary">{r.af}</td>
                    <td className="pl-1 text-right text-text-secondary">{r.foldToBet === null ? '-' : `${r.foldToBet}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] leading-relaxed text-text-muted">
          VPIP: % das mãos em que o jogador pôs fichas voluntariamente no pré-flop. PFR: % em que aumentou no pré-flop. 3-bet: % em que reaumentou. AF: apostas e aumentos divididos por calls no pós-flop. Fold/aposta: % das apostas pós-flop que largou (com 5 apostas enfrentadas ou mais). Só contam as mãos que você jogou com cada um.
        </p>
      </div>
    </div>,
    document.body,
  )
}
