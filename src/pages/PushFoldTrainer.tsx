// ============================================================
// POKERMIND PRO - DRILL PUSH/FOLD (Nash + ICM)
// Spots resolvidos do treinador-poker, empacotados offline (src/data/spots).
// A nota e pela frequencia do solver; o feedback nunca bloqueia: um toque em
// "Proxima" segue o treino e o "Por que?" e opcional.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Zap, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge, SectionHeader } from '@/components/ui'
import TrainingTable from '@/components/poker/TrainingTable'
import { useTrainingStore } from '@/store'
import { randomCanonical } from '@/engine/cards'
import { loadSpots, type Spot, type SpotBank } from '@/engine/spots'
import {
  FORMATOS, STACKS, formatoPorId, spotAleatorio, posDisplay, type Formato, type SpotRef,
} from '@/engine/spotCatalog'
import {
  gradePushFold, explainPushFold, rotuloAgressivo, type PushFoldEval, type PushFoldGrade,
} from '@/engine/coach/pushfold'

interface Question {
  ref: SpotRef
  stack: number
  spot: Spot
  hand: string
  shownAt: number
}

interface Answered {
  q: Question
  choseAggressive: boolean
  ev: PushFoldEval
}

/** 40% das maos vem da zona cinzenta do spot (onde se aprende); o resto e realista, por combos. */
function pickHand(spot: Spot): string {
  if (Math.random() < 0.4) {
    const R = 'AKQJT98765432'
    const gray: string[] = []
    for (let i = 0; i < 13; i++)
      for (let j = i; j < 13; j++) {
        const hs = i === j ? [R[i] + R[j]] : [R[i] + R[j] + 's', R[i] + R[j] + 'o']
        for (const h of hs) {
          const f = spot.freq(h)
          if (f > 0.02 && f < 0.98) gray.push(h)
        }
      }
    if (gray.length > 0) return gray[Math.floor(Math.random() * gray.length)]
  }
  return randomCanonical()
}

const GRADE_UI: Record<PushFoldGrade, { label: string; variant: 'emerald' | 'gold' | 'crimson'; box: string }> = {
  correct: { label: 'Correto', variant: 'emerald', box: 'bg-accent-emerald/10 border-accent-emerald/30' },
  acceptable: { label: 'Aceitável (spot dividido)', variant: 'gold', box: 'bg-accent-gold/10 border-accent-gold/30' },
  mistake: { label: 'Erro', variant: 'crimson', box: 'bg-accent-crimson/10 border-accent-crimson/30' },
}

