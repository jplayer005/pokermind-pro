// ============================================================
// POKERMIND PRO - PINTE O RANGE
// Voce pinta na grade 13x13 o range de um spot (abrir de uma posicao, 3-bet, defesa do BB, push/fold),
// o app confere contra as tabelas e mostra o que faltou e o que sobrou. Os spots erros voltam pela
// repeticao espacada (a mesma dos flashcards) e entram nos vazamentos do Perfil.
// ============================================================
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Check, Eraser, RotateCcw, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, SectionHeader } from '@/components/ui'
import PaintGrid from '@/components/poker/PaintGrid'
import { RangeGridStatic } from '@/components/poker/RangeGrid'
import ShareButton from '@/components/share/ShareButton'
import { GRADE_UI } from '@/components/table/CoachToast'
import {
  allSpots, comboCount, pickNextSpot, scorePaint, type PaintScore, type PaintSpot,
} from '@/engine/ranges/painter'
import { useLeakStore, usePlayStore, useSpacedRepetitionStore } from '@/store'
import type { Action } from '@/types'

const spotKey = (id: string) => `range:${id}`
const pct = (x: number) => `${Math.round(x * 100)}%`

export default function RangePainter() {
  const location = useLocation()
  const spots = useMemo(() => allSpots(), [])
  const { sm2Data, updateSM2, getDueQuestions } = useSpacedRepetitionStore()

  const pick = (last?: string): PaintSpot => {
    const seen = new Set(Object.keys(sm2Data).filter((k) => k.startsWith('range:')).map((k) => k.slice(6)))
    const due = new Set(getDueQuestions().filter((k) => k.startsWith('range:')).map((k) => k.slice(6)))
    return pickNextSpot(spots, { seen, due, last })
  }

  // abre direto num spot quando vem dos vazamentos do Perfil; senao pela repeticao espacada
  const fromLeak = (location.state as { spotId?: string } | null)?.spotId
  const [spot, setSpot] = useState<PaintSpot>(() => spots.find((s) => s.id === fromLeak) ?? pick())
  const [painted, setPainted] = useState<ReadonlySet<string>>(new Set())
  const [result, setResult] = useState<PaintScore | null>(null)
  const [session, setSession] = useState({ done: 0, passed: 0 })
  const last = useRef(spot.id)

  useEffect(() => { last.current = spot.id }, [spot.id])

  const dueCount = useMemo(
    () => getDueQuestions().filter((k) => k.startsWith('range:')).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sm2Data],
  )

  const go = (s: PaintSpot) => {
    setSpot(s)
    setPainted(new Set())
    setResult(null)
  }

  const check = () => {
    if (result || painted.size === 0) return
    const r = scorePaint(painted, spot.truth)
    setResult(r)
    setSession((s) => ({ done: s.done + 1, passed: s.passed + (r.passed ? 1 : 0) }))
    // repeticao espacada, vazamentos e XP: como as outras decisoes de treino
    updateSM2(spotKey(spot.id), r.passed)
    useLeakStore.getState().record({
      ctx: `RANGE_${spot.id}`, tag: r.passed ? '' : `RANGE_${spot.id.toUpperCase()}_${r.tag}`, grade: r.grade, evLossBB: null,
    })
    usePlayStore.getState().creditHand([r.grade])
  }

  const paintedCombos = [...painted].reduce((a, h) => a + comboCount(h), 0)
  const truthMap = useMemo(() => Object.fromEntries(spot.truth.map((h) => [h, 'raise' as Action])), [spot])
  const ui = result ? GRADE_UI[result.grade] : null

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 pb-8 pt-4">
      <SectionHeader title="Pinte o range" subtitle="Pinte de memória, confira e veja o que faltou. Os spots que você erra voltam para revisar." />

      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-display font-bold text-text-primary">{spot.title}</p>
            <p className="text-xs text-text-muted">{spot.subtitle}</p>
          </div>
          <label className="shrink-0 text-[10px] text-text-muted">
            <span className="sr-only">Escolher o spot</span>
            <select
              value={spot.id}
              onChange={(e) => go(spots.find((s) => s.id === e.target.value) ?? spot)}
              className="max-w-[11.5rem] rounded-lg border border-border-default bg-bg-base px-2 py-1.5 text-xs text-text-primary"
            >
              {spots.map((s) => (
                <option key={s.id} value={s.id}>{s.title}{s.scenario === 'pushfold' ? `, ${s.subtitle.split(' ')[0]} bb` : ''}</option>
              ))}
            </select>
          </label>
        </div>

        <PaintGrid painted={painted} onChange={setPainted} result={result} />

        {!result ? (
          <>
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span>{painted.size} mãos pintadas</span>
              <span className="font-mono">{pct(paintedCombos / 1326)} das mãos</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => setPainted(new Set())} disabled={painted.size === 0}>
                <Eraser size={14} /> Limpar
              </Button>
              <Button onClick={() => go(pick(spot.id))}>
                <SkipForward size={14} /> Pular
              </Button>
              <Button variant="primary" onClick={check} disabled={painted.size === 0}>
                <Check size={14} /> Conferir
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {ui && (
              <div className={cn('rounded-xl border p-3', ui.box)}>
                <p className={cn('text-sm font-display font-bold', ui.text)}>
                  {result.passed ? 'Acertou' : 'Precisa rever'}: {pct(result.accuracy)} de precisão ({ui.label})
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {result.missed.length === 0 && result.extra.length === 0
                    ? 'Range perfeito.'
                    : `${result.missed.length} ${result.missed.length === 1 ? 'mão faltou' : 'mãos faltaram'} e ${result.extra.length} ${result.extra.length === 1 ? 'sobrou' : 'sobraram'}.${
                        result.passed ? '' : result.tag === 'TIGHT' ? ' Você ficou apertado demais.' : ' Você ficou largo demais.'
                      }`}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-accent-emerald" /> acertou</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-accent-crimson" /> faltou</span>
              <span className="flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-400" /> sobrou</span>
            </div>

            {result.missed.length > 0 && (
              <p className="text-xs text-text-secondary">
                <b className="text-accent-crimson">Faltaram:</b> <span className="font-mono">{result.missed.join(' ')}</span>
              </p>
            )}
            {result.extra.length > 0 && (
              <p className="text-xs text-text-secondary">
                <b className="text-orange-400">Sobraram:</b> <span className="font-mono">{result.extra.join(' ')}</span>
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => { setPainted(new Set()); setResult(null) }}>
                <RotateCcw size={14} /> Tentar de novo
              </Button>
              <Button variant="primary" onClick={() => go(pick(spot.id))}>
                Próximo spot
              </Button>
            </div>
            <ShareButton
              className="w-full"
              label="Compartilhar o range correto"
              title={`${spot.title}`}
              subtitle={spot.subtitle}
              text={`${spot.title}, ${spot.subtitle}. Range do PokerMind Pro.`}
            >
              <RangeGridStatic range={truthMap} cell={49} />
            </ShareButton>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] text-text-muted">
        Hoje: {session.passed} de {session.done} spots certos
        {dueCount > 0 ? `. ${dueCount} ${dueCount === 1 ? 'spot' : 'spots'} para revisar.` : '.'}
      </p>
    </div>
  )
}
