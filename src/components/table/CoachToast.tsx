// ============================================================
// Aviso do coach depois de cada jogada do heroi. Nao e modal: aparece numa faixa
// de altura reservada (o layout nao pula), some sozinho e nunca bloqueia a acao.
// ============================================================
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Grade, GradedDecision, Kind } from '@/engine/coach/types'
import type { LastGrade } from '@/hooks/useTableEngine'

export const GRADE_UI: Record<Grade, { label: string; text: string; box: string }> = {
  best: { label: 'Ótima', text: 'text-accent-emerald', box: 'bg-accent-emerald/12 border-accent-emerald/35' },
  good: { label: 'Boa', text: 'text-accent-blue', box: 'bg-accent-blue/12 border-accent-blue/35' },
  inaccuracy: { label: 'Imprecisão', text: 'text-accent-gold', box: 'bg-accent-gold/12 border-accent-gold/35' },
  mistake: { label: 'Erro', text: 'text-orange-400', box: 'bg-orange-500/12 border-orange-500/35' },
  blunder: { label: 'Erro grave', text: 'text-accent-crimson', box: 'bg-accent-crimson/12 border-accent-crimson/35' },
}

export const KIND_LABEL: Record<Kind, string> = { fold: 'Fold', check: 'Check', call: 'Call', raise: 'Bet/Raise' }

interface Props {
  last: LastGrade | null
  onOpen: () => void
}

const SHOW_MS = 3600

export default function CoachToast({ last, onOpen }: Props) {
  const [visible, setVisible] = useState<GradedDecision | null>(null)

  useEffect(() => {
    if (!last) return
    setVisible(last.d)
    const t = setTimeout(() => setVisible(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [last])

  const ui = visible ? GRADE_UI[visible.grade] : null
  return (
    <div className="h-10 flex items-center justify-center" aria-live="polite">
      {visible && ui && (
        <button
          onClick={onOpen}
          className={cn(
            'max-w-full flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px]',
            ui.box,
          )}
        >
          <span className={cn('font-display font-bold', ui.text)}>{ui.label}</span>
          {visible.took !== visible.best && (
            <span className="text-text-secondary">melhor: {KIND_LABEL[visible.best]}</span>
          )}
          {visible.evLossBB !== null && visible.evLossBB >= 0.1 && (
            <span className="font-mono text-text-primary">-{visible.evLossBB.toFixed(1)} bb{visible.approx ? ' ≈' : ''}</span>
          )}
          <span className="text-text-muted hidden sm:inline">toque para ver</span>
        </button>
      )}
    </div>
  )
}
