// ============================================================
// Barra de acoes do heroi (zona do polegar): Fold / Check-Call / Bet-Raise
// com slider, presets e all-in. Limites vem de legalActions do motor.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import PlayingCard from '@/components/poker/PlayingCard'
import { fromInt } from '@/engine/cards'
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
  // O seletor de aposta comeca recolhido: so Fold / Check-Call / Aumentar ficam fixos na tela
  // (barra baixa, a mesa nao fica coberta). Tocar em Aumentar abre o seletor; tocar de novo confirma.
  const [sizing, setSizing] = useState(false)
  // Fold com check de graca e quase sempre um toque acidental: o 1o toque arma, o 2o confirma.
  const [foldArmed, setFoldArmed] = useState(false)

  // reinicia o valor sugerido a cada nova decisao
  useEffect(() => {
    setSizing(false)
    setFoldArmed(false)
    setAmount(la.minTo)
  }, [game.history.length, la.minTo])

  useEffect(() => {
    if (!foldArmed) return
    const t = setTimeout(() => setFoldArmed(false), 2500)
    return () => clearTimeout(t)
  }, [foldArmed])

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
    <div className="relative">
      {la.canRaise && sizing && (
        // Flutua POR CIMA da mesa (nao empurra o layout): a barra e a mesa mantem o tamanho.
        // As cartas do heroi aparecem aqui porque o painel cobre a parte de baixo da mesa.
        <div
          className="absolute bottom-full inset-x-0 mb-2 z-20 rounded-xl border border-border-default p-2.5 space-y-2 shadow-xl"
          style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        >
          <div className="flex items-center gap-2">
            {seat.cards && (
              <div className="flex gap-1 shrink-0">
                <PlayingCard card={fromInt(seat.cards[0])} size="xs" />
                <PlayingCard card={fromInt(seat.cards[1])} size="xs" />
              </div>
            )}
            <span className="text-[11px] text-text-muted">sua mão</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {presets.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setAmount(p.to)}
                  className={cn(
                    'px-3 min-h-[40px] rounded-lg text-[11px] font-mono border transition-colors',
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
                  'px-3 min-h-[40px] rounded-lg text-[11px] font-mono border transition-colors',
                  isAllIn
                    ? 'bg-accent-crimson/20 border-accent-crimson/50 text-accent-crimson'
                    : 'bg-bg-base border-border-default text-text-secondary active:bg-bg-overlay',
                )}
              >
                All-in
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-mono font-bold text-accent-gold">
                {fmtChips(amount, bb, unit)}
                {unit === 'bb' ? ' bb' : ''}
              </span>
              <button
                aria-label="Fechar seletor de aposta"
                onClick={() => setSizing(false)}
                className="min-h-[40px] px-2 text-[11px] text-text-muted underline underline-offset-2"
              >
                fechar
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Diminuir aposta"
              onClick={() => setAmount((a) => clamp(a - bb / 2))}
              className="w-11 h-11 rounded-lg bg-bg-base border border-border-default text-text-primary text-lg leading-none active:bg-bg-overlay"
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
              className="w-11 h-11 rounded-lg bg-bg-base border border-border-default text-text-primary text-lg leading-none active:bg-bg-overlay"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="lg"
          variant="danger"
          className="whitespace-nowrap px-2"
          onClick={() => {
            if (la.canCheck && !foldArmed) { setFoldArmed(true); return }
            onAct({ type: 'fold' })
          }}
        >
          {foldArmed ? 'Fold mesmo?' : 'Fold'}
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
          className="whitespace-nowrap px-2"
          disabled={!la.canRaise}
          onClick={() => (sizing ? onAct({ type: 'raise', to: clamp(amount) }) : setSizing(true))}
        >
          {sizing ? (isAllIn ? 'All-in' : `Confirmar ${fmtChips(amount, bb, unit)}`) : raiseLabel}
        </Button>
      </div>
    </div>
  )
}
