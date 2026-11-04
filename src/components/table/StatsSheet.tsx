// ============================================================
// Estatisticas dos jogadores (folha inferior, aberta pelo selo VPIP/PFR do cabecalho): as suas e as de
// cada bot que voce ja enfrentou. A faixa de 20% a 25% e a media das aberturas dos ranges, nao uma meta para o seu PFR medido.
// ============================================================
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { BarChart3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PFR_TARGET, statRows, type HudStats } from '@/engine/bots/hud'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { MIN_OPEN_OPPS, heroOpenTables } from '@/engine/ranges/coverage'

interface Props {
  hud: Record<string, HudStats>
  heroName: string | null
  /** Rotulo de estilo de quem esta no torneio ou na mesa (TAG, LAG+...); vazio para quem nao se conhece. */
  styleOf: (name: string) => string
  /** Seus numeros somados entre sessoes (guardados no aparelho); null ate a primeira mao. */
  heroTotal?: HudStats | null
  onResetTotal?: () => void
  onClose: () => void
}

type Scope = 'session' | 'total'

export default function StatsSheet({ hud, heroName, styleOf, heroTotal, onResetTotal, onClose }: Props) {
  useEscapeKey(onClose)
  const hasTotal = !!heroTotal && heroTotal.hands > 0
  const [scope, setScope] = useState<Scope>(hasTotal ? 'total' : 'session')
  const [confirmReset, setConfirmReset] = useState(false)
  const useTotal = scope === 'total' && hasTotal
  // as linhas dos adversarios sao sempre da sessao; a sua segue o recorte escolhido
  const rows = statRows(hud, heroName)
  const heroStats = useTotal ? heroTotal! : heroName ? hud[heroName] : undefined
  const hero = useTotal ? statRows({ Eu: heroTotal! }, 'Eu')[0] : rows.find((r) => r.isHero)
  const openTables = heroStats ? heroOpenTables(heroStats.open) : []

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

        {hasTotal && (
          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label="Recorte das suas estatísticas" className="inline-flex rounded-lg border border-border-default p-0.5 text-[11px]">
              {([['session', 'Esta sessão'], ['total', 'Acumulado']] as const).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={scope === id}
                  onClick={() => setScope(id)}
                  className={cn('px-2.5 py-1 rounded-md', scope === id ? 'bg-accent-gold/15 text-accent-gold' : 'text-text-muted')}
                >
                  {label}
                </button>
              ))}
            </div>
            {onResetTotal && useTotal && (
              confirmReset ? (
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-text-secondary">Apagar o acumulado?</span>
                  <button onClick={() => { onResetTotal(); setConfirmReset(false); setScope('session') }} className="rounded-md border border-accent-crimson/40 px-2 py-0.5 text-accent-crimson">Apagar</button>
                  <button onClick={() => setConfirmReset(false)} className="rounded-md border border-border-default px-2 py-0.5 text-text-muted">Cancelar</button>
                </span>
              ) : (
                <button onClick={() => setConfirmReset(true)} className="text-[11px] text-text-muted hover:text-text-primary">Zerar acumulado</button>
              )
            )}
          </div>
        )}

        {hero && (
          <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
            <p className="text-[11px] text-text-muted">Você em {hero.hands} {hero.hands === 1 ? 'mão' : 'mãos'}{useTotal ? ', somando as sessões' : ' desta sessão'}</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono">
              <span className="text-sm text-text-primary">VPIP <b className="text-lg">{hero.vpip}%</b></span>
              <span className="text-sm text-text-primary">PFR <b className="text-lg">{hero.pfr}%</b></span>
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              Os ranges do app abrem, na média de todas as posições, de {PFR_TARGET.min}% a {PFR_TARGET.max}% das mãos (o UTG abre menos; o botão e o SB, mais).
              {hero.hands < 30 ? ' Ainda são poucas mãos: o seu PFR oscila bastante.' : ' O seu PFR real sai menor que isso, porque nem toda mão chega a você com a vez de abrir o pote.'}
            </p>
          </div>
        )}

        {openTables.map((t) => (
          <div key={t.format} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
            <p className="text-[11px] text-text-muted">Suas aberturas por posição, mesa de {t.format === '6max' ? '6' : '9'}</p>
            <table className="mt-1 w-full text-xs font-mono">
              <thead>
                <tr className="text-text-muted">
                  <th className="px-1 text-left font-normal">Pos</th>
                  <th className="px-1 text-right font-normal">Vezes</th>
                  <th className="px-1 text-right font-normal">Você</th>
                  <th className="px-1 text-right font-normal">Alvo</th>
                  <th className="px-1 text-right font-normal">Dif</th>
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r) => (
                  <tr key={r.position}>
                    <td className="px-1 text-text-primary">{r.position}</td>
                    <td className="px-1 text-right text-text-muted">{r.opps}</td>
                    <td className="px-1 text-right text-text-primary">{r.opened === null ? '-' : `${r.opened}%`}</td>
                    <td className="px-1 text-right text-text-secondary">{r.target}%</td>
                    <td className={cn('px-1 text-right', r.diff !== null && Math.abs(r.diff) > 5 ? 'text-accent-gold' : 'text-text-muted')}>
                      {r.diff === null ? '-' : `${r.diff > 0 ? '+' : ''}${r.diff}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1.5 text-[11px] text-text-secondary">
              {t.mean === null
                ? `Faltam mãos: com ${MIN_OPEN_OPPS} oportunidades em cada posição eu calculo a média das suas aberturas (o BB conta zero).`
                : `Média das suas aberturas: ${t.mean.toFixed(1)}% (BB = 0). Alvo do app: ${t.targetMean.toFixed(1)}%, dentro de ${PFR_TARGET.min}% a ${PFR_TARGET.max}%.`}
              {' '}Dif positiva: você abriu mais que a tabela. Em dourado, mais de 5 pontos de diferença.
            </p>
          </div>
        ))}

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
                    <td className="px-1 text-right text-text-primary">{r.pfr}</td>
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
