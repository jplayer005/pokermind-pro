// ============================================================
// Laboratorio de cenarios na tela Jogar: cartoes para escolher o tema de treino e a folha de
// abertura (contexto + o que observar) que aparece ao sentar e pode ser reaberta na mesa.
// ============================================================
import { createPortal } from 'react-dom'
import { Target, X } from 'lucide-react'
import { Card } from '@/components/ui'
import { SCENARIOS, type Scenario } from '@/engine/lab/scenarios'
import { useEscapeKey } from '@/hooks/useEscapeKey'

export function ScenarioPicker({ onPick }: { onPick: (sc: Scenario) => void }) {
  return (
    <Card className="p-4 space-y-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
          <Target size={15} className="text-accent-gold" /> Cenários de treino
        </p>
        <p className="text-[11px] text-text-muted mt-0.5">
          Situações difíceis já montadas: você cai direto na decisão, com cartas diferentes a cada repetição, e o coach pausa para você ler o vilão.
        </p>
      </div>
      <div className="grid gap-2">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => onPick(sc)}
            className="rounded-xl border border-border-default bg-bg-base px-3 py-2.5 text-left transition-colors hover:border-accent-gold/60"
          >
            <span className="block text-sm font-display font-bold text-text-primary">{sc.title}</span>
            <span className="block text-[11px] text-text-muted mt-0.5">{sc.summary}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

export function ScenarioIntroSheet({ scenario, onClose }: { scenario: Scenario; onClose: () => void }) {
  useEscapeKey(onClose)
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Cenário de treino" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65" onClick={onClose}>
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
            <Target size={15} className="shrink-0 text-accent-gold" /> {scenario.title}
          </h3>
          <button aria-label="Fechar" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        <ul className="space-y-1">
          {scenario.context.map((line) => (
            <li key={line} className="text-xs text-text-secondary">{line}</li>
          ))}
        </ul>
        <div className="rounded-xl border border-accent-gold/35 bg-accent-gold/10 p-3">
          <p className="text-[11px] font-display font-bold text-accent-gold">O que observar</p>
          <p className="text-xs text-text-secondary mt-1">{scenario.lesson}</p>
        </div>
        <p className="text-[11px] text-text-muted">
          Cada repetição muda as cartas, mas mantém o tema. A mão do vilão é sorteada dentro do range que as ações dele sugerem: às vezes ele tem a mão forte, às vezes está blefando.
        </p>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-accent-gold py-2.5 text-xs font-display font-bold text-black">
          Começar
        </button>
      </div>
    </div>,
    document.body,
  )
}
