// Avaliacao do coach para cada decisao do heroi numa mao salva (Replayer).
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { SavedDecision } from '@/types'
import { GRADE_UI, KIND_LABEL } from './CoachToast'
import type { Kind } from '@/engine/coach/types'

const STREET: Record<string, string> = { preflop: 'Pré-flop', flop: 'Flop', turn: 'Turn', river: 'River' }
const kindLabel = (k: string) => KIND_LABEL[k as Kind] ?? k

export default function CoachDecisions({ decisions }: { decisions: SavedDecision[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (decisions.length === 0) return null
  const leaks = decisions.filter((d) => d.grade === 'inaccuracy' || d.grade === 'mistake' || d.grade === 'blunder').length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-text-muted uppercase">Avaliação do coach</h4>
        <span className="text-[11px] text-text-muted">
          {decisions.length} {decisions.length === 1 ? 'decisão' : 'decisões'}{leaks > 0 ? `, ${leaks} com erro` : ', sem erros'}
        </span>
      </div>
      {decisions.map((d, i) => {
        const ui = GRADE_UI[d.grade]
        const expanded = open === i
        return (
          <div key={i} className={cn('rounded-xl border p-3', ui.box)}>
            <button
              onClick={() => setOpen(expanded ? null : i)}
              aria-expanded={expanded}
              className="w-full min-h-[44px] flex items-start justify-between gap-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-xs font-display font-bold text-text-primary">
                  {STREET[d.street] ?? d.street}: <span className={ui.text}>{ui.label}</span>
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Você: <span className="text-text-primary font-semibold">{kindLabel(d.took)}</span>
                  {d.took !== d.best && (
                    <> · Referência: <span className="text-text-primary font-semibold">{kindLabel(d.best)}</span></>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                {d.evLossBB != null && d.evLossBB > 0 && (
                  <p className="text-[11px] font-mono font-bold text-accent-crimson">-{d.evLossBB.toFixed(1)} bb</p>
                )}
                {d.approx && <p className="text-[10px] text-text-muted">estimativa</p>}
                <p className="text-[10px] text-text-muted">{expanded ? 'ocultar' : 'detalhes'}</p>
              </div>
            </button>
            {expanded && (
              <ul className="mt-2 space-y-1 border-t border-white/10 pt-2">
                {d.explain.map((line, k) => (
                  <li key={k} className="text-[11px] text-text-secondary leading-relaxed">{line}</li>
                ))}
                {d.equity !== undefined && (
                  <li className="text-[11px] text-text-muted">Equity estimada: {Math.round(d.equity * 100)}%</li>
                )}
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
