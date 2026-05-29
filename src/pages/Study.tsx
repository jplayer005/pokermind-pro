// ============================================================
// POKERMIND PRO — ESTUDOS
// Cursos, flashcards com revisão espaçada, meta-game e quizzes
// ============================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Zap, Clock, ChevronRight, ChevronDown, RotateCcw, Check, X, Brain, DollarSign } from 'lucide-react'
import { Card, Badge, Button, SectionHeader, ProgressBar, PremiumLock } from '@/components/ui'
import { COURSES_DATA, FLASHCARDS_DATA } from '@/data/ranges'
import { cn } from '@/lib/utils'
import { Flashcard } from '@/types'

type StudyTab = 'courses' | 'flashcards' | 'metagame' | 'notes'

// ------- CARD DE CURSO COM LEITOR DE AULAS -------
function CourseCard({ course }: { course: typeof COURSES_DATA[0] }) {
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)
  const completedLessons = course.modules
    .flatMap(m => m.lessons as Array<{ isCompleted: boolean }>)
    .filter(l => l.isCompleted).length
  const totalLessons = course.modules.flatMap(m => m.lessons as Array<{ isCompleted: boolean }>).length
  const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0

  return (
    <Card className={cn('p-4 transition-all', course.isPremium && 'relative overflow-hidden')}>
      {course.isPremium && (
        <div className="absolute top-3 right-3">
          <Badge variant="gold" size="sm">PRO</Badge>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-bg-base border border-border-subtle flex items-center justify-center text-2xl flex-shrink-0">
          {course.thumbnail}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-xs font-display font-bold text-text-primary">{course.title}</span>
          </div>
          <p className="text-[10px] text-text-muted font-body leading-relaxed line-clamp-2">{course.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Clock size={10} className="text-text-muted" />
              <span className="text-[10px] text-text-muted">{course.totalMinutes}min</span>
            </div>
            <Badge variant={
              course.difficulty === 'beginner' ? 'emerald' :
              course.difficulty === 'intermediate' ? 'gold' : 'crimson'
            } size="sm">
              {course.difficulty === 'beginner' ? 'Iniciante' : course.difficulty === 'intermediate' ? 'Intermediário' : 'Avançado'}
            </Badge>
          </div>
        </div>
      </div>

      {totalLessons > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
            <span>{completedLessons}/{totalLessons} aulas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={Math.round(progress)} color={progress === 100 ? 'emerald' : 'gold'} size="xs" />
        </div>
      )}

      {/* Lista de módulos e aulas */}
      {course.modules.length > 0 && (
        <div className="mt-3 space-y-2">
          {course.modules.map(mod => (
            <div key={mod.id}>
              <div className="text-[10px] text-text-muted uppercase tracking-wider font-body mb-1.5">{mod.title}</div>
              <div className="space-y-1">
                {(mod.lessons as any[]).map((lesson) => (
                  <div key={lesson.id}>
                    <button
                      onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-bg-base border border-border-subtle hover:border-border-default transition-all"
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]',
                        lesson.isCompleted
                          ? 'bg-accent-emerald/20 text-accent-emerald'
                          : 'bg-bg-elevated text-text-muted'
                      )}>
                        {lesson.isCompleted ? '✓' : lesson.type === 'quiz' ? '?' : lesson.type === 'drill' ? '🎯' : '▶'}
                      </div>
                      <span className="flex-1 text-left text-[11px] font-body text-text-secondary">{lesson.title}</span>
                      <span className="text-[9px] text-text-muted">{lesson.duration}min</span>
                      {lesson.content && (
                        <ChevronDown size={11} className={cn('text-text-muted transition-transform flex-shrink-0', expandedLesson === lesson.id && 'rotate-180')} />
                      )}
                    </button>
                    {/* Conteúdo da aula */}
                    <AnimatePresence>
                      {expandedLesson === lesson.id && lesson.content && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mx-1 mb-1 p-3 bg-bg-base/60 border border-border-subtle rounded-b-lg border-t-0">
                            <p className="text-[11px] text-text-secondary font-body leading-relaxed whitespace-pre-line">
                              {lesson.content}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ------- SISTEMA DE FLASHCARDS -------
function FlashcardSystem() {
  const [cards, setCards] = useState<Flashcard[]>(
    FLASHCARDS_DATA.map(f => ({ ...f, nextReview: Date.now() }))
  )
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 })

  const currentCard = cards[currentIdx]

  function handleAnswer(correct: boolean) {
    setSessionStats(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      incorrect: prev.incorrect + (correct ? 0 : 1),
    }))
    if (currentIdx + 1 >= cards.length) {
      setIsFinished(true)
    } else {
      setCurrentIdx(prev => prev + 1)
      setIsFlipped(false)
    }
  }

  function restartSession() {
    setCurrentIdx(0)
    setIsFlipped(false)
    setIsFinished(false)
    setSessionStats({ correct: 0, incorrect: 0 })
  }

  if (isFinished) {
    const total = sessionStats.correct + sessionStats.incorrect
    const accuracy = total > 0 ? sessionStats.correct / total : 0
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
        <div className="text-4xl mb-3">{accuracy >= 0.7 ? '🎯' : '📚'}</div>
        <h3 className="text-base font-display font-bold text-text-primary mb-1">Sessão Concluída!</h3>
        <div className="font-mono text-2xl font-bold text-accent-gold mb-4">{Math.round(accuracy * 100)}%</div>
        <div className="flex justify-center gap-4 mb-6 text-sm">
          <div className="flex items-center gap-1.5"><Check size={14} className="text-accent-emerald" /><span className="text-text-secondary">{sessionStats.correct} corretos</span></div>
          <div className="flex items-center gap-1.5"><X size={14} className="text-accent-crimson" /><span className="text-text-secondary">{sessionStats.incorrect} errados</span></div>
        </div>
        <Button variant="gold" size="md" onClick={restartSession}><RotateCcw size={14} />Repetir</Button>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span>{currentIdx + 1} de {cards.length}</span>
        <div className="flex items-center gap-2">
          <Check size={11} className="text-accent-emerald" /><span>{sessionStats.correct}</span>
          <X size={11} className="text-accent-crimson ml-1" /><span>{sessionStats.incorrect}</span>
        </div>
      </div>
      <ProgressBar value={Math.round((currentIdx / cards.length) * 100)} size="xs" />
      <motion.div key={currentIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <div className="cursor-pointer select-none" onClick={() => setIsFlipped(!isFlipped)}>
          <Card className={cn('p-6 min-h-40 flex flex-col justify-between transition-all duration-200', isFlipped ? 'border-accent-emerald/30 bg-accent-emerald/5' : 'border-accent-gold/20')}>
            <div className="flex items-start justify-between mb-3">
              <Badge variant="neutral" size="sm">{currentCard.category}</Badge>
              <span className="text-[10px] text-text-muted font-body">{isFlipped ? 'Resposta' : 'Toque para revelar'}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={isFlipped ? 'back' : 'front'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                className={cn('text-sm font-body leading-relaxed whitespace-pre-line', isFlipped ? 'text-text-primary' : 'text-text-primary font-medium')}>
                {isFlipped ? currentCard.back : currentCard.front}
              </motion.p>
            </AnimatePresence>
          </Card>
        </div>
      </motion.div>
      <AnimatePresence>
        {isFlipped && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
            <button onClick={() => handleAnswer(false)} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson text-sm font-display font-bold active:scale-95 transition-all">
              <X size={16} /> Não lembrei
            </button>
            <button onClick={() => handleAnswer(true)} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-accent-emerald/10 border border-accent-emerald/30 text-accent-emerald text-sm font-display font-bold active:scale-95 transition-all">
              <Check size={16} /> Sabia!
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ------- CALCULADORA DE BANKROLL -------
const BRM_FORMATS = [
  { id: 'cash', label: '💵 Cash 6-max', minBuyins: 20, recommended: 30, desc: 'Variância moderada. Winrate estável a longo prazo.' },
  { id: 'mtt', label: '🏆 MTT', minBuyins: 50, recommended: 100, desc: 'Alta variância. Downswings de 40-60 buy-ins são normais.' },
  { id: 'sng', label: '🎯 SNG', minBuyins: 30, recommended: 50, desc: 'Variância média. Mais sessões por hora que MTT.' },
  { id: 'spin', label: '⚡ Spin & Go', minBuyins: 100, recommended: 150, desc: 'Variância muito alta. Prize pool aleatório exige BRM conservador.' },
]

function BRMModule() {
  const [bankroll, setBankroll] = useState(1000)
  const [format, setFormat] = useState(BRM_FORMATS[0])

  const maxBuyin = Math.floor(bankroll / format.recommended)
  const minBuyin = Math.floor(bankroll / format.minBuyins)

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <SectionHeader title="💰 Bankroll Management" subtitle="Calcule o buy-in máximo para seu bankroll" />
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex justify-between text-[11px] text-text-muted mb-1.5">
              <span>Meu bankroll</span>
              <span className="font-mono font-bold text-accent-gold">R$ {bankroll.toLocaleString('pt-BR')}</span>
            </div>
            <input
              type="range" min={100} max={50000} step={100} value={bankroll}
              onChange={e => setBankroll(Number(e.target.value))}
              className="w-full accent-yellow-400"
            />
            <div className="flex justify-between text-[9px] text-text-muted mt-0.5">
              <span>R$100</span><span>R$50k</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {BRM_FORMATS.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f)}
                className={cn(
                  'py-2.5 px-3 rounded-lg text-[10px] font-body border transition-all text-left',
                  format.id === f.id
                    ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                    : 'bg-bg-overlay border-border-subtle text-text-muted'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-accent-emerald/10 border border-accent-emerald/20 text-center">
            <div className="font-mono font-bold text-lg text-accent-emerald">R$ {maxBuyin.toLocaleString('pt-BR')}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Buy-in recomendado</div>
            <div className="text-[9px] text-accent-emerald/70 mt-0.5">{format.recommended} buy-ins</div>
          </div>
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-center">
            <div className="font-mono font-bold text-lg text-yellow-400">R$ {minBuyin.toLocaleString('pt-BR')}</div>
            <div className="text-[10px] text-text-muted mt-0.5">Máximo absoluto</div>
            <div className="text-[9px] text-yellow-400/70 mt-0.5">{format.minBuyins} buy-ins</div>
          </div>
        </div>
        <p className="text-[10px] text-text-muted font-body mt-3 leading-relaxed">{format.desc}</p>
      </Card>

      <Card className="p-4">
        <SectionHeader title="📋 Regras de BRM" />
        <div className="mt-3 space-y-2.5">
          {[
            { icon: '🚀', text: 'Suba de stake: bankroll ≥ 30 buy-ins para o novo stake + winrate positivo' },
            { icon: '📉', text: 'Desça de stake: bankroll cair abaixo de 15-20 buy-ins para o stake atual' },
            { icon: '🛑', text: 'Stop-loss diário: pare ao perder 3 buy-ins na mesma sessão' },
            { icon: '⚡', text: 'Shot-taking: máximo 2% do bankroll total em stake superior' },
          ].map((rule, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">{rule.icon}</span>
              <p className="text-[11px] text-text-secondary font-body leading-relaxed">{rule.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ------- MENTAL GAME -------
function MentalGameModule() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const TOPICS = [
    {
      id: 'tilt',
      icon: '😡',
      title: 'Tipos de Tilt',
      color: 'text-accent-crimson',
      content: '1. Revenge Tilt — querer "pagar de volta" ao mesmo player\n2. Running Bad Tilt — loosear porque "nada funciona"\n3. Entitlement Tilt — raiva após bad beats ("merecia ganhar")\n4. Fear Tilt — foldar demais por medo de perder mais\n5. Euphoria Tilt — descuidar quando está ganhando\n\n🛡️ Solução universal: Defina uma ação de "reset" ao sentir tilt. Exemplos: 5 min longe da mesa, respiração, revisar 3 mãos recentes.',
    },
    {
      id: 'variance',
      icon: '📊',
      title: 'Entendendo a Variância',
      color: 'text-accent-blue',
      content: 'Variância é inevitável. Com winrate de 5bb/100 em NL50:\n• Downswing de 15-25 buy-ins é matematicamente esperado\n• Você pode perder por 50k mãos e ainda ser vencedor\n• 10k mãos de amostra = muito pequena para conclusões\n\n📐 Fórmula mental: Separe "resultado" de "decisão".\nPergunta certa: "Fiz a decisão correta dada a informação que tinha?"',
    },
    {
      id: 'stoploss',
      icon: '🛑',
      title: 'Stop-Loss e Limites',
      color: 'text-yellow-400',
      content: 'Defina ANTES de sentar:\n• Stop-loss de sessão: 3 buy-ins cash / 5 MTTs\n• Stop de semana: máximo X horas ou Y buy-ins\n• Horário limite: não jogue após meia-noite se cansado\n\nPor que funciona: Evita "chasing" losses em estado mental ruim. Um player tilteado perde 2-3x mais rápido.',
    },
    {
      id: 'downswing',
      icon: '📉',
      title: 'Gerenciando Downswings',
      color: 'text-orange-400',
      content: 'Durante um downswing:\n1. Revise mãos com solver — confirme que está jogando certo\n2. Não aumente volume para "recuperar mais rápido"\n3. Considere descer de stake temporariamente\n4. Tire 1-2 dias de folga após 3 sessões ruins seguidas\n5. Fale com outros players — downswings são normais\n\nLembrete: Downswing ≠ estou jogando mal. Às vezes coincide, às vezes é pura variância.',
    },
  ]

  return (
    <div className="space-y-3">
      {TOPICS.map(t => (
        <Card key={t.id} className="overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            className="w-full flex items-center gap-3 p-4"
          >
            <span className="text-xl">{t.icon}</span>
            <span className={cn('flex-1 text-left text-sm font-display font-bold', t.color)}>{t.title}</span>
            <ChevronDown size={14} className={cn('text-text-muted transition-transform', expanded === t.id && 'rotate-180')} />
          </button>
          <AnimatePresence>
            {expanded === t.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pt-0">
                  <div className="h-px bg-border-subtle mb-3" />
                  <p className="text-[11px] text-text-secondary font-body leading-relaxed whitespace-pre-line">{t.content}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}
    </div>
  )
}

// ------- HUD STATS GUIDE -------
const HUD_PROFILES = [
  { vpip: '< 15%', pfr: '12-14%', label: 'Nitão', color: 'text-accent-blue', icon: '🧊',
    strategy: 'Range muito premium. Respeit raises e 3bets deles. Não bluff. Não call com mãos medianas. Quando betam river, raramente bluffam.' },
  { vpip: '18-25%', pfr: '15-22%', label: 'TAG Regular', color: 'text-accent-emerald', icon: '📊',
    strategy: 'Player sólido, difícil de exploitar. Evite pots grandes sem clara edge. Jogue dentro da estratégia GTO. Observe tendências específicas (f3b %, cbet %).' },
  { vpip: '28-38%', pfr: '18-28%', label: 'LAG', color: 'text-yellow-400', icon: '⚡',
    strategy: 'Pode ser forte ou com leaks. Observe se tem winrate positivo. Se LAG com baixo PFR = limp/call (fraco). Se LAG com alto PFR = agressivo equilibrado.' },
  { vpip: '40-55%', pfr: '8-15%', label: 'Fish Loose-Passivo', color: 'text-orange-400', icon: '🐟',
    strategy: 'Alvo principal! Value-bet mais grosso. Nunca bluff — ele chama. Não faz raise sem mão forte. Bets dele = muito forte (nunca bluff). Sente à esquerda dele.' },
  { vpip: '55%+', pfr: '< 10%', label: 'Mega Fish', color: 'text-accent-crimson', icon: '🎯',
    strategy: 'Extraia máximo valor. Bet thin, call downs com pairs medianos. Nunca bluff. Aguente bad beats — é assim que o jogo funciona vs fish. São a razão do poker ser lucrativo.' },
]

function HUDGuideModule() {
  const [selected, setSelected] = useState<typeof HUD_PROFILES[0] | null>(null)

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionHeader title="📡 Guia de HUD Stats" subtitle="Toque em um perfil para ver como exploitar" />
        <div className="mt-3 space-y-2">
          {HUD_PROFILES.map((p, i) => (
            <button
              key={i}
              onClick={() => setSelected(selected === p ? null : p)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                selected === p
                  ? 'bg-bg-overlay border-border-default'
                  : 'bg-bg-base border-border-subtle hover:border-border-default'
              )}
            >
              <span className="text-xl flex-shrink-0">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={cn('text-xs font-display font-bold', p.color)}>{p.label}</div>
                <div className="text-[10px] text-text-muted font-mono">VPIP {p.vpip} · PFR {p.pfr}</div>
              </div>
              <ChevronDown size={13} className={cn('text-text-muted flex-shrink-0 transition-transform', selected === p && 'rotate-180')} />
            </button>
          ))}
        </div>
      </Card>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="p-4 border-accent-gold/20 bg-accent-gold/5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{selected.icon}</span>
                <div>
                  <div className={cn('text-sm font-display font-bold', selected.color)}>{selected.label}</div>
                  <div className="text-[10px] text-text-muted font-mono">VPIP {selected.vpip} · PFR {selected.pfr}</div>
                </div>
              </div>
              <p className="text-[11px] text-text-secondary font-body leading-relaxed">{selected.strategy}</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-4">
        <SectionHeader title="📌 Stats Adicionais" subtitle="Além do VPIP e PFR" />
        <div className="mt-3 space-y-3">
          {[
            { stat: 'Fold to 3-Bet > 70%', action: '3bete light com K9s, A3s, JTs — EV positivo mesmo sem equity alta' },
            { stat: 'Fold to 3-Bet < 50%', action: '3bete apenas valor (QQ+/AK). Não bluff — ele chama tudo' },
            { stat: 'WTSD% > 30%', action: 'Não bluff. Value-bete muito mais grosso. Thin value no river é excelente' },
            { stat: 'WTSD% < 22%', action: 'Bluff mais no river. Ele folda draws não completados e pares fracos' },
            { stat: 'Cbet % > 80%', action: 'Float o flop e bete o turn. Ele aposta demais sem mãos fortes' },
            { stat: 'Cbet % < 40%', action: 'Bet/fold flop vs ele quando você tem equity. Ele cbet com força real' },
          ].map((item, i) => (
            <div key={i} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
              <div className="text-[11px] font-mono font-bold text-accent-gold mb-1">{item.stat}</div>
              <div className="text-[10px] text-text-secondary font-body">→ {item.action}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ------- GAME SELECTION -------
function GameSelectionModule() {
  const [tab, setTab] = useState<'online' | 'live'>('online')
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionHeader title="🎯 Game Selection" subtitle="Escolha as mesas mais lucrativas" />
        <div className="flex gap-2 mt-3 mb-4">
          {(['online', 'live'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn(
              'flex-1 py-2 rounded-lg text-xs font-body border transition-all',
              tab === t ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue' : 'bg-bg-overlay border-border-subtle text-text-muted'
            )}>
              {t === 'online' ? '💻 Online' : '🃏 Ao Vivo'}
            </button>
          ))}
        </div>

        {tab === 'online' && (
          <div className="space-y-3">
            <p className="text-[11px] text-text-secondary font-body">O que procurar na lobby antes de sentar:</p>
            {[
              { icon: '✅', text: 'VPIP médio da mesa > 28-30%' },
              { icon: '✅', text: 'Flops vistos % > 25%' },
              { icon: '✅', text: 'Ao menos 1 player com VPIP > 40%' },
              { icon: '✅', text: 'Pot médio acima do normal para o stake' },
              { icon: '❌', text: 'Evite mesas com apenas regulares/TAGs' },
              { icon: '❌', text: 'Evite mesas onde todos esperam uns aos outros' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm">{item.icon}</span>
                <span className="text-[11px] text-text-secondary font-body">{item.text}</span>
              </div>
            ))}
            <div className="mt-3 p-3 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
              <p className="text-[10px] text-accent-gold font-body">💡 Dica: Sente à ESQUERDA do fish (assento que age depois dele). Você terá posição em mais situações.</p>
            </div>
          </div>
        )}

        {tab === 'live' && (
          <div className="space-y-3">
            <p className="text-[11px] text-text-secondary font-body">Sinais de mesa lucrativa ao vivo:</p>
            {[
              { icon: '✅', text: 'Players discutindo como ganharam/perderam mãos absurdas' },
              { icon: '✅', text: 'Pilhas muito desiguais (alguém perdeu muito)' },
              { icon: '✅', text: 'Atmosfera descontraída, bebidas, conversa' },
              { icon: '✅', text: 'Muitos flops sendo vistos (> 3 players regularmente)' },
              { icon: '❌', text: 'Todos silenciosos, calculando muito antes de agir' },
              { icon: '❌', text: 'Potes pequenos, muitos folds pré-flop' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-sm">{item.icon}</span>
                <span className="text-[11px] text-text-secondary font-body">{item.text}</span>
              </div>
            ))}
            <div className="mt-3 p-3 rounded-lg bg-accent-emerald/10 border border-accent-emerald/20">
              <p className="text-[10px] text-accent-emerald font-body">💡 Regra ao vivo: Observe 15-20 minutos antes de sentar se possível. Identifique quem está com pilha grande (ganhou) e quem está recriando (perdendo, emocionado).</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <SectionHeader title="🔑 Princípio Fundamental" />
        <p className="text-[11px] text-text-secondary font-body leading-relaxed mt-3">
          Você não precisa ser o melhor jogador do mundo — você precisa ser melhor que as pessoas na sua mesa.
          {'\n\n'}Se você é claramente o melhor player na mesa, a longo prazo sua winrate será limitada pela sorte de curto prazo dos outros.
          {'\n\n'}Busque mesas onde você é o 2º ou 3º melhor player — os piores serão seus alvos consistentes.
        </p>
      </Card>
    </div>
  )
}

// ---- TAB META-GAME ----
type MetaTab = 'brm' | 'mental' | 'hud' | 'gamesel'
const META_TABS: { id: MetaTab; label: string; icon: string }[] = [
  { id: 'brm', label: 'BRM', icon: '💰' },
  { id: 'mental', label: 'Mental', icon: '🧠' },
  { id: 'hud', label: 'HUD', icon: '📡' },
  { id: 'gamesel', label: 'Seleção', icon: '🎯' },
]

function MetaGameTab() {
  const [metaTab, setMetaTab] = useState<MetaTab>('brm')
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {META_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setMetaTab(t.id)}
            className={cn(
              'flex-1 flex flex-col items-center py-2.5 rounded-xl border text-[10px] font-body transition-all gap-1',
              metaTab === t.id
                ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                : 'bg-bg-overlay border-border-subtle text-text-muted'
            )}
          >
            <span className="text-base">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={metaTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {metaTab === 'brm' && <BRMModule />}
          {metaTab === 'mental' && <MentalGameModule />}
          {metaTab === 'hud' && <HUDGuideModule />}
          {metaTab === 'gamesel' && <GameSelectionModule />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// =============== COMPONENTE PRINCIPAL ===============
const COURSE_FILTERS = [
  { label: 'Todos',     category: null },
  { label: 'Pré-Flop',  category: 'preflop' },
  { label: 'Pós-Flop',  category: 'postflop' },
  { label: 'ICM',       category: 'icm' },
  { label: 'BRM/Mental', category: 'mental' },
] as const

export default function Study() {
  const [tab, setTab] = useState<StudyTab>('courses')
  const [courseFilter, setCourseFilter] = useState<string | null>(null)

  const TABS: { id: StudyTab; label: string; icon: string }[] = [
    { id: 'courses',    label: 'Cursos',     icon: '📚' },
    { id: 'flashcards', label: 'Flashcards', icon: '⚡' },
    { id: 'metagame',   label: 'Meta-Game',  icon: '🧠' },
    { id: 'notes',      label: 'Anotações',  icon: '📝' },
  ]

  return (
    <div className="page-scroll">
      <div className="px-4 py-4 pb-6 space-y-4">

        {/* ---- HEADER ---- */}
        <div>
          <h1 className="text-lg font-display font-bold text-text-primary">Estudos</h1>
          <p className="text-xs text-text-muted mt-0.5">Cursos, flashcards, meta-game e materiais de referência</p>
        </div>

        {/* ---- TABS ---- */}
        <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 border border-border-subtle">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-body font-medium transition-all',
                tab === t.id ? 'bg-bg-overlay text-text-primary shadow-sm' : 'text-text-muted'
              )}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ---- CONTEÚDO DA TAB ---- */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >

            {/* CURSOS */}
            {tab === 'courses' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {COURSE_FILTERS.map(f => (
                    <button
                      key={f.label}
                      onClick={() => setCourseFilter(f.category)}
                      className={cn(
                        'flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-body border transition-all',
                        courseFilter === f.category
                          ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                          : 'border-border-subtle text-text-muted bg-bg-base'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {COURSES_DATA.filter(c => !courseFilter || c.category === courseFilter).map(course => (
                  course.isPremium
                    ? <PremiumLock key={course.id}><CourseCard course={course} /></PremiumLock>
                    : <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}

            {/* FLASHCARDS */}
            {tab === 'flashcards' && (
              <div className="space-y-3">
                <Card className="p-4">
                  <SectionHeader
                    title="Revisão Espaçada"
                    subtitle={`${FLASHCARDS_DATA.length} cards para revisar hoje`}
                  />
                  <FlashcardSystem />
                </Card>
              </div>
            )}

            {/* META-GAME */}
            {tab === 'metagame' && <MetaGameTab />}

            {/* ANOTAÇÕES */}
            {tab === 'notes' && (
              <div className="space-y-3">
                <Card className="p-4">
                  <SectionHeader title="Minhas Anotações" />
                  <textarea
                    placeholder="Escreva suas anotações de estudo aqui...&#10;&#10;Dica: Anote spots difíceis, conceitos novos e insights das sessões."
                    className="w-full bg-bg-base border border-border-subtle rounded-xl p-3 text-sm text-text-primary placeholder-text-muted font-body min-h-40 resize-none focus:border-accent-gold focus:outline-none transition-colors"
                  />
                  <Button variant="secondary" size="sm" className="w-full mt-3">
                    Salvar Anotação
                  </Button>
                </Card>
                <SectionHeader title="Anotações Salvas" />
                {[
                  { title: 'BTN vs BB 3bet spots', date: 'Hoje', preview: 'Lembrar de usar A5s como 3bet bluff...' },
                  { title: 'ICM Bubble MTT', date: '2 dias atrás', preview: 'No bubble, apertar range drasticamente...' },
                ].map((note, i) => (
                  <Card key={i} className="p-3 flex items-start gap-3" hoverable>
                    <div className="w-8 h-8 rounded-lg bg-accent-gold/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📝</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-display font-bold text-text-primary">{note.title}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{note.preview}</div>
                      <div className="text-[10px] text-text-muted mt-1">{note.date}</div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  )
}
