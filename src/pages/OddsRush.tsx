// ============================================================
// POKERMIND PRO - ODDS RUSH
// Rodadas de 60 s de perguntas de odds geradas na hora: outs, regra do 2 e 4, pot odds e
// pagar/largar. O nivel sobe com acertos seguidos e desce com erro. O relogio para enquanto
// voce le a explicacao de um erro; os erros viram vazamentos (taxa de erro por contexto).
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Play, Timer, Trophy, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, SectionHeader } from '@/components/ui'
import { RANK_CHARS } from '@/engine/cards'
import { QUESTION_TYPES, makeQuestion, type Level, type QType, type Question } from '@/engine/odds/questions'
import { ROUND_SECONDS, adapt, pickType, summarize, type Answer, type Mode } from '@/engine/odds/round'
import { useLeakStore, useOddsStore, usePlayStore } from '@/store'
import type { Grade } from '@/engine/coach/types'

const SUITS = ['♠', '♥', '♦', '♣']
const RED = new Set([1, 2])
const PlayingCard = ({ c }: { c: number }) => (
  <span
    className={cn(
      'inline-flex h-12 w-9 flex-col items-center justify-center rounded-md border border-border-default bg-bg-base font-mono text-sm font-bold leading-none',
      RED.has(c & 3) ? 'text-accent-crimson' : 'text-text-primary',
    )}
  >
    <span>{RANK_CHARS[c >> 2]}</span>
    <span className="text-base">{SUITS[c & 3]}</span>
  </span>
)

const MODES: { id: Mode; label: string }[] = [
  { id: 'mixed', label: 'Misto' },
  ...QUESTION_TYPES.map((t) => ({ id: t.id as Mode, label: t.label })),
]

const CORRECT_FLASH_MS = 450
/** Moldura das telas: coluna centralizada com margem, como as outras paginas do app. */
const PAGE = 'max-w-2xl mx-auto w-full px-4 pt-4 pb-6 space-y-4'

type Phase = 'menu' | 'play' | 'done'

