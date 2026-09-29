// ============================================================
// Revisao da mao (folha inferior, aberta pelo jogador; nunca abre sozinha).
// Lista cada decisao do heroi com a jogada de referencia, a perda estimada e o porque.
// ============================================================
import { createPortal } from 'react-dom'
import { X, BookmarkPlus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { RANK_CHARS } from '@/engine/cards'
import { isLeak } from '@/engine/coach/types'
import type { Review } from '@/hooks/useTableEngine'
import { GRADE_UI, KIND_LABEL } from './CoachToast'

const SUITS = ['♠', '♥', '♦', '♣']
const RED = new Set([1, 2])
const Card = ({ c }: { c: number }) => (
  <span className={cn('font-mono font-bold', RED.has(c & 3) ? 'text-accent-crimson' : 'text-text-primary')}>
    {RANK_CHARS[c >> 2]}{SUITS[c & 3]}
  </span>
)

interface Props {
  review: Review
  onClose: () => void
  onSave: (flag: boolean) => void
}

export default function HandReviewSheet({ review, onClose, onSave }: Props) {
  const { game, decisions } = review
  const leaks = decisions.filter((d) => isLeak(d.grade)).length
  const hero = game.seats.find((s) => s.isHero)

  // Portal: um ancestral animado (transform) faria o `fixed` prender na coluna de conteudo.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[80vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-display font-bold text-text-primary">Revisão da mão {game.handNumber}</h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {hero?.cards && (<>Você: <Card c={hero.cards[0]} /> <Card c={hero.cards[1]} /></>)}
              {game.board.length > 0 && (
                <>  ·  Board: {game.board.map((c, i) => (<span key={i}><Card c={c} />{' '}</span>))}</>
              )}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {decisions.length} decisões, {leaks === 0 ? 'nenhum vazamento' : `${leaks} para melhorar`}
            </p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {decisions.map((d, i) => {
          const ui = GRADE_UI[d.grade]
          return (
            <div key={i} className={cn('rounded-xl border p-3 space-y-1.5', ui.box)}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-mono text-text-muted">{d.street}</span>
                  <span className={cn('text-xs font-display font-bold', ui.text)}>{ui.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {d.evLossBB !== null && d.evLossBB >= 0.1 && (
                    <span className="font-mono text-[11px] text-text-primary">-{d.evLossBB.toFixed(1)} bb{d.approx ? ' ≈' : ''}</span>
                  )}
                  {d.approx && <Badge>estimativa</Badge>}
                </div>
              </div>
              <p className="text-[11px] text-text-secondary">
                Você: <span className="text-text-primary font-semibold">{KIND_LABEL[d.took]}</span>
                {d.took !== d.best && (
                  <>  ·  Referência: <span className="text-text-primary font-semibold">{KIND_LABEL[d.best]}</span></>
                )}
              </p>
              {d.explain.map((l, j) => (
                <p key={j} className="text-[11px] text-text-secondary leading-relaxed">{l}</p>
              ))}
              {d.tag && <p className="text-[10px] font-mono text-text-muted">vazamento: {d.tag}</p>}
            </div>
          )
        })}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onSave(false)}
            disabled={!!review.savedId}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border-default bg-bg-elevated text-xs text-text-primary disabled:opacity-60"
          >
            {review.savedId ? <Check size={13} /> : <BookmarkPlus size={13} />}
            {review.savedId ? 'No Replayer' : 'Salvar no Replayer'}
          </button>
          <button
            onClick={() => onSave(true)}
            disabled={review.flagged}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-accent-gold/40 bg-accent-gold/10 text-xs text-accent-gold disabled:opacity-60"
          >
            {review.flagged ? <Check size={13} /> : <BookmarkPlus size={13} />}
            {review.flagged ? 'Marcada' : 'Marcar para revisar'}
          </button>
        </div>
        <p className="text-[10px] text-text-muted">
          Ranges e spots de stack curto vêm do solver. Notas de pós-flop são estimativas de equity contra um range suposto.
        </p>
      </div>
    </div>,
    document.body,
  )
}
