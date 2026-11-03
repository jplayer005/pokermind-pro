// ============================================================
// Grade 13x13 para PINTAR um range: toque ou arraste para pintar, arraste a partir de uma mao ja
// pintada para apagar. Depois de conferir, mostra o que acertou, o que faltou e o que sobrou.
// ============================================================
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { generateHandGrid } from '@/lib/poker'
import type { PaintScore } from '@/engine/ranges/painter'

const GRID = generateHandGrid()

interface Props {
  painted: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  /** Resultado da conferencia; com ele a grade trava e mostra acertos, faltas e sobras. */
  result?: PaintScore | null
}

function cellClass(hand: string, painted: boolean, result?: PaintScore | null) {
  if (!result) {
    return painted
      ? 'bg-accent-gold text-black border-accent-gold'
      : 'bg-bg-base text-text-muted border-border-subtle hover:border-accent-gold/50'
  }
  if (result.hits.includes(hand)) return 'bg-accent-emerald text-black border-accent-emerald'
  if (result.extra.includes(hand)) return 'bg-orange-400 text-black border-orange-400'
  if (result.missed.includes(hand)) return 'bg-transparent text-accent-crimson border-accent-crimson border-2'
  return 'bg-bg-base text-text-muted/60 border-border-subtle'
}

export default function PaintGrid({ painted, onChange, result }: Props) {
  const mode = useRef<'paint' | 'erase' | null>(null)
  const current = useRef<Set<string>>(new Set(painted))
  useEffect(() => { current.current = new Set(painted) }, [painted])
  const locked = !!result

  const handAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y) as HTMLElement | null)?.closest('[data-hand]')?.getAttribute('data-hand') ?? null
  const lastPoint = useRef<{ x: number; y: number } | null>(null)

  /** Um deslize rapido salta celulas (o navegador so emite alguns pontos): percorre o caminho em passos curtos. */
  const sweepTo = (x: number, y: number) => {
    const from = lastPoint.current ?? { x, y }
    const steps = Math.max(1, Math.ceil(Math.hypot(x - from.x, y - from.y) / 6))
    for (let i = 1; i <= steps; i++) {
      const h = handAt(from.x + ((x - from.x) * i) / steps, from.y + ((y - from.y) * i) / steps)
      if (h) apply(h)
    }
    lastPoint.current = { x, y }
  }

  const apply = (hand: string) => {
    const has = current.current.has(hand)
    if ((mode.current === 'paint' && has) || (mode.current === 'erase' && !has)) return
    const next = new Set(current.current)
    if (mode.current === 'paint') next.add(hand)
    else next.delete(hand)
    current.current = next
    onChange(next)
  }

  return (
    <div
      role="grid"
      aria-label="Grade de mãos: toque ou arraste para pintar o range"
      className="select-none rounded-xl border border-border-default bg-bg-elevated/40 p-1"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        if (locked) return
        const h = handAt(e.clientX, e.clientY)
        if (!h) return
        mode.current = current.current.has(h) ? 'erase' : 'paint'
        e.currentTarget.setPointerCapture(e.pointerId)
        lastPoint.current = { x: e.clientX, y: e.clientY }
        apply(h)
      }}
      onPointerMove={(e) => {
        if (!mode.current) return
        sweepTo(e.clientX, e.clientY)
      }}
      onPointerUp={() => { mode.current = null; lastPoint.current = null }}
      onPointerCancel={() => { mode.current = null; lastPoint.current = null }}
    >
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}>
        {GRID.flat().map((hand) => {
          const on = painted.has(hand)
          return (
            <button
              key={hand}
              type="button"
              role="gridcell"
              data-hand={hand}
              disabled={locked}
              aria-pressed={on}
              aria-label={`${hand}${on ? ', pintada' : ''}`}
              // toque e arrasto usam o ponteiro; o clique so chega do teclado (detail 0)
              onClick={(e) => {
                if (e.detail !== 0 || locked) return
                mode.current = current.current.has(hand) ? 'erase' : 'paint'
                apply(hand)
                mode.current = null
              }}
              className={cn(
                'aspect-square rounded-[3px] border font-mono font-bold leading-none transition-colors',
                'text-[7px] min-[400px]:text-[8px] sm:text-[10px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold',
                cellClass(hand, on, result),
              )}
            >
              {hand}
            </button>
          )
        })}
      </div>
    </div>
  )
}
