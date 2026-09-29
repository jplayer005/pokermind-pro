// ============================================================
// Barra de acoes do heroi (zona do polegar): Fold / Check-Call / Bet-Raise
// com slider, presets e all-in. Limites vem de legalActions do motor.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { legalActions, potTotal } from '@/engine/game/reducer'
import type { Action, GameState } from '@/engine/game/types'
import { fmtChips } from '@/hooks/useTableEngine'

interface Props {
  game: GameState
  unit: 'bb' | 'chips'
  onAct: (a: Action) => void
}

interface Preset {
  label: string
  to: number
}

export default function ActionBar({ game, unit, onAct }: Props) {
  const la = useMemo(() => legalActions(game), [game])
  const seat = game.seats[game.toAct]
  const bb = game.cfg.bb
  const [amount, setAmount] = useState(la.minTo)

  // reinicia o valor sugerido a cada nova decisao
  useEffect(() => {
    setAmount(la.minTo)
  }, [game.history.length, la.minTo])

  const clamp = (v: number) => Math.max(la.minTo, Math.min(la.maxTo, Math.round(v)))
  const pot = potTotal(game)
  const opening = game.currentBet === 0
  const preflop = game.street === 'preflop'

  const presets: Preset[] = useMemo(() => {
    if (!la.canRaise) return []
    const out: Preset[] = []
    if (preflop) {
      const base = game.currentBet <= bb ? bb : game.currentBet
      const mults = game.currentBet <= bb ? [2, 2.5, 3] : [2.5, 3, 4]
      mults.forEach((m) => out.push({ label: `${m}x`, to: base * m }))
    } else {
      const bump = opening ? 0 : game.currentBet
      ;[33, 50, 75, 100].forEach((p) =>
        out.push({ label: `${p}%`, to: bump + (p / 100) * (pot + la.callAmount) }),
      )
    }
    return out.map((p) => ({ ...p, to: clamp(p.to) })).filter((p) => p.to < la.maxTo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [la, preflop, game.currentBet, pot, opening, bb])

  if (!seat) return null
  const isAllIn = amount >= la.maxTo
  const raiseLabel = opening ? 'Apostar' : 'Aumentar'

  return (
    <div className="space-y-2">
      {la.canRaise && (
        <div className="rounded-xl bg-bg-elevated/80 border border-border-default p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setAmount(p.to)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors',
                    amount === p.to
                      ? 'bg-accent-gold/20 border-accent-gold/50 text-accent-gold'
                      : 'bg-bg-base border-border-default text-text-secondary active:bg-bg-overlay',
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setAmount(la.maxTo)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors',
                  isAllIn
                    ? 'bg-accent-crimson/20 border-accent-crimson/50 text-accent-crimson'
                    : 'bg-bg-base border-border-default text-text-secondary active:bg-bg-overlay',
                )}
              >
                All-in
              </button>
            </div>
            <span className="text-sm font-mono font-bold text-accent-gold shrink-0">
              {fmtChips(amount, bb, unit)}
              {unit === 'bb' ? ' bb' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Diminuir aposta"
              onClick={() => setAmount((a) => clamp(a - bb / 2))}
              className="w-8 h-8 rounded-lg bg-bg-base border border-border-default text-text-primary text-lg leading-none active:bg-bg-overlay"
            >
              -
            </button>
            <input
              type="range"
              aria-label="Valor da aposta"
              min={la.minTo}
              max={la.maxTo}
              step={1}
              value={amount}
              onChange={(e) => setAmount(clamp(Number(e.target.value)))}
              className="flex-1 accent-[#f5c542] h-2"
            />
            <button
              aria-label="Aumentar aposta"
              onClick={() => setAmount((a) => clamp(a + bb / 2))}
              className="w-8 h-8 rounded-lg bg-bg-base border border-border-default text-text-primary text-lg leading-none active:bg-bg-overlay"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button size="lg" variant="danger" onClick={() => onAct({ type: 'fold' })}>
          Fold
        </Button>
        {la.canCheck ? (
          <Button size="lg" onClick={() => onAct({ type: 'check' })}>
            Check
          </Button>
        ) : (
          <Button size="lg" onClick={() => onAct({ type: 'call' })}>
            Call {fmtChips(la.callAmount, bb, unit)}
          </Button>
        )}
        <Button
          size="lg"
          variant="primary"
          disabled={!la.canRaise}
          onClick={() => onAct({ type: 'raise', to: clamp(amount) })}
        >
          {isAllIn ? 'All-in' : raiseLabel}
        </Button>
      </div>
    </div>
  )
}
