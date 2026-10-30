// ============================================================
// Modo quiz: a mesa pausa diante de uma aposta grande e pede a LEITURA do vilao antes de agir.
//  1. que tipo de mao ele tem mais vezes (pelo range montado das acoes dele);
//  2. quanta equity voce tem contra esse range.
// Depois mostra o range suposto, a equity real e a necessaria para pagar. So aparece em
// decisao do heroi e nunca decide por ele: "Continuar" devolve a mesa com os botoes de acao.
// ============================================================
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RANK_CHARS } from '@/engine/cards'
import { BAND_INFO, type Band } from '@/engine/coach/readQuiz'
import type { GameState } from '@/engine/game/types'
import type { QuizState } from '@/hooks/useTableEngine'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { GRADE_UI } from './CoachToast'

const SUITS = ['♠', '♥', '♦', '♣']
const RED = new Set([1, 2])
const Card = ({ c }: { c: number }) => (
  <span className={cn('font-mono font-bold', RED.has(c & 3) ? 'text-accent-crimson' : 'text-text-primary')}>
    {RANK_CHARS[c >> 2]}{SUITS[c & 3]}
  </span>
)

const pct = (x: number) => `${Math.round(x * 100)}%`
const fmtBB = (chips: number, bb: number) => {
  const v = chips / bb
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

interface Props {
  game: GameState
  quiz: QuizState
  onAnswer: (picked: Band, guess: number) => void
  onClose: () => void
}

export default function ReadRangeSheet({ game, quiz, onAnswer, onClose }: Props) {
  const { q, result } = quiz
  const [picked, setPicked] = useState<Band | null>(null)
  const [guess, setGuess] = useState(50)
  const hero = game.seats.find((s) => s.isHero)
  const villain = game.seats[q.seat]
  const bb = game.cfg.bb

  useEscapeKey(onClose)

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Leia o range do vilão" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65">
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
              <Eye size={15} className="text-accent-gold" /> Pausa: leia o vilão
            </h3>
            <p className="text-[11px] text-text-secondary mt-0.5">
              {villain?.name ?? 'Vilão'} aposta {fmtBB(q.toCall, bb)} bb para você pagar; com a aposta, o pote está em {fmtBB(q.pot, bb)} bb.
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {hero?.cards && (<>Você: <Card c={hero.cards[0]} /> <Card c={hero.cards[1]} /></>)}
              {game.board.length > 0 && (
                <>  ·  Board: {game.board.map((c, i) => (<span key={i}><Card c={c} />{' '}</span>))}</>
              )}
            </p>
          </div>
          <button aria-label="Pular a pausa" onClick={onClose} className="p-1 text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        </div>

        {!result ? (
          <>
            <div>
              <p className="text-xs font-body text-text-secondary mb-1.5">1. Que mão ele tem mais vezes?</p>
              <div className="grid grid-cols-2 gap-2">
                {BAND_INFO.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPicked(b.id)}
                    aria-pressed={picked === b.id}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left transition-colors',
                      picked === b.id
                        ? 'border-accent-gold bg-accent-gold/15 text-text-primary'
                        : 'border-border-default bg-bg-base text-text-secondary hover:border-border-strong',
                    )}
                  >
                    <span className="block text-xs font-display font-bold">{b.label}</span>
                    <span className="block text-[10px] text-text-muted">{b.hint}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-body text-text-secondary">2. Qual a sua equity contra o range dele?</p>
              <p className="text-center text-2xl font-mono font-bold text-text-primary my-1">{guess}%</p>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={guess}
                onChange={(e) => setGuess(Number(e.target.value))}
                aria-label="Sua equity estimada"
                className="w-full accent-accent-gold"
              />
              <div className="flex justify-between text-[10px] text-text-muted font-mono"><span>0%</span><span>50%</span><span>100%</span></div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border-default py-2.5 text-xs text-text-secondary">
                Pular
              </button>
              <button
                type="button"
                disabled={!picked}
                onClick={() => picked && onAnswer(picked, guess / 100)}
                className="flex-[2] rounded-xl bg-accent-gold py-2.5 text-xs font-display font-bold text-black disabled:opacity-40"
              >
                Confirmar leitura
              </button>
            </div>
          </>
        ) : (
          <Reveal quiz={quiz} onClose={onClose} />
        )}
      </div>
    </div>,
    document.body,
  )
}

