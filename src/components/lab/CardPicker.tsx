// ============================================================
// Seletor de cartas (formulario "Recriar minha mao"): mostra as cartas escolhidas e abre uma grade de
// 52 cartas (4 naipes x 13 valores). Cartas ja usadas em outro campo ficam bloqueadas.
// ============================================================
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RANK_CHARS } from '@/engine/cards'

const SUITS = ['♠', '♥', '♦', '♣']
const RED = new Set([1, 2])
const RANKS_DESC = Array.from({ length: 13 }, (_, i) => 12 - i)

export const cardLabel = (c: number) => `${RANK_CHARS[c >> 2]}${SUITS[c & 3]}`

function Chip({ c, onRemove }: { c: number; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remover ${cardLabel(c)}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border-default bg-bg-base px-2 py-1 font-mono text-sm font-bold',
        RED.has(c & 3) ? 'text-accent-crimson' : 'text-text-primary',
      )}
    >
      {cardLabel(c)} <X size={10} className="text-text-muted" />
    </button>
  )
}

interface Props {
  label: string
  /** Quantas cartas cabem neste campo. */
  max: number
  value: number[]
  /** Cartas usadas em outros campos (bloqueadas aqui). */
  taken: readonly number[]
  onChange: (cards: number[]) => void
  hint?: string
}

export default function CardPicker({ label, max, value, taken, onChange, hint }: Props) {
  const [open, setOpen] = useState(false)
  const blocked = new Set(taken)
  const full = value.length >= max

  const toggle = (c: number) => {
    if (value.includes(c)) onChange(value.filter((x) => x !== c))
    else if (!full) onChange([...value, c])
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-text-muted">{label}</p>
        <button type="button" onClick={() => setOpen((o) => !o)} className="-my-2 shrink-0 whitespace-nowrap py-2 text-xs text-accent-gold">
          {open ? 'Fechar cartas' : value.length === 0 ? 'Escolher cartas' : 'Editar'}
        </button>
      </div>
      <div className="mt-1 flex min-h-[30px] flex-wrap items-center gap-1.5">
        {value.length === 0 && <span className="text-[11px] text-text-muted">{hint ?? 'Nenhuma'}</span>}
        {value.map((c) => <Chip key={c} c={c} onRemove={() => onChange(value.filter((x) => x !== c))} />)}
      </div>
      {open && (
        <div className="mt-2 rounded-lg border border-border-default bg-bg-base p-2">
          {SUITS.map((suit, s) => (
            <div key={suit} className="flex gap-[3px] py-[2px]">
              {RANKS_DESC.map((r) => {
                const c = r * 4 + s
                const used = blocked.has(c)
                const on = value.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={used || (!on && full)}
                    onClick={() => toggle(c)}
                    aria-label={cardLabel(c)}
                    aria-pressed={on}
                    className={cn(
                      'flex h-8 min-w-0 flex-1 flex-col items-center justify-center rounded font-mono text-[10px] font-bold leading-none',
                      on ? 'bg-accent-gold text-black' : 'bg-white/5',
                      !on && (RED.has(s) ? 'text-accent-crimson' : 'text-text-primary'),
                      (used || (!on && full)) && 'opacity-25',
                    )}
                  >
                    <span>{RANK_CHARS[r]}</span>
                    <span>{suit}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
