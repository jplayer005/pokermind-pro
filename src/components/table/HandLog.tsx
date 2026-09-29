// ============================================================
// Historico de maos em texto (mao atual + ultimas jogadas).
// ============================================================
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { RANK_CHARS } from '@/engine/cards'
import type { GameState, HandEvent } from '@/engine/game/types'
import { fmtChips } from '@/hooks/useTableEngine'

const SUITS = ['♠', '♥', '♦', '♣']
const cardText = (c: number) => RANK_CHARS[c >> 2] + SUITS[c & 3]

interface Props {
  games: GameState[] // mais recente primeiro
  unit: 'bb' | 'chips'
  onClose: () => void
}

function describeEvent(e: HandEvent, name: string, bb: number, unit: 'bb' | 'chips'): string {
  const f = (n: number) => fmtChips(n, bb, unit) + (unit === 'bb' ? ' bb' : '')
  const allIn = e.allIn ? ' (all-in)' : ''
  switch (e.type) {
    case 'ante': return `${name} paga ante ${f(e.amount)}`
    case 'sb': return `${name} posta SB ${f(e.amount)}`
    case 'bb': return `${name} posta BB ${f(e.amount)}`
    case 'fold': return `${name} fold`
    case 'check': return `${name} check`
    case 'call': return `${name} call ${f(e.amount)}${allIn}`
    case 'raise': return `${name} ${e.toCall === 0 && e.street !== 'preflop' ? 'aposta' : 'aumenta para'} ${f(e.amount)}${allIn}`
  }
}

function HandBlock({ g, unit }: { g: GameState; unit: 'bb' | 'chips' }) {
  const bb = g.cfg.bb
  const streets = ['preflop', 'flop', 'turn', 'river'] as const
  const boardFor = (s: (typeof streets)[number]) =>
    s === 'flop' ? g.board.slice(0, 3) : s === 'turn' ? g.board.slice(3, 4) : s === 'river' ? g.board.slice(4, 5) : []
  const hero = g.seats.find((x) => x.isHero)

  return (
    <div className="rounded-xl border border-border-default bg-bg-elevated/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-display font-bold text-text-primary">Mão #{g.handNumber}</span>
        {hero?.cards && (
          <span className="text-[11px] font-mono text-text-secondary">
            Você: {cardText(hero.cards[0])} {cardText(hero.cards[1])}
          </span>
        )}
      </div>
      {streets.map((s) => {
        const evs = g.history.filter((e) => e.street === s)
        if (evs.length === 0) return null
        const b = boardFor(s)
        return (
          <div key={s}>
            <p className="text-[10px] uppercase tracking-wide text-text-muted font-mono">
              {s}{b.length ? `  ${b.map(cardText).join(' ')}` : ''}
            </p>
            {evs.map((e, i) => (
              <p key={i} className="text-[11px] text-text-secondary leading-relaxed">
                {describeEvent(e, g.seats[e.seat].name, bb, unit)}
              </p>
            ))}
          </div>
        )
      })}
      {g.over && g.result && (
        <div className="pt-1 border-t border-border-subtle">
          {g.result.refund && (
            <p className="text-[11px] text-text-muted">
              {g.seats[g.result.refund.seat].name} recebe de volta {fmtChips(g.result.refund.amount, bb, unit)}
              {unit === 'bb' ? ' bb' : ''} (não pago)
            </p>
          )}
          {g.result.winners.map((w) => (
            <p key={w.seat} className="text-[11px] text-accent-emerald">
              {g.seats[w.seat].name} ganha {fmtChips(w.amount, bb, unit)}{unit === 'bb' ? ' bb' : ''}
              {w.handName ? ` com ${w.handName}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HandLog({ games, unit, onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[75vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-bold text-text-primary">Histórico</h3>
          <button aria-label="Fechar" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>
        {games.length === 0 && <p className="text-xs text-text-muted">Nenhuma mão ainda.</p>}
        {games.map((g) => (
          <HandBlock key={g.handNumber} g={g} unit={unit} />
        ))}
      </div>
    </div>,
    document.body,
  )
}