export default function PushFoldTrainer() {
  const [bank, setBank] = useState<SpotBank | null>(null)
  const [loadError, setLoadError] = useState(false)
  // Vindo de um vazamento do Dashboard: formato e stack ja escolhidos e o treino comeca direto
  const navState = useLocation().state as { formatId?: string; stack?: number; autoStart?: boolean } | null
  const validFormat = FORMATOS.some((f) => f.id === navState?.formatId)
  const [formatId, setFormatId] = useState(validFormat ? (navState?.formatId as string) : '6max')
  const [stackChoice, setStackChoice] = useState<number | null>(
    navState?.stack && STACKS.includes(navState.stack) ? navState.stack : 10,
  )
  const autoStarted = useRef(false)
  const [phase, setPhase] = useState<'setup' | 'play' | 'summary'>('setup')
  const [question, setQuestion] = useState<Question | null>(null)
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [showWhy, setShowWhy] = useState(false)
  const [history, setHistory] = useState<Answered[]>([])
  const [streak, setStreak] = useState(0)
  const sessionStarted = useRef(false)

  const { startSession, answerQuestion, endSession } = useTrainingStore()
  const formato: Formato = useMemo(() => formatoPorId(formatId), [formatId])

  useEffect(() => {
    let alive = true
    loadSpots().then((b) => alive && setBank(b)).catch(() => alive && setLoadError(true))
    return () => { alive = false }
  }, [])

  // Fecha a sessao ao sair da tela, sem gravar sessao vazia no historico.
  useEffect(() => {
    return () => {
      if (sessionStarted.current && useTrainingStore.getState().currentSession?.totalQuestions) {
        useTrainingStore.getState().endSession()
      }
    }
  }, [])

  const nextQuestion = useCallback(() => {
    if (!bank) return
    for (let tries = 0; tries < 20; tries++) {
      const { ref, stack } = spotAleatorio(formato, stackChoice)
      const spot = bank.get(ref.id)
      if (spot) {
        setQuestion({ ref, stack, spot, hand: pickHand(spot), shownAt: Date.now() })
        setAnswered(null)
        setShowWhy(false)
        return
      }
    }
  }, [bank, formato, stackChoice])

  const start = () => {
    setHistory([])
    setStreak(0)
    startSession('drill', 'push_fold')
    sessionStarted.current = true
    setPhase('play')
    nextQuestion()
  }

  // vindo de um vazamento: assim que os spots carregam, comeca o treino uma unica vez
  useEffect(() => {
    if (navState?.autoStart && bank && phase === 'setup' && !autoStarted.current) {
      autoStarted.current = true
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank])

  const answer = (choseAggressive: boolean) => {
    if (!question || answered) return
    const { ref, spot, hand } = question
    const ev = gradePushFold(spot, hand, choseAggressive)
    const isCorrect = ev.grade !== 'mistake'
    const agg = ref.acao === 'push' ? 'shove' : 'call'
    answerQuestion({
      questionId: `${spot.id}|${hand}`,
      hand,
      userAction: choseAggressive ? agg : 'fold',
      correctAction: ev.best === 'aggressive' ? agg : 'fold',
      isCorrect,
      timeMs: Date.now() - question.shownAt,
      timestamp: Date.now(),
    })
    const a = { q: question, choseAggressive, ev }
    setAnswered(a)
    setHistory((h) => [...h, a])
    setStreak((s) => (isCorrect ? s + 1 : 0))
  }

  const finish = () => {
    if (useTrainingStore.getState().currentSession) endSession()
    sessionStarted.current = false
    setPhase('summary')
  }

  const total = history.length
  const hits = history.filter((h) => h.ev.grade !== 'mistake').length
  const accuracy = total ? Math.round((hits / total) * 100) : 0

  // ---------- SETUP ----------
  if (phase === 'setup') {
    return (
      <div className="page-scroll"><div className="p-4 pb-28 max-w-2xl mx-auto space-y-4">
        <SectionHeader
          title="Push/Fold"
          subtitle="Ranges de all-in e call resolvidos (Nash e ICM), de 2 a 25bb. Funciona offline."
        />
        <Card className="p-4 space-y-4">
          <div>
            <p className="text-xs text-text-muted mb-2 font-body">Formato</p>
            <div className="flex flex-wrap gap-2">
              {FORMATOS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFormatId(f.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    f.id === formatId
                      ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                      : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-strong',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {formato.icm && (
              <p className="text-[11px] text-text-muted mt-2">
                ICM ativo{formato.premios ? `, prêmios ${formato.premios}` : ''}: bustar custa mais que fichas.
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-text-muted mb-2 font-body">Stack efetivo (bb)</p>
            <div className="flex flex-wrap gap-2">
              {[null, ...STACKS].map((s) => (
                <button
                  key={s ?? 'any'}
                  onClick={() => setStackChoice(s)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border font-mono transition-colors',
                    s === stackChoice
                      ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                      : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-strong',
                  )}
                >
                  {s ?? 'Qualquer'}
                </button>
              ))}
            </div>
          </div>
          {/* fixo no fim da area visivel: o botao de iniciar nunca fica escondido embaixo */}
          <div
            className="sticky bottom-0 -mx-4 -mb-4 px-4 pt-3 pb-4 rounded-b-2xl"
            style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
          >
            <Button variant="primary" size="lg" className="w-full" disabled={!bank} onClick={start}>
              <Zap size={16} />
              {loadError ? 'Falha ao carregar os spots' : bank ? 'Começar treino' : 'Carregando spots...'}
            </Button>
          </div>
        </Card>
      </div></div>
    )
  }

  // ---------- RESUMO ----------
  if (phase === 'summary') {
    const misses = history.filter((h) => h.ev.grade === 'mistake')
    return (
      <div className="page-scroll"><div className="p-4 pb-28 max-w-2xl mx-auto space-y-4">
        <SectionHeader title="Resumo da sessão" subtitle={`${formato.label}${stackChoice ? `, ${stackChoice}bb` : ', stacks variados'}`} />
        <Card className="p-4 text-center">
          <p className="text-4xl font-display font-bold text-text-primary">{accuracy}%</p>
          <p className="text-xs text-text-muted mt-1">{hits} de {total} decisões sem erro</p>
        </Card>
        {misses.length > 0 && (
          <Card className="p-4">
            <p className="text-sm font-display font-bold text-text-primary mb-2">Para revisar ({misses.length})</p>
            <ul className="space-y-1.5">
              {misses.map((m, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-text-primary">{m.q.hand}</span>
                  <span className="text-text-muted">
                    {posDisplay(m.q.ref.hero)}{m.q.ref.acao === 'call' ? ` vs ${posDisplay(m.q.ref.shover)}` : ''}, {m.q.stack}bb
                  </span>
                  <Badge variant="crimson">certo: {m.ev.best === 'aggressive' ? rotuloAgressivo(m.q.ref.acao) : 'FOLD'}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Button variant="primary" className="w-full" onClick={() => setPhase('setup')}>
          <RotateCcw size={14} /> Novo treino
        </Button>
      </div></div>
    )
  }

  // ---------- JOGO ----------
  if (!question) return null
  const { ref, stack, hand } = question
  const isCall = ref.acao === 'call'
  const aggLabel = rotuloAgressivo(ref.acao)
  const tableHero = formato.tableFormat === 'HU' && ref.hero === 'SB' ? 'BTN' : posDisplay(ref.hero)
  const tableVillain = isCall
    ? (formato.tableFormat === 'HU' && ref.shover === 'SB' ? 'BTN' : posDisplay(ref.shover))
    : undefined
  const ui = answered ? GRADE_UI[answered.ev.grade] : null

  return (
    <div className="page-scroll"><div className="p-4 pb-28 max-w-2xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="gold">{formato.label}</Badge>
          <Badge variant="neutral">{stack}bb</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-text-secondary font-mono">
          <span>{hits}/{total}</span>
          <span className={cn(streak >= 5 && 'text-accent-gold')}>sequência {streak}</span>
        </div>
      </div>

      <TrainingTable
        heroPosition={tableHero}
        villainPosition={tableVillain}
        handNotation={hand}
        stackDepth={stack}
        tableFormat={formato.tableFormat}
        compact
      />

      <p className="text-center text-sm text-text-secondary font-body">
        {isCall
          ? <>O <span className="text-text-primary font-semibold">{posDisplay(ref.shover)}</span> deu ALL-IN. Você está no <span className="text-text-primary font-semibold">{posDisplay(ref.hero)}</span>.</>
          : <>Ação chega em você no <span className="text-text-primary font-semibold">{posDisplay(ref.hero)}</span>, todos deram fold.</>}
      </p>

      {/* Fixo na base da area visivel, acima do menu inferior: FOLD/ALL-IN e "Proxima mao"
          ficam sempre a vista. max-h evita que a explicacao aberta cubra a tela toda. */}
      <div
        className="sticky bottom-0 z-10 -mx-4 px-4 pt-2 pb-3 max-h-[55vh] overflow-y-auto border-t border-border-subtle"
        style={{ backgroundColor: 'rgb(var(--c-bg-base))' }}
      >
      {!answered ? (
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" onClick={() => answer(false)}>FOLD</Button>
          <Button size="lg" variant="primary" onClick={() => answer(true)}>{aggLabel}</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={cn('rounded-xl border p-3 flex items-center justify-between', ui!.box)}>
            <div>
              <Badge variant={ui!.variant} size="md">{ui!.label}</Badge>
              <p className="text-xs text-text-secondary mt-1.5">
                Você escolheu {answered.choseAggressive ? aggLabel : 'FOLD'}. O solver escolhe {aggLabel} em{' '}
                {Math.round(answered.ev.freq * 100)}% das vezes com {hand}.
              </p>
            </div>
            <button
              onClick={() => setShowWhy((v) => !v)}
              className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 shrink-0 ml-3"
            >
              Por quê? {showWhy ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          {showWhy && (
            <Card className="p-3 space-y-1.5">
              {explainPushFold(question.spot, ref, formato, stack, hand, answered.ev).map((l, i) => (
                <p key={i} className="text-xs text-text-secondary leading-relaxed">{l}</p>
              ))}
            </Card>
          )}
          <Button variant="primary" size="lg" className="w-full" onClick={nextQuestion}>Próxima mão</Button>
        </div>
      )}
      </div>

      <div className="text-center">
        <button onClick={finish} className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2">
          Encerrar e ver resumo
        </button>
      </div>
    </div></div>
  )
}