export default function OddsRush() {
  const navigate = useNavigate()
  const { best, levels: savedLevels, rounds } = useOddsStore()
  const [phase, setPhase] = useState<Phase>('menu')
  const [mode, setMode] = useState<Mode>('mixed')

  // ---- estado da rodada
  const [q, setQ] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [remainingMs, setRemainingMs] = useState(ROUND_SECONDS * 1000)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [isRecord, setIsRecord] = useState(false)

  const levelsRef = useRef<Record<string, Level>>({})
  const streaksRef = useRef<Record<string, number>>({})
  const lastTypeRef = useRef<QType | undefined>(undefined)
  const startRef = useRef(0)
  const remainingRef = useRef(ROUND_SECONDS * 1000)
  const phaseRef = useRef<Phase>('menu')
  phaseRef.current = phase
  const answersRef = useRef<Answer[]>([])
  const modeRef = useRef<Mode>('mixed')
  modeRef.current = mode

  // relogio e a explicacao de um erro: o tempo para enquanto a explicacao esta na tela
  const reading = picked !== null && q !== null && picked !== q.correct
  const readingRef = useRef(false)
  readingRef.current = reading

  const nextQuestion = useCallback(() => {
    const type = pickType(modeRef.current, Math.random, lastTypeRef.current)
    lastTypeRef.current = type
    const level = levelsRef.current[type] ?? 1
    setQ(makeQuestion(type, level))
    setPicked(null)
    startRef.current = Date.now()
  }, [])

  const finish = useCallback(() => {
    const list = answersRef.current
    const sum = summarize(list)
    const record = useOddsStore.getState().finishRound(modeRef.current, sum.right, levelsRef.current)
    setIsRecord(record && sum.right > 0)
    // as respostas contam como decisoes: XP com o teto diario, como na mesa
    usePlayStore.getState().creditHand(list.map((a): Grade => (a.correct ? 'best' : 'mistake')))
    setPhase('done')
  }, [])

  const start = () => {
    const lv: Record<string, Level> = {}
    for (const t of QUESTION_TYPES) lv[t.id] = (Math.min(3, Math.max(1, savedLevels[t.id] ?? 1)) as Level)
    levelsRef.current = lv
    streaksRef.current = {}
    lastTypeRef.current = undefined
    answersRef.current = []
    setAnswers([])
    remainingRef.current = ROUND_SECONDS * 1000
    setRemainingMs(ROUND_SECONDS * 1000)
    setIsRecord(false)
    setPhase('play')
    nextQuestion()
  }

  // contagem regressiva (so corre quando ninguem esta lendo uma explicacao)
  useEffect(() => {
    if (phase !== 'play') return
    let last = Date.now()
    const iv = setInterval(() => {
      const now = Date.now()
      const dt = now - last
      last = now
      if (readingRef.current) return
      remainingRef.current = Math.max(0, remainingRef.current - dt)
      setRemainingMs(remainingRef.current)
      if (remainingRef.current <= 0) {
        clearInterval(iv)
        finish() // fora de qualquer updater: roda uma vez so, mesmo em StrictMode
      }
    }, 100)
    return () => clearInterval(iv)
  }, [phase, finish])

  const answer = (idx: number) => {
    if (!q || picked !== null) return
    const correct = idx === q.correct
    const a: Answer = { type: q.type, correct, ms: Date.now() - startRef.current }
    answersRef.current = [...answersRef.current, a]
    setAnswers(answersRef.current)
    setPicked(idx)
    const ad = adapt(levelsRef.current[q.type] ?? 1, streaksRef.current[q.type] ?? 0, correct)
    levelsRef.current[q.type] = ad.level
    streaksRef.current[q.type] = ad.streak
    useLeakStore.getState().record({
      ctx: `ODDS_${q.type.toUpperCase()}`,
      tag: correct ? '' : `ODDS_${q.type.toUpperCase()}_WRONG`,
      grade: correct ? 'best' : 'mistake',
      evLossBB: null,
    })
    if (correct) setTimeout(() => { if (phaseRef.current === 'play') nextQuestion() }, CORRECT_FLASH_MS)
  }

  // ---------------- menu ----------------
  if (phase === 'menu') {
    return (
      <div className={PAGE}>
        <SectionHeader title="Odds Rush" subtitle="60 segundos de odds de cabeça. Mais rápido a cada rodada, com a conta explicada quando você erra." />
        <Card className="p-4 space-y-4">
          <div>
            <p className="text-xs text-text-muted mb-2 font-body">O que treinar</p>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-body transition-colors',
                    mode === m.id
                      ? 'border-accent-gold bg-accent-gold/15 text-text-primary'
                      : 'border-border-default text-text-secondary hover:border-border-strong',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              {mode === 'mixed' ? 'Os quatro tipos alternados.' : QUESTION_TYPES.find((t) => t.id === mode)?.hint}
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-base px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs text-text-secondary"><Trophy size={14} className="text-accent-gold" /> Seu recorde</span>
            <span className="font-mono text-sm font-bold text-text-primary">{best[mode] ?? 0}</span>
          </div>
          <Button variant="primary" size="lg" className="w-full" onClick={start}>
            <Play size={16} /> Começar rodada de {ROUND_SECONDS}s
          </Button>
          <p className="text-[11px] text-text-muted">
            O relógio para enquanto você lê a explicação de um erro. Três acertos seguidos num tipo sobem o nível; um erro desce.
            {rounds > 0 ? ` Rodadas jogadas: ${rounds}.` : ''}
          </p>
        </Card>
      </div>
    )
  }

  // ---------------- resultado ----------------
  if (phase === 'done') {
    const sum = summarize(answers)
    return (
      <div className={PAGE}>
        <SectionHeader title="Fim da rodada" subtitle={MODES.find((m) => m.id === mode)?.label} />
        <Card className="p-4 space-y-4 text-center">
          <div>
            <p className="text-5xl font-display font-bold text-text-primary">{sum.right}</p>
            <p className="text-xs text-text-muted">acertos em {ROUND_SECONDS}s</p>
            {isRecord && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-gold/15 px-3 py-1 text-xs font-display font-bold text-accent-gold">
                <Trophy size={13} /> Novo recorde!
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-left">
            <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
              <p className="text-[11px] text-text-muted">Precisão</p>
              <p className="font-mono text-sm font-bold text-text-primary">{Math.round(sum.accuracy * 100)}%</p>
            </div>
            <div className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
              <p className="text-[11px] text-text-muted">Tempo por pergunta</p>
              <p className="font-mono text-sm font-bold text-text-primary">{(sum.avgMs / 1000).toFixed(1)}s</p>
            </div>
          </div>
          <div className="space-y-1.5 text-left">
            {QUESTION_TYPES.filter((t) => sum.byType[t.id].n > 0).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{t.label}</span>
                <span className="font-mono text-text-primary">{sum.byType[t.id].right}/{sum.byType[t.id].n}</span>
              </div>
            ))}
            {sum.total === 0 && <p className="text-xs text-text-muted">Nenhuma pergunta respondida.</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={start}>Jogar de novo</Button>
            <Button onClick={() => setPhase('menu')}>Voltar</Button>
          </div>
          {sum.total - sum.right > 0 && (
            <button type="button" onClick={() => navigate('/profile')} className="text-[11px] text-text-muted underline">
              Os erros entraram nos seus vazamentos (Perfil)
            </button>
          )}
        </Card>
      </div>
    )
  }

  // ---------------- rodada ----------------
  const score = answers.filter((a) => a.correct).length
  const secs = Math.ceil(remainingMs / 1000)
  return (
    <div className={cn(PAGE, 'space-y-3')}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-text-primary">
          <Timer size={15} className={secs <= 10 ? 'text-accent-crimson' : 'text-accent-gold'} /> {secs}s
        </span>
        <span className="flex items-center gap-1.5 font-mono text-sm font-bold text-text-primary">
          <Zap size={15} className="text-accent-gold" /> {score}
        </span>
        <button type="button" onClick={() => setPhase('menu')} className="text-xs text-text-muted underline">Sair</button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn('h-full transition-[width] duration-100', secs <= 10 ? 'bg-accent-crimson' : 'bg-accent-gold')}
          style={{ width: `${(remainingMs / (ROUND_SECONDS * 1000)) * 100}%` }}
        />
      </div>

      {q && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-text-muted">
              {QUESTION_TYPES.find((t) => t.id === q.type)?.label} · nível {q.level}
            </span>
          </div>
          {q.hole && q.board && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">{q.hole.map((c) => <PlayingCard key={c} c={c} />)}</div>
              <span className="text-text-muted">+</span>
              <div className="flex gap-1">{q.board.map((c) => <PlayingCard key={c} c={c} />)}</div>
            </div>
          )}
          <ul className="space-y-0.5">
            {q.facts.map((f) => <li key={f} className="text-xs text-text-secondary">{f}</li>)}
          </ul>
          <p className="text-base font-display font-bold text-text-primary">{q.prompt}</p>
          <div className={cn('grid gap-2', q.options.length > 2 ? 'grid-cols-2' : 'grid-cols-2')}>
            {q.options.map((o, i) => {
              const answered = picked !== null
              const isCorrect = i === q.correct
              return (
                <button
                  key={o}
                  type="button"
                  disabled={answered}
                  onClick={() => answer(i)}
                  className={cn(
                    'rounded-xl border px-3 py-3.5 text-base font-mono font-bold transition-colors',
                    !answered && 'border-border-default bg-bg-base text-text-primary hover:border-accent-gold/60',
                    answered && isCorrect && 'border-accent-emerald bg-accent-emerald/15 text-accent-emerald',
                    answered && !isCorrect && i === picked && 'border-accent-crimson bg-accent-crimson/15 text-accent-crimson',
                    answered && !isCorrect && i !== picked && 'border-border-default bg-bg-base text-text-muted',
                  )}
                >
                  {answered && isCorrect && <Check size={14} className="mr-1 inline" />}
                  {answered && !isCorrect && i === picked && <X size={14} className="mr-1 inline" />}
                  {o}
                </button>
              )
            })}
          </div>
          {reading && (
            <div className="space-y-2 rounded-xl border border-accent-gold/35 bg-accent-gold/10 p-3">
              <p className="text-[11px] font-display font-bold text-accent-gold">A conta (o relógio está parado)</p>
              <p className="text-xs text-text-secondary">{q.explain}</p>
              <Button variant="primary" className="w-full" onClick={nextQuestion}>Próxima</Button>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