function Reveal({ quiz, onClose }: { quiz: QuizState; onClose: () => void }) {
  const { q, result } = quiz
  if (!result) return null
  const ui = GRADE_UI[result.grade]
  const diff = Math.round(Math.abs(result.error) * 100)
  const verdict = result.eqHit
    ? 'Boa leitura: dentro de 10 pontos.'
    : result.error > 0
      ? `Você foi otimista: ${diff} pontos acima do real.`
      : `Você foi pessimista: ${diff} pontos abaixo do real.`
  // com ICM, o que decide e a equity necessaria em ICM, nao a de fichas
  const needed = q.icm ? q.icm.icmNeeded : q.needed
  const profitable = q.equity >= needed

  return (
    <>
      <div className={cn('rounded-xl border p-3', ui.box)}>
        <p className={cn('text-xs font-display font-bold', ui.text)}>{ui.label}</p>
        <p className="text-[11px] text-text-secondary mt-0.5">
          Você chutou {pct(result.guess)}, a equity estimada é {pct(q.equity)}. {verdict}
        </p>
      </div>

      <div>
        <p className="text-xs font-body text-text-secondary mb-1.5">
          O que o range dele tem {result.bandHit ? '(você acertou a faixa)' : '(a faixa mais provável era outra)'}
        </p>
        <div className="space-y-1.5">
          {BAND_INFO.map((b) => (
            <div key={b.id}>
              <div className="flex justify-between text-[11px]">
                <span className={cn(b.id === result.top ? 'text-text-primary font-bold' : 'text-text-secondary')}>
                  {b.label}{b.id === result.picked ? ' (sua escolha)' : ''}
                </span>
                <span className="font-mono text-text-muted">{pct(q.bands[b.id])}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={cn('h-full', b.id === result.top ? 'bg-accent-gold' : 'bg-white/40')}
                  style={{ width: `${Math.max(2, Math.round(q.bands[b.id] * 100))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-default bg-bg-base p-3 space-y-1">
        <p className="text-[11px] text-text-secondary">
          Para pagar você precisa de <b className="text-text-primary">{pct(needed)}</b> de equity{q.icm ? ' (em ICM)' : ''} e tem{' '}
          <b className="text-text-primary">{pct(q.equity)}</b>:{' '}
          {profitable
            ? q.icm ? 'pagar compensa, mesmo com o risco de ICM.' : 'pagar tem EV positivo, em teoria.'
            : q.icm ? 'pagar perde prêmio em média: o risco de ICM pesa mais que as fichas.' : 'pagar perde fichas em média.'}
        </p>
        {q.icm && (
          <div className="rounded-lg border border-accent-gold/35 bg-accent-gold/10 p-2 space-y-1">
            <p className="text-[11px] font-display font-bold text-accent-gold">Pressão de ICM</p>
            <p className="text-[11px] text-text-secondary">
              Só em fichas você precisaria de {pct(q.icm.chipNeeded)}; em ICM precisa de {pct(q.icm.icmNeeded)}, um prêmio de risco de{' '}
              {Math.round(q.icm.premium * 100)} pontos.{' '}
              {q.icm.villainCoversHero
                ? 'Ele te cobre: se você perder, está eliminado.'
                : 'Você cobre ele: perder não te elimina, mas o prêmio que você arrisca pesa mais do que o que ganha.'}
            </p>
            <p className="text-[11px] text-text-muted">
              Seu prêmio esperado: largar {q.icm.fold.toFixed(1)}%, ganhar {q.icm.win.toFixed(1)}%, perder {q.icm.lose.toFixed(1)}% do total.
            </p>
          </div>
        )}
        <p className="text-[11px] text-text-muted">
          Como o range foi montado: ele {q.steps.join(', ')}. {q.combos} combos. Estimativa de treino, não solver.
        </p>
      </div>

      <button type="button" onClick={onClose} className="w-full rounded-xl bg-accent-gold py-2.5 text-xs font-display font-bold text-black">
        Continuar e decidir
      </button>
    </>
  )
}
