// ============================================================
// Aviso do coach depois de cada jogada do heroi. Nao e modal: aparece sobre a mesa, some sozinho
// e nunca bloqueia a acao. O grau e um selo SOLIDO (icone + palavra) para ler de relance.
// ============================================================
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Check, ThumbsUp, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Grade, GradedDecision, Kind } from '@/engine/coach/types'
import type { LastGrade } from '@/hooks/useTableEngine'

export const GRADE_UI: Record<Grade, { label: string; text: string; box: string; color: string; Icon: LucideIcon }> = {
  best: { label: 'Ótima', text: 'text-accent-emerald', box: 'bg-accent-emerald/12 border-accent-emerald/35', color: 'var(--accent-emerald)', Icon: Check },
  good: { label: 'Boa', text: 'text-accent-blue', box: 'bg-accent-blue/12 border-accent-blue/35', color: 'var(--accent-blue)', Icon: ThumbsUp },
  inaccuracy: { label: 'Imprecisão', text: 'text-accent-gold', box: 'bg-accent-gold/12 border-accent-gold/35', color: 'var(--accent-gold)', Icon: AlertTriangle },
  mistake: { label: 'Erro', text: 'text-orange-400', box: 'bg-orange-500/12 border-orange-500/35', color: '#fb923c', Icon: XCircle },
  blunder: { label: 'Erro grave', text: 'text-accent-crimson', box: 'bg-accent-crimson/12 border-accent-crimson/35', color: 'var(--accent-crimson)', Icon: XCircle },
}

export const KIND_LABEL: Record<Kind, string> = { fold: 'Fold', check: 'Check', call: 'Call', raise: 'Bet/Raise' }

interface Props {
  last: LastGrade | null
  onOpen: () => void
  /**
   * true = flutua sobre o container pai (que deve ser `relative`), sem reservar altura:
   * o aviso nao empurra nem afasta a mesa dos botoes de acao.
   */
  overlay?: boolean
}

const SHOW_MS = 4500

/** Cor do grau misturada com o fundo opaco do tema: tinta forte, mas legivel em tema claro e escuro. */
const tint = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, rgb(var(--c-bg-elevated)))`

export default function CoachToast({ last, onOpen, overlay = false }: Props) {
  const [visible, setVisible] = useState<{ d: GradedDecision; key: number } | null>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!last) return
    setVisible({ d: last.d, key: last.key })
    const t = setTimeout(() => setVisible(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [last])

  const d = visible?.d
  const ui = d ? GRADE_UI[d.grade] : null
  return (
    <div
      className={cn(
        'flex items-center justify-center',
        // overlay: sem altura reservada; o container so recebe toque no proprio aviso
        overlay ? 'absolute top-1 inset-x-2 z-20 pointer-events-none' : 'h-12',
      )}
      aria-live="polite"
    >
      {d && ui && visible && (
        <motion.button
          key={visible.key}
          type="button"
          onClick={onOpen}
          initial={reduceMotion ? false : { opacity: 0, y: -10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'max-w-full flex items-center gap-2.5 rounded-2xl border-2 bg-bg-elevated px-3 py-2 text-xs shadow-xl',
            overlay && 'pointer-events-auto',
          )}
          style={{ borderColor: tint(ui.color, 80), backgroundColor: tint(ui.color, 22) }}
        >
          {/* selo solido: cor cheia + texto preto, legivel de relance em qualquer tema */}
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-display font-bold text-black"
            style={{ backgroundColor: ui.color }}
          >
            <ui.Icon size={16} strokeWidth={3} aria-hidden />
            {ui.label}
          </span>
          {d.took !== d.best && (
            <span className="text-text-primary">
              melhor: <b className="font-display">{KIND_LABEL[d.best]}</b>
            </span>
          )}
          {d.evLossBB !== null && d.evLossBB >= 0.1 && (
            <span className="font-mono font-bold text-text-primary">-{d.evLossBB.toFixed(1)} bb{d.approx ? ' ≈' : ''}</span>
          )}
          <span className="hidden text-text-secondary sm:inline">toque para ver</span>
        </motion.button>
      )}
    </div>
  )
}
