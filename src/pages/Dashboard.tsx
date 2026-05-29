// ============================================================
// POKERMIND PRO — DASHBOARD
// Painel principal com estatísticas e evolução do usuário
// ============================================================

import { useMemo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip
} from 'recharts'
import {
  Flame, Target, Clock, TrendingUp, ChevronRight,
  Zap
} from 'lucide-react'
import { Card, ProgressBar, StatCard, SectionHeader } from '@/components/ui'
import { useUserStore, useTrainingStore } from '@/store'
import { formatPercent, formatTime, formatNumber, xpToNextLevel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { DrillSession } from '@/types'

// ---- HELPERS DE DADOS REAIS ----

function computeWeeklyData(sessions: DrillSession[]) {
  const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().split('T')[0]
    const daySessions = sessions.filter(
      s => new Date(s.startedAt).toISOString().split('T')[0] === dateStr
    )
    const totalQ = daySessions.reduce((a, s) => a + s.totalQuestions, 0)
    const totalC = daySessions.reduce((a, s) => a + s.correctAnswers, 0)
    return {
      day: DAY_NAMES[d.getDay()],
      accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
      questions: totalQ,
    }
  })
}

function computeWeakSpots(sessions: DrillSession[]) {
  const LABELS: Record<string, string> = {
    open_raise: 'Open Raise',
    push_fold:  'Push/Fold',
    '3bet':     '3-Bet',
    bb_defense: 'Defesa BB',
    call_rfi:   'Call vs RFI',
    '4bet':     '4-Bet',
    squeeze:    'Squeeze',
    sb_vs_bb:   'SB vs BB',
    postflop:   'Pós-Flop',
  }
  const map: Record<string, { c: number; t: number }> = {}
  sessions.forEach(s => {
    if (!map[s.scenario]) map[s.scenario] = { c: 0, t: 0 }
    map[s.scenario].t += s.totalQuestions
    map[s.scenario].c += s.correctAnswers
  })
  return Object.entries(map)
    .filter(([, d]) => d.t >= 3)
    .map(([sc, d]) => ({
      spot:     LABELS[sc] || sc,
      accuracy: Math.round((d.c / d.t) * 100),
      attempts: d.t,
      path:     sc === 'postflop' ? '/postflop' : '/preflop',
      scenario: sc,  // passado via location.state para o trainer
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4)
}

function computeScenarioAccuracy(sessions: DrillSession[]) {
  const LABELS: Record<string, string> = {
    open_raise: 'Open Raise', push_fold: 'Push/Fold', '3bet': '3-Bet',
    bb_defense: 'BB Defense', call_rfi: 'vs Raise', '4bet': '4-Bet',
    squeeze: 'Squeeze', sb_vs_bb: 'SB vs BB', postflop: 'Pós-Flop',
  }
  const map: Record<string, { c: number; t: number }> = {}
  sessions.forEach(s => {
    if (!map[s.scenario]) map[s.scenario] = { c: 0, t: 0 }
    map[s.scenario].t += s.totalQuestions
    map[s.scenario].c += s.correctAnswers
  })
  return Object.entries(map)
    .filter(([, d]) => d.t >= 3)
    .map(([sc, d]) => ({
      scenario: sc,
      name: LABELS[sc] || sc,
      accuracy: Math.round((d.c / d.t) * 100),
      attempts: d.t,
      path: sc === 'postflop' ? '/postflop' : '/preflop',
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
}

function getWeekStart(offsetWeeks: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay() - offsetWeeks * 7)
  d.setHours(0, 0, 0, 0)
  return d
}

function computeWeeklyByScenario(sessions: DrillSession[], weekOffset: number) {
  const LABELS: Record<string, string> = {
    open_raise: 'Open Raise', push_fold: 'Push/Fold', '3bet': '3-Bet',
    bb_defense: 'BB Defense', call_rfi: 'vs Raise', '4bet': '4-Bet',
    squeeze: 'Squeeze', sb_vs_bb: 'SB vs BB', postflop: 'Pós-Flop',
  }
  const weekStart = getWeekStart(weekOffset).getTime()
  const weekEnd = getWeekStart(weekOffset - 1).getTime()
  const filtered = sessions.filter(s => s.startedAt >= weekStart && s.startedAt < weekEnd)
  const map: Record<string, { c: number; t: number }> = {}
  filtered.forEach(s => {
    if (!map[s.scenario]) map[s.scenario] = { c: 0, t: 0 }
    map[s.scenario].t += s.totalQuestions
    map[s.scenario].c += s.correctAnswers
  })
  return Object.entries(map)
    .filter(([, d]) => d.t > 0)
    .map(([sc, d]) => ({
      scenario: sc,
      name: LABELS[sc] || sc,
      accuracy: Math.round((d.c / d.t) * 100),
      attempts: d.t,
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
}

// Custom tooltip do gráfico
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-strong border border-border-default rounded-lg p-2.5">
      <p className="text-[11px] font-body text-text-secondary mb-1">{label}</p>
      <p className="text-sm font-mono font-bold text-accent-gold">
        {payload[0]?.value ?? 0}% precisão
      </p>
      <p className="text-[10px] font-body text-text-muted">
        {payload[1]?.value ?? 0} questões
      </p>
    </div>
  )
}

const STAGGER = {
  container: { animate: { transition: { staggerChildren: 0.06 } } },
  item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
}

// Atalhos de treino com navegação e estado de filtro
const QUICK_LINKS = [
  {
    icon: '🃏', label: 'Drill Pré-Flop', sub: 'Começa agora — modo drill',
    path: '/preflop', navState: { scenario: 'open_raise', mode: 'drill', autoStart: true },
    color: 'from-yellow-500/10 to-yellow-600/5', border: 'border-yellow-500/20',
  },
  {
    icon: '🎯', label: 'Push/Fold', sub: 'Começa agora — modo drill',
    path: '/preflop', navState: { scenario: 'push_fold', mode: 'drill', autoStart: true },
    color: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/20',
  },
  {
    icon: '🃏', label: 'Pós-Flop', sub: 'GTO board + decisões',
    path: '/postflop', navState: null,
    color: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-500/20',
    spanFull: true,
  },
  {
    icon: '📐', label: 'Calculadoras', sub: 'Pot odds, EV',
    path: '/calculators', navState: null,
    color: 'from-emerald-500/10 to-emerald-600/5', border: 'border-emerald-500/20',
  },
  {
    icon: '📚', label: 'Estudos', sub: 'Cursos e flashcards',
    path: '/study', navState: null,
    color: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/20',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, syncAchievements } = useUserStore()
  const { totalQuestionsToday, sessionHistory } = useTrainingStore()
  const { stats } = profile
  const xp = xpToNextLevel(stats.xp)

  const dailyGoal = profile.goals[0]?.target ?? 20

  // Sincroniza conquistas com dados reais ao montar e a cada mudança no histórico
  useEffect(() => {
    syncAchievements(sessionHistory)
  }, [sessionHistory]) // eslint-disable-line react-hooks/exhaustive-deps

  const [selectedWeek, setSelectedWeek] = useState(0) // 0 = semana atual

  // ---- Dados reais do gráfico ----
  const weeklyData = useMemo(() => computeWeeklyData(sessionHistory), [sessionHistory])
  const hasChartData = weeklyData.some(d => d.questions > 0)

  // ---- Pontos fracos reais ----
  const weakSpots = useMemo(() => computeWeakSpots(sessionHistory), [sessionHistory])

  // ---- Precisão por cenário (todas) ----
  const scenarioAccuracy = useMemo(() => computeScenarioAccuracy(sessionHistory), [sessionHistory])

  // ---- Evolução semanal por cenário ----
  const weeklyByScenario = useMemo(
    () => computeWeeklyByScenario(sessionHistory, selectedWeek),
    [sessionHistory, selectedWeek]
  )

  // ---- Precisão das últimas 7 dias ----
  const weekAccuracy = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recent = sessionHistory.filter(s => s.startedAt > cutoff)
    const q = recent.reduce((a, s) => a + s.totalQuestions, 0)
    const c = recent.reduce((a, s) => a + s.correctAnswers, 0)
    return q > 0 ? c / q : null
  }, [sessionHistory])

  // ---- Tendência (semana atual vs semana anterior) ----
  const accTrend = useMemo(() => {
    const w1 = Date.now() - 7 * 24 * 60 * 60 * 1000
    const w2 = Date.now() - 14 * 24 * 60 * 60 * 1000
    const curr = sessionHistory.filter(s => s.startedAt > w1)
    const prev = sessionHistory.filter(s => s.startedAt > w2 && s.startedAt <= w1)
    const currQ = curr.reduce((a, s) => a + s.totalQuestions, 0)
    const currC = curr.reduce((a, s) => a + s.correctAnswers, 0)
    const prevQ = prev.reduce((a, s) => a + s.totalQuestions, 0)
    const prevC = prev.reduce((a, s) => a + s.correctAnswers, 0)
    if (!currQ || !prevQ) return { dir: 'neutral' as const, val: undefined }
    const diff = (currC / currQ) - (prevC / prevQ)
    return {
      dir: diff > 0.005 ? 'up' as const : diff < -0.005 ? 'down' as const : 'neutral' as const,
      val: Math.abs(diff) > 0.001
        ? `${diff > 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`
        : undefined,
    }
  }, [sessionHistory])

  return (
    <div className="page-scroll">
      <motion.div
        className="px-4 py-4 pb-6 space-y-5"
        variants={STAGGER.container}
        initial="initial"
        animate="animate"
      >

        {/* ---- BOAS-VINDAS ---- */}
        <motion.div variants={STAGGER.item} className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg">👋</span>
              <span className="text-xs text-text-muted font-body">Bom estudo,</span>
            </div>
            <h1 className="text-xl font-display font-bold text-text-primary">
              {profile.name.split(' ')[0]}
            </h1>
          </div>

          {/* Streak badge */}
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              stats.currentStreak > 0
                ? 'bg-orange-500/10 border border-orange-500/30'
                : 'bg-bg-elevated border border-border-subtle'
            )}>
              <Flame size={13} className={stats.currentStreak > 0 ? 'text-orange-400' : 'text-text-muted'} />
              <span className={cn(
                'font-mono font-bold text-sm',
                stats.currentStreak > 0 ? 'text-orange-400' : 'text-text-muted'
              )}>
                {stats.currentStreak}
              </span>
            </div>
            <span className="text-[9px] text-text-muted font-body">dias seguidos</span>
          </div>
        </motion.div>

        {/* ---- LEVEL E XP ---- */}
        <motion.div variants={STAGGER.item}>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-gold to-yellow-600 flex items-center justify-center">
                  <span className="text-bg-base font-display font-bold text-sm">{stats.level}</span>
                </div>
                <div>
                  <div className="text-xs font-display font-bold text-text-primary">Nível {stats.level}</div>
                  <div className="text-[10px] text-text-muted font-body">
                    {stats.level < 5 ? 'Iniciante' : stats.level < 10 ? 'Intermediário' : stats.level < 20 ? 'Avançado' : 'Elite'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-accent-gold">{formatNumber(stats.xp)} XP</div>
                <div className="text-[10px] text-text-muted">+{xp.needed - xp.current} para nível {stats.level + 1}</div>
              </div>
            </div>
            <ProgressBar value={Math.round(xp.percent * 100)} color="gold" size="sm" />
          </Card>
        </motion.div>

        {/* ---- GRID DE STATS ---- */}
        <motion.div variants={STAGGER.item}>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Precisão Geral"
              value={weekAccuracy !== null ? formatPercent(weekAccuracy) : formatPercent(stats.accuracy)}
              subtext={weekAccuracy !== null ? 'Últimas 7 dias' : stats.totalQuestions > 0 ? 'Geral' : 'Treine para ver'}
              trend={accTrend.dir}
              trendValue={accTrend.val}
              color="emerald"
              icon={<Target size={16} />}
            />
            <StatCard
              label="Questões Hoje"
              value={totalQuestionsToday}
              subtext={`Meta: ${dailyGoal}`}
              trend={totalQuestionsToday >= dailyGoal ? 'up' : 'neutral'}
              trendValue={totalQuestionsToday >= dailyGoal ? 'Meta atingida!' : `${dailyGoal - totalQuestionsToday} restantes`}
              color="blue"
              icon={<Zap size={16} />}
            />
            <StatCard
              label="Tempo de Estudo"
              value={stats.studyTimeMinutes > 0 ? formatTime(stats.studyTimeMinutes) : '—'}
              subtext="Total acumulado"
              color="gold"
              icon={<Clock size={16} />}
            />
            <StatCard
              label="Total de Mãos"
              value={stats.totalQuestions > 0 ? formatNumber(stats.totalQuestions) : '—'}
              subtext={stats.totalSessions > 0 ? `${stats.totalSessions} sessões` : 'Nenhuma sessão ainda'}
              color="blue"
              icon={<TrendingUp size={16} />}
            />
          </div>
        </motion.div>

        {/* ---- GRÁFICO DE EVOLUÇÃO ---- */}
        <motion.div variants={STAGGER.item}>
          <SectionHeader title="Evolução da Semana" subtitle="Precisão (ouro) e volume (azul)" />
          <Card className="p-4">
            {hasChartData ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={weeklyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f5c842" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f5c842" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3d9bff" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3d9bff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: '#505070', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="acc" tick={{ fill: '#505070', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <YAxis yAxisId="q" orientation="right" hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="acc"
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#f5c842"
                    strokeWidth={2}
                    fill="url(#goldGrad)"
                    dot={{ fill: '#f5c842', r: 3 }}
                  />
                  <Area
                    yAxisId="q"
                    type="monotone"
                    dataKey="questions"
                    stroke="#3d9bff"
                    strokeWidth={1.5}
                    fill="url(#blueGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[140px] flex flex-col items-center justify-center gap-2 text-center">
                <TrendingUp size={28} className="text-text-muted opacity-40" />
                <p className="text-xs text-text-muted">
                  Complete sessões de treino<br />para ver sua evolução
                </p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* ---- PONTOS FRACOS ---- */}
        <motion.div variants={STAGGER.item}>
          <SectionHeader title="Pontos a Melhorar" subtitle="Toque para treinar esse cenário agora" />
          {weakSpots.length > 0 ? (
            <div className="space-y-2">
              {weakSpots.map((spot, i) => (
                <Card
                  key={i}
                  className="p-3 flex items-center gap-3 cursor-pointer active:scale-[0.99]"
                  hoverable
                  onClick={() => navigate(spot.path, { state: { scenario: spot.scenario, mode: 'drill', autoStart: true } })}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0',
                    spot.accuracy < 65
                      ? 'bg-accent-crimson/10 text-accent-crimson'
                      : spot.accuracy < 75
                        ? 'bg-yellow-500/10 text-yellow-400'
                        : 'bg-accent-emerald/10 text-accent-emerald'
                  )}>
                    {spot.accuracy}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-body font-medium text-text-primary truncate">{spot.spot}</div>
                    <div className="text-[10px] text-text-muted mt-0.5">{spot.attempts} tentativas</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 w-20">
                    <ProgressBar
                      value={spot.accuracy}
                      color={spot.accuracy < 65 ? 'crimson' : spot.accuracy < 75 ? 'gold' : 'emerald'}
                      size="xs"
                    />
                    <ChevronRight size={12} className="text-text-muted flex-shrink-0" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 text-center">
              <p className="text-xs text-text-muted">
                Complete pelo menos 3 questões em um modo de treino<br />para ver seus pontos fracos aqui
              </p>
            </Card>
          )}
        </motion.div>

        {/* ---- PRECISÃO POR CENÁRIO ---- */}
        {scenarioAccuracy.length > 0 && (
          <motion.div variants={STAGGER.item}>
            <SectionHeader title="Precisão por Cenário" subtitle="Mín. 3 tentativas para aparecer" />
            <Card className="p-4">
              <ResponsiveContainer width="100%" height={scenarioAccuracy.length * 32 + 16}>
                <BarChart
                  data={scenarioAccuracy}
                  layout="vertical"
                  margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fill: '#9090b0', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val}%`, 'Precisão']}
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#9090b0' }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {scenarioAccuracy.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.accuracy >= 80 ? '#4ade80' : entry.accuracy >= 60 ? '#facc15' : '#f43f5e'}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-2 justify-center">
                {[['#4ade80', '≥ 80%'], ['#facc15', '60-79%'], ['#f43f5e', '< 60%']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                    <span className="text-[9px] text-text-muted">{label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ---- EVOLUÇÃO SEMANAL POR CENÁRIO ---- */}
        {sessionHistory.length > 0 && (
          <motion.div variants={STAGGER.item}>
            <SectionHeader title="Evolução Semanal" subtitle="Desempenho por cenário" />
            <Card className="p-4">
              {/* Tabs de semana */}
              <div className="flex gap-1.5 mb-4">
                {[
                  { offset: 0, label: 'Esta semana' },
                  { offset: 1, label: 'Sem. -1' },
                  { offset: 2, label: 'Sem. -2' },
                  { offset: 3, label: 'Sem. -3' },
                ].map(({ offset, label }) => (
                  <button
                    key={offset}
                    onClick={() => setSelectedWeek(offset)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-[10px] font-body border transition-all',
                      selectedWeek === offset
                        ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                        : 'bg-bg-overlay border-border-subtle text-text-muted'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {weeklyByScenario.length > 0 ? (
                <div className="space-y-2">
                  {weeklyByScenario.map((row) => (
                    <div key={row.scenario} className="flex items-center gap-3">
                      <div className="text-[10px] text-text-secondary font-body w-20 flex-shrink-0 truncate">{row.name}</div>
                      <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${row.accuracy}%`,
                            background: row.accuracy >= 80 ? '#4ade80' : row.accuracy >= 60 ? '#facc15' : '#f43f5e',
                          }}
                        />
                      </div>
                      <div className={cn(
                        'font-mono text-[10px] font-bold w-8 text-right flex-shrink-0',
                        row.accuracy >= 80 ? 'text-accent-emerald' : row.accuracy >= 60 ? 'text-yellow-400' : 'text-accent-crimson'
                      )}>
                        {row.accuracy}%
                      </div>
                      <div className="text-[9px] text-text-muted w-8 text-right flex-shrink-0">{row.attempts}q</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center py-3">
                  Nenhuma sessão registrada neste período
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {/* ---- ATALHOS RÁPIDOS ---- */}
        <motion.div variants={STAGGER.item}>
          <SectionHeader title="Treinar Agora" />
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path, item.navState ? { state: item.navState } : undefined)}
                className={cn(
                  'p-4 rounded-xl bg-gradient-to-br border text-left transition-all duration-200 active:scale-95',
                  item.color, item.border,
                  (item as any).spanFull && 'col-span-2'
                )}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs font-display font-bold text-text-primary">{item.label}</div>
                <div className="text-[10px] text-text-muted mt-0.5">{item.sub}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ---- CONQUISTAS RECENTES ---- */}
        <motion.div variants={STAGGER.item}>
          <SectionHeader
            title="Conquistas"
            action={
              <button onClick={() => navigate('/profile')} className="flex items-center gap-1 text-[11px] text-accent-gold">
                Ver todas <ChevronRight size={12} />
              </button>
            }
          />
          {profile.achievements.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {profile.achievements.slice(0, 4).map((ach) => (
                <Card key={ach.id} className={cn(
                  'flex-shrink-0 p-3 w-28 flex flex-col items-center text-center gap-1',
                  ach.unlockedAt ? 'border-accent-gold/20' : 'opacity-50'
                )}>
                  <div className={cn('text-2xl', !ach.unlockedAt && 'grayscale')}>{ach.icon}</div>
                  <div className="text-[10px] font-display font-bold text-text-primary leading-tight">{ach.title}</div>
                  {ach.maxProgress && (
                    <>
                      <ProgressBar
                        value={Math.round(((ach.progress || 0) / ach.maxProgress) * 100)}
                        color={ach.unlockedAt ? 'gold' : 'blue'}
                        size="xs"
                      />
                      <div className="text-[9px] text-text-muted font-mono">
                        {ach.progress || 0}/{ach.maxProgress}
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-4 text-center">
              <p className="text-xs text-text-muted">Nenhuma conquista ainda. Comece a treinar!</p>
            </Card>
          )}
        </motion.div>

      </motion.div>
    </div>
  )
}
