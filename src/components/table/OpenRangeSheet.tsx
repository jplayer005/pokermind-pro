// ============================================================
// Pergunta de range no pre-flop: "essa mao esta no seu range de abertura daqui?". Aparece so na vez do
// heroi de abrir o pote (coach Quiz). Responde Sim ou Nao; a revelacao mostra a grade da posicao com a
// mao destacada. Nunca decide por ele: "Continuar" devolve a mesa com os botoes de acao.
// ============================================================
import { createPortal } from 'react-dom'
import { Check, ListChecks, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateHandGrid } from '@/lib/poker'
import type { OpenQuizState } from '@/hooks/useTableEngine'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { GRADE_UI } from './CoachToast'

const GRID = generateHandGrid()

interface Props {
  quiz: OpenQuizState
  /** Stack do heroi em bb, para o texto da pergunta. */
  stackBB: number
  onAnswer: (inRange: boolean) => void
  onClose: () => void
}

function MiniGrid({ range, hand }: { range: ReadonlySet<string>; hand: string }) {
  return (
    <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
      {GRID.flat().map((h) => (
        <div
          key={h}
          className={cn(
            'flex aspect-square items-center justify-center rounded-[3px] font-mono text-[7px] font-bold leading-none sm:text-[8px]',
            range.has(h) ? 'bg-accent-emerald/70 text-black' : 'bg-white/5 text-text-muted',
            h === hand && 'ring-2 ring-accent-gold',
          )}
        >
          {h === hand ? h : ''}
        </div>
      ))}
    </div>
  )
}

export default function OpenRangeSheet({ quiz, stackBB, onAnswer, onClose }: Props) {
  const { q, result } = quiz
  const set = new Set(q.range)
  const combos = (h: string) => (h.length === 2 ? 6 : h.endsWith('s') ? 4 : 12)
  const pct = Math.round((q.range.reduce((a, h) => a + combos(h), 0) / 1326) * 100)
  const ui = result ? GRADE_UI[result.grade] : null
  useEscapeKey(onClose)

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Pergunta de range" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65">
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-md max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
              <ListChecks size={15} className="text-accent-gold" /> Pausa: seu range
            </h3>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              Você é o {q.pos} na mesa de {q.format === '6max' ? '6' : '9'}, com {Math.round(stackBB)} bb, e ninguém abriu ainda.
            </p>
          </div>
          <button aria-label="Pular a pergunta" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        <p className="text-center text-2xl font-mono font-bold text-text-primary">{q.hand}</p>

        {!result ? (
          <>
            <p className="text-center text-xs text-text-secondary">Essa mão está no seu range de abertura do {q.pos}?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onAnswer(true)} className="rounded-xl border border-accent-emerald/40 bg-accent-emerald/10 py-3 text-sm font-semibold text-accent-emerald">
                Está no range
              </button>
              <button onClick={() => onAnswer(false)} className="rounded-xl border border-border-default bg-bg-base py-3 text-sm font-semibold text-text-primary">
                Fora do range
              </button>
            </div>
            <button onClick={onClose} className="w-full text-[11px] text-text-muted hover:text-text-primary">Pular a pergunta</button>
          </>
        ) : (
          <>
            <div className={cn('rounded-xl border p-3 text-center', ui?.box)}>
              <p className={cn('flex items-center justify-center gap-1.5 text-sm font-display font-bold', ui?.text)}>
                {result.correct && <Check size={14} />}
                {result.correct ? 'Certo' : 'Errado'}
              </p>
              <p className="mt-0.5 text-[11px] text-text-secondary">
                {q.hand} {q.inRange ? 'está' : 'não está'} no range de abertura do {q.pos} ({pct}% das mãos).
                {q.inRange ? ' Abra com raise.' : ' Largue, ou só jogue se alguém abrir e a mão valer a defesa.'}
              </p>
            </div>
            <MiniGrid range={set} hand={q.hand} />
            <p className="text-[10px] text-text-muted">Verde: mãos que o app abre desta posição. A mão da vez está com a moldura dourada.</p>
            {!result.correct && <p className="text-[10px] text-text-muted">Esta mão volta mais vezes para você revisar.</p>}
            <button onClick={onClose} className="w-full rounded-xl border border-accent-gold/40 bg-accent-gold/10 py-2.5 text-sm font-semibold text-accent-gold">
              Continuar
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
