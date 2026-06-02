// ============================================================
// POKERMIND PRO — PERFIL DO USUÁRIO (v2)
// Avatar, níveis progressivos, 61 conquistas, metas, stats
// ============================================================
// XP_HOOK: ao adicionar novas fontes de XP no app, use XP_REWARDS de @/lib/utils
// e aplique getDifficultyXPMultiplier(defaultDifficulty) antes de chamar addXP().
// Depois chame syncAchievements() para atualizar conquistas automaticamente.
// ============================================================

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useUserStore, useTrainingStore, useUIStore } from '@/store'
import { useAuthStore } from '@/store/authStore'
import { signInWithGoogle, signOut } from '@/firebase/auth'
import { Button, Card, Badge, ProgressBar } from '@/components/ui'
import { getLevelData, xpToNextLevel, formatNumber, formatTime, XP_REWARDS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  Trophy, Target, Flame, Star, TrendingUp,
  Crown, Zap, BookOpen, ChevronRight,
  Edit3, Settings, Lock, X, Plus, Trash2,
  BarChart2, Award, Clock, Layers, LogIn, LogOut
} from 'lucide-react'
import { StudyGoal } from '@/types'

// ============================================================
// COMPONENTE: STAT DETALHADA
// ============================================================

function DetailStat({ label, value, sublabel, icon, color = 'text-text-primary' }: {
  label: string; value: string | number; sublabel?: string
  icon: React.ReactNode; color?: string
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-bg-elevated flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className={cn('text-lg font-bold font-mono', color)}>{value}</div>
        <div className="text-xs text-text-muted truncate">{label}</div>
        {sublabel && <div className="text-[10px] text-text-muted/60">{sublabel}</div>}
      </div>
    </motion.div>
  )
}

// ============================================================
// COMPONENTE: CONQUISTA
// ============================================================

function AchievementCard({ achievement }: { achievement: any }) {
  const isUnlocked = !!achievement.unlockedAt
  // Para conquistas desbloqueadas, sempre mostra 100% na barra
  const progress = isUnlocked ? (achievement.maxProgress || 1) : (achievement.progress || 0)
  const max = achievement.maxProgress || 1
  const pct = Math.min((progress / max) * 100, 100)

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn('glass rounded-2xl p-3 border transition-all',
        isUnlocked ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border-subtle opacity-70')}>
      <div className="flex items-start gap-3">
        <div className={cn('text-2xl w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          isUnlocked ? 'bg-yellow-500/20' : 'bg-bg-elevated grayscale')}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={cn('text-sm font-bold', isUnlocked ? 'text-text-primary' : 'text-text-muted')}>
              {achievement.title}
            </span>
            {isUnlocked && <Badge variant="gold" size="sm">✓</Badge>}
          </div>
          <p className="text-xs text-text-muted mb-1">{achievement.description}</p>
          {isUnlocked && achievement.unlockedAt ? (
            <div className="text-[10px] text-yellow-500/70">
              Desbloqueado em {new Date(achievement.unlockedAt).toLocaleDateString('pt-BR')}
            </div>
          ) : (
            <>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-yellow-500/60"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }} />
              </div>
              <div className="text-[10px] text-text-muted mt-1">{achievement.progress || 0}/{max}</div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================================
// COMPONENTE: META
// ============================================================

function GoalCard({ goal, onRemove, canRemove }: {
  goal: any; onRemove?: () => void; canRemove?: boolean
}) {
  const goalLabels: Record<string, string> = {
    daily_questions: '🎯 Questões Diárias',
    weekly_accuracy: '📊 Precisão Semanal',
    streak: '🔥 Dias Consecutivos',
    daily_time: '⏱️ Tempo Diário (min)',
  }
  const periodLabel: Record<string, string> = {
    daily: 'hoje', weekly: 'esta semana', monthly: 'este mês'
  }
  const pct = Math.min((goal.current / Math.max(goal.target, 1)) * 100, 100)

  return (
    <div className="glass rounded-2xl p-3 border border-border-subtle">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-text-primary">{goalLabels[goal.type] || goal.type}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{periodLabel[goal.period] || goal.period}</span>
          {canRemove && onRemove && (
            <button onClick={onRemove} className="text-red-400/50 hover:text-red-400 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <ProgressBar value={pct} size="sm" animated />
        </div>
        <span className="text-sm font-bold font-mono text-yellow-400 shrink-0">{goal.current}/{goal.target}</span>
      </div>
    </div>
  )
}

// ============================================================
// COMPONENTE: PERFORMANCE POR POSIÇÃO
// ============================================================

function PositionPerformance({ sessionHistory }: { sessionHistory: any[] }) {
  const positions = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
  const perf = positions.map(pos => {
    const allQ = sessionHistory.flatMap(s => s.questions || []).filter((q: any) => q.position === pos)
    const total = allQ.length
    const correct = allQ.filter((q: any) => q.isCorrect).length
    return { pos, total, accuracy: total > 0 ? correct / total : 0 }
  })
  const colorClass = (acc: number) =>
    acc >= 0.8 ? 'bg-emerald-500' : acc >= 0.6 ? 'bg-yellow-500' : acc >= 0.4 ? 'bg-orange-500' : 'bg-red-500'

  return (
    <div className="space-y-2">
      {perf.map(({ pos, total, accuracy }) => (
        <div key={pos} className="flex items-center gap-3">
          <span className="text-xs font-mono text-text-muted w-8">{pos}</span>
          <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', total === 0 ? 'bg-border-default' : colorClass(accuracy))}
              initial={{ width: 0 }}
              animate={{ width: total === 0 ? '0%' : `${accuracy * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 }} />
          </div>
          <span className="text-xs font-mono text-text-secondary w-10 text-right">
            {total === 0 ? '—' : `${Math.round(accuracy * 100)}%`}
          </span>
          <span className="text-[10px] text-text-muted w-12 text-right">
            {total > 0 ? `${total}q` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// COMPONENTE: PERFORMANCE POR CENÁRIO
// ============================================================

function ScenarioPerformance({ sessionHistory }: { sessionHistory: any[] }) {
  const scenarios: Record<string, string> = {
    open_raise: 'Open Raise',
    '3bet': '3-Bet',
    push_fold: 'Push/Fold',
    bb_defense: 'BB Defense',
    sb_vs_bb: 'SB vs BB',
    squeeze: 'Squeeze',
    '4bet': '4-Bet',
    vs_raise: 'vs Raise',
    postflop: 'Pós-Flop',
  }
  const perf = Object.entries(scenarios).map(([key, label]) => {
    const sessions = sessionHistory.filter(s => s.scenario === key)
    const total = sessions.reduce((a, s) => a + (s.totalQuestions || 0), 0)
    const correct = sessions.reduce((a, s) => a + (s.correctAnswers || 0), 0)
    return { key, label, total, accuracy: total > 0 ? correct / total : 0 }
  }).filter(s => s.total > 0)

  if (perf.length === 0) {
    return <p className="text-xs text-text-muted text-center py-4">Nenhuma sessão registrada ainda.</p>
  }

  const colorClass = (acc: number) =>
    acc >= 0.8 ? 'bg-emerald-500' : acc >= 0.6 ? 'bg-yellow-500' : acc >= 0.4 ? 'bg-orange-500' : 'bg-red-500'

  return (
    <div className="space-y-2">
      {perf.map(({ key, label, total, accuracy }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-xs text-text-muted w-20 truncate">{label}</span>
          <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', colorClass(accuracy))}
              initial={{ width: 0 }}
              animate={{ width: `${accuracy * 100}%` }}
              transition={{ duration: 0.8 }} />
          </div>
          <span className="text-xs font-mono text-text-secondary w-10 text-right">{Math.round(accuracy * 100)}%</span>
          <span className="text-[10px] text-text-muted w-10 text-right">{total}q</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// COMPONENTE: TIER ROADMAP
// ============================================================

const TIER_DEFS = [
  { tier: 1, name: 'Iniciante',    color: 'text-gray-400',    bg: 'bg-gray-500/20',    range: '1-5' },
  { tier: 2, name: 'Recreativo',   color: 'text-blue-400',    bg: 'bg-blue-500/20',    range: '6-10' },
  { tier: 3, name: 'Amador',       color: 'text-emerald-400', bg: 'bg-emerald-500/20', range: '11-15' },
  { tier: 4, name: 'Competidor',   color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  range: '16-20' },
  { tier: 5, name: 'Semi-Pro',     color: 'text-orange-400',  bg: 'bg-orange-500/20',  range: '21-25' },
  { tier: 6, name: 'Profissional', color: 'text-purple-400',  bg: 'bg-purple-500/20',  range: '26-30' },
  { tier: 7, name: 'Expert',       color: 'text-red-400',     bg: 'bg-red-500/20',     range: '31-35' },
  { tier: 8, name: 'Mestre',       color: 'text-amber-400',   bg: 'bg-amber-500/20',   range: '36-40' },
  { tier: 9, name: 'Grão-Mestre',  color: 'text-cyan-400',    bg: 'bg-cyan-500/20',    range: '41-45' },
  { tier: 10, name: 'Lendário',    color: 'text-white',       bg: 'bg-white/10',       range: '46-50' },
]

function TierRoadmap({ currentLevel }: { currentLevel: number }) {
  const currentTier = Math.min(Math.ceil(currentLevel / 5), 10)
  return (
    <div className="space-y-1.5">
      {TIER_DEFS.map(t => {
        const isPast = t.tier < currentTier
        const isCurrent = t.tier === currentTier
        const isFuture = t.tier > currentTier
        return (
          <div key={t.tier} className={cn('flex items-center gap-3 rounded-xl px-3 py-2 transition-all',
            isCurrent ? 'bg-yellow-500/10 border border-yellow-500/30' : 'opacity-50')}>
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0', t.bg)}>
              {isPast ? '✓' : isCurrent ? '▶' : `${t.tier}`}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('text-xs font-bold', isCurrent ? t.color : isPast ? 'text-text-muted' : 'text-text-muted/50')}>
                {t.name}
              </div>
              <div className="text-[10px] text-text-muted/60">Níveis {t.range}</div>
            </div>
            {isCurrent && (
              <span className="text-[10px] font-bold text-yellow-400 shrink-0">Atual</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
// MODAL: EDITAR NOME
// ============================================================

function EditNameModal({ name, onSave, onClose }: {
  name: string; onSave: (n: string) => void; onClose: () => void
}) {
  const [value, setValue] = useState(name)
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6"
      onClick={onClose}>
      <div className="w-full max-w-sm glass-strong rounded-2xl p-5 border border-border-default"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-text-primary">Editar nome</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <input
          type="text" value={value} onChange={e => setValue(e.target.value)}
          maxLength={30} autoFocus
          className="w-full bg-bg-elevated border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent-gold/60 transition-colors mb-4"
          placeholder="Seu nome de jogador"
        />
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary">
            Cancelar
          </button>
          <button
            onClick={() => { if (value.trim()) { onSave(value.trim()); onClose() } }}
            disabled={!value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-accent-gold/20 text-accent-gold border border-accent-gold/30 text-sm font-semibold disabled:opacity-40">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// MODAL: ADICIONAR META
// ============================================================

const GOAL_TYPE_OPTIONS = [
  { value: 'daily_questions', label: '🎯 Questões por dia', period: 'daily' as const, min: 5, max: 100, step: 5, default: 20 },
  { value: 'weekly_accuracy', label: '📊 Precisão semanal (%)', period: 'weekly' as const, min: 50, max: 95, step: 5, default: 75 },
  { value: 'streak', label: '🔥 Streak alvo (dias)', period: 'daily' as const, min: 3, max: 100, step: 1, default: 7 },
  { value: 'daily_time', label: '⏱️ Tempo de estudo (min/dia)', period: 'daily' as const, min: 10, max: 120, step: 10, default: 30 },
]

function AddGoalModal({ onAdd, onClose }: {
  onAdd: (goal: StudyGoal) => void; onClose: () => void
}) {
  const [typeIdx, setTypeIdx] = useState(0)
  const [target, setTarget] = useState(GOAL_TYPE_OPTIONS[0].default)
  const selected = GOAL_TYPE_OPTIONS[typeIdx]

  const handleTypeChange = (idx: number) => {
    setTypeIdx(idx)
    setTarget(GOAL_TYPE_OPTIONS[idx].default)
  }

  const handleAdd = () => {
    onAdd({
      id: `g_${Date.now()}`,
      type: selected.value as any,
      target,
      current: 0,
      period: selected.period,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6"
      onClick={onClose}>
      <div className="w-full max-w-sm glass-strong rounded-2xl p-5 border border-border-default"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-bold text-text-primary">Adicionar Meta</div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="space-y-2 mb-4">
          {GOAL_TYPE_OPTIONS.map((opt, i) => (
            <button key={opt.value} onClick={() => handleTypeChange(i)}
              className={cn('w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all',
                typeIdx === i
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold'
                  : 'bg-bg-elevated text-text-secondary border border-border-subtle hover:border-border-default')}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs text-text-muted mb-2">
            <span>Meta:</span>
            <span className="font-bold text-yellow-400">{target}</span>
          </div>
          <input type="range" min={selected.min} max={selected.max} step={selected.step} value={target}
            onChange={e => setTarget(Number(e.target.value))}
            className="w-full accent-yellow-400 h-1.5" />
          <div className="flex justify-between text-[10px] text-text-muted mt-1">
            <span>{selected.min}</span><span>{selected.max}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary">
            Cancelar
          </button>
          <button onClick={handleAdd}
            className="flex-1 py-2.5 rounded-xl bg-accent-gold/20 text-accent-gold border border-accent-gold/30 text-sm font-semibold">
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FILTROS DE CONQUISTAS
// ============================================================

const ACH_FILTERS = [
  { id: 'all',         label: 'Todas',      icon: '🏅' },
  { id: 'unlocked',    label: 'Obtidas',    icon: '✅' },
  { id: 'streak',      label: 'Streak',     icon: '🔥' },
  { id: 'precision',   label: 'Precisão',   icon: '🎯' },
  { id: 'volume',      label: 'Volume',     icon: '📊' },
  { id: 'mastery',     label: 'Domínio',    icon: '♠' },
  { id: 'xp+level',    label: 'XP/Nível',   icon: '⭐' },
  { id: 'special',     label: 'Especial',   icon: '💎' },
]

// ============================================================
// TABS
// ============================================================

type ProfileTab = 'overview' | 'achievements' | 'goals' | 'stats'

const TABS: { id: ProfileTab; label: string; icon: string }[] = [
  { id: 'overview',     label: 'Visão Geral', icon: '👤' },
  { id: 'achievements', label: 'Conquistas',  icon: '🏆' },
  { id: 'goals',        label: 'Metas',       icon: '🎯' },
  { id: 'stats',        label: 'Stats',       icon: '📊' },
]

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function Profile() {
  const navigate = useNavigate()
  const { profile, upgradePlan, updateName, addGoal, removeGoal } = useUserStore()
  const { sessionHistory, totalQuestionsToday } = useTrainingStore()
  const { defaultDifficulty } = useUIStore()
  const { user, guestMode, setGuestMode } = useAuthStore()

  const [activeTab, setActiveTab] = useState<ProfileTab>('overview')
  const [showEditName, setShowEditName] = useState(false)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [achFilter, setAchFilter] = useState('all')
  const [authLoading, setAuthLoading] = useState(false)

  const { stats, achievements, goals } = profile
  const levelData = getLevelData(stats.level)
  const xpInfo = xpToNextLevel(stats.xp)

  const isPremium = profile.plan !== 'free'

  // Sincroniza progresso da meta de questões diárias com totalQuestionsToday
  const goalsWithLiveProgress = useMemo(() => goals.map((g: any) =>
    g.type === 'daily_questions' && g.period === 'daily'
      ? { ...g, current: Math.min(totalQuestionsToday, g.target) }
      : g
  ), [goals, totalQuestionsToday])

  const unlockedAchievements = achievements.filter((a: any) => a.unlockedAt)
  const isPremiumUser = profile.plan !== 'free'

  // Filtro de conquistas por categoria
  const filteredAchievements = useMemo(() => {
    let list = [...achievements]
    if (achFilter === 'unlocked') {
      list = list.filter(a => a.unlockedAt)
    } else if (achFilter === 'xp+level') {
      list = list.filter(a => a.category === 'xp' || a.category === 'level')
    } else if (achFilter !== 'all') {
      list = list.filter(a => a.category === achFilter)
    }
    // Desbloqueadas primeiro (mais recentes), depois por % de progresso
    return list.sort((a, b) => {
      if (a.unlockedAt && !b.unlockedAt) return -1
      if (!a.unlockedAt && b.unlockedAt) return 1
      if (a.unlockedAt && b.unlockedAt) return (b.unlockedAt || 0) - (a.unlockedAt || 0)
      const pA = ((a.progress || 0) / (a.maxProgress || 1))
      const pB = ((b.progress || 0) / (b.maxProgress || 1))
      return pB - pA
    })
  }, [achievements, achFilter])

  // Grid dos últimos 7 dias de estudo
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })
  }, [])
  const studiedDatesSet = useMemo(() =>
    new Set(stats.lastStudyDates || []), [stats.lastStudyDates])

  const DIFFICULTY_LABELS = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
  const DIFFICULTY_COLORS = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    hard: 'text-red-400 bg-red-500/10 border-red-500/30',
  }

  const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="page-scroll">
      <div className="p-4 max-w-2xl mx-auto pb-28">

        {/* ===== HERO CARD ===== */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden mb-5"
          style={{ background: 'linear-gradient(135deg, #0d2818 0%, #1b4332 50%, #0d2818 100%)' }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #f5a623 0%, transparent 50%)' }} />
          <div className="absolute top-0 right-0 text-[120px] opacity-5 leading-none select-none">♠</div>

          <div className="relative p-5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center text-3xl">🎭</div>
                {isPremium && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
                    <Crown size={10} className="text-bg-base" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-bold text-text-primary">{profile.name}</h2>
                  {/* Botão editar nome — funcional */}
                  <button
                    onClick={() => setShowEditName(true)}
                    className="text-text-muted hover:text-text-primary transition-colors">
                    <Edit3 size={13} />
                  </button>
                </div>
                <p className="text-xs text-text-muted mb-2">{user?.email ?? profile.email}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isPremium ? 'gold' : 'neutral'}>
                    {isPremium ? '⭐ Premium' : '🆓 Free'}
                  </Badge>
                  <span className={cn('text-sm font-bold', levelData.color)}>
                    {levelData.icon} {levelData.fullName}
                  </span>
                  {/* Badge de dificuldade */}
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border',
                    DIFFICULTY_COLORS[defaultDifficulty])}>
                    {DIFFICULTY_LABELS[defaultDifficulty]}
                  </span>
                </div>
              </div>
            </div>

            {/* Barra de XP */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-yellow-400">
                  Nível {stats.level} — {levelData.tierName}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {formatNumber(xpInfo.current)} / {formatNumber(xpInfo.needed)} XP
                </span>
              </div>
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #f5a623, #ffcf72)' }}
                  initial={{ width: 0 }} animate={{ width: `${xpInfo.percent * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }} />
              </div>
              <div className="text-[10px] text-text-muted mt-1">
                {formatNumber(xpInfo.needed - xpInfo.current)} XP para Nível {stats.level + 1}
              </div>
            </div>

            {/* Linha de streak / XP / conquistas */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-orange-400" />
                <span className="text-sm font-bold text-orange-400">{stats.currentStreak}</span>
                <span className="text-xs text-text-muted">dias</span>
              </div>
              <span className="text-text-muted text-xs">|</span>
              <div className="flex items-center gap-1.5">
                <Star size={14} className="text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">{formatNumber(stats.xp)}</span>
                <span className="text-xs text-text-muted">XP</span>
              </div>
              <span className="text-text-muted text-xs">|</span>
              <div className="flex items-center gap-1.5">
                <Trophy size={14} className="text-purple-400" />
                <span className="text-sm font-bold text-purple-400">{unlockedAchievements.length}</span>
                <span className="text-xs text-text-muted">/{achievements.length}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ===== BANNER PREMIUM ===== */}
        {!isPremium && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl p-4 mb-4 border border-yellow-500/30 overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, rgba(245,166,35,0.1), rgba(245,166,35,0.05))' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Crown size={18} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-text-primary">Desbloqueie o Premium</div>
                <div className="text-xs text-text-muted">Metas personalizadas + acesso ilimitado</div>
              </div>
              <Button size="sm" variant="gold" onClick={() => upgradePlan('premium')}>Upgrade</Button>
            </div>
          </motion.div>
        )}

        {/* ===== TABS ===== */}
        <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 mb-4 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                activeTab === tab.id ? 'bg-yellow-500 text-bg-base' : 'text-text-muted hover:text-text-primary')}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ========== TAB: VISÃO GERAL ========== */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stats rápidas */}
            <div className="grid grid-cols-2 gap-3">
              <DetailStat label="Questões totais" value={formatNumber(stats.totalQuestions)}
                icon={<Target size={16} className="text-yellow-400" />} color="text-yellow-400" />
              <DetailStat label="Precisão geral" value={`${Math.round(stats.accuracy * 100)}%`}
                sublabel={`${stats.totalCorrect} corretas`}
                icon={<TrendingUp size={16} className="text-emerald-400" />} color="text-emerald-400" />
              <DetailStat label="Tempo de estudo" value={formatTime(stats.studyTimeMinutes)}
                icon={<BookOpen size={16} className="text-blue-400" />} color="text-blue-400" />
              <DetailStat label="Sessões realizadas" value={stats.totalSessions}
                icon={<Zap size={16} className="text-purple-400" />} color="text-purple-400" />
            </div>

            {/* Card de streak */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Sequência de Estudos</h4>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400 font-mono">{stats.currentStreak}</div>
                  <div className="text-xs text-text-muted">Streak atual</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400 font-mono">{stats.maxStreak}</div>
                  <div className="text-xs text-text-muted">Recorde</div>
                </div>
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <div className="text-[10px] text-text-muted mb-2">Últimos 7 dias</div>
                {/* Grid de 7 dias baseado em lastStudyDates reais */}
                <div className="flex gap-1">
                  {last7Days.map((day, i) => {
                    const studied = studiedDatesSet.has(day)
                    const dow = new Date(day + 'T12:00:00').getDay()
                    return (
                      <div key={day} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          transition={{ delay: i * 0.06 }}
                          className={cn('w-full h-7 rounded-lg flex items-center justify-center text-[10px]',
                            studied
                              ? i === 6 ? 'bg-orange-500 text-white' : 'bg-orange-400/70 text-white'
                              : 'bg-bg-elevated text-text-muted'
                          )}>
                          {studied ? '🔥' : '·'}
                        </motion.div>
                        <span className="text-[8px] text-text-muted/60">{DAY_LABELS[dow]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>

            {/* Preview de conquistas */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-text-muted uppercase">Conquistas</h4>
                <button onClick={() => setActiveTab('achievements')} className="text-xs text-yellow-400 flex items-center gap-1">
                  Ver todas <ChevronRight size={12} />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap mb-2">
                {achievements.slice(0, 8).map((a: any) => (
                  <div key={a.id} title={a.title}
                    className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-xl border',
                      a.unlockedAt ? 'bg-yellow-500/15 border-yellow-500/30' : 'bg-bg-elevated border-border-subtle grayscale opacity-40')}>
                    {a.icon}
                  </div>
                ))}
              </div>
              <div className="text-xs text-text-muted">
                {unlockedAchievements.length} de {achievements.length} conquistadas
              </div>
            </Card>

            {/* Preview de metas */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-text-muted uppercase">Metas</h4>
                <button onClick={() => setActiveTab('goals')} className="text-xs text-yellow-400 flex items-center gap-1">
                  Ver todas <ChevronRight size={12} />
                </button>
              </div>
              <div className="space-y-2">
                {goalsWithLiveProgress.slice(0, 3).map((g: any) => <GoalCard key={g.id} goal={g} />)}
              </div>
            </Card>

            {/* Dificuldade atual */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Modo de Treino</h4>
              <div className="flex items-center gap-3">
                <div className={cn('px-3 py-2 rounded-xl border text-sm font-bold',
                  DIFFICULTY_COLORS[defaultDifficulty])}>
                  {defaultDifficulty === 'easy' ? '😊' : defaultDifficulty === 'hard' ? '💀' : '⚖️'} {DIFFICULTY_LABELS[defaultDifficulty]}
                </div>
                <div className="flex-1 text-xs text-text-muted">
                  {defaultDifficulty === 'easy' && 'Mais XP por acerto, questões com mais plays óbvias.'}
                  {defaultDifficulty === 'medium' && 'Equilíbrio entre acertos e disciplina de fold.'}
                  {defaultDifficulty === 'hard' && 'Menos XP por acerto, mais questões borderline de fold.'}
                </div>
                <button onClick={() => navigate('/settings')} className="text-xs text-yellow-400 shrink-0">
                  Mudar
                </button>
              </div>
              {/* ==== XP_HOOK: indicador de multiplicador de XP ==== */}
              <div className="mt-2 text-[10px] text-text-muted/60">
                Multiplicador: {defaultDifficulty === 'easy' ? '1.2×' : defaultDifficulty === 'hard' ? '0.75×' : '1.0×'} XP por acerto
              </div>
            </Card>

            {/* Botões de navegação */}
            <div className="space-y-2">
              <button onClick={() => navigate('/settings')}
                className="w-full glass rounded-xl p-3 flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors">
                <Settings size={16} /><span className="text-sm">Configurações</span><ChevronRight size={14} className="ml-auto" />
              </button>

              {/* Auth */}
              {user ? (
                <div className="space-y-2">
                  <div className="w-full glass rounded-xl p-3 flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-accent-emerald animate-pulse shrink-0" />
                    <span className="text-xs text-text-muted truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={async () => {
                      setAuthLoading(true)
                      try { await signOut() } finally { setAuthLoading(false) }
                    }}
                    disabled={authLoading}
                    className="w-full glass rounded-xl p-3 flex items-center gap-3 text-red-400 hover:text-red-300 transition-colors disabled:opacity-60"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">{authLoading ? 'Saindo...' : 'Sair da conta'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setAuthLoading(true)
                    try { await signInWithGoogle(); setGuestMode(false) }
                    catch { /* silent */ }
                    finally { setAuthLoading(false) }
                  }}
                  disabled={authLoading}
                  className="w-full glass rounded-xl p-3 flex items-center gap-3 text-accent-gold hover:text-yellow-400 transition-colors disabled:opacity-60"
                >
                  <LogIn size={16} />
                  <span className="text-sm">{authLoading ? 'Entrando...' : 'Entrar com Google'}</span>
                  <span className="ml-auto text-[10px] text-text-muted">Sincroniza na nuvem</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========== TAB: CONQUISTAS ========== */}
        {activeTab === 'achievements' && (
          <div className="space-y-3">
            {/* Header com contador */}
            <div className="glass rounded-2xl p-3 border border-border-subtle flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div>
                <div className="text-lg font-bold text-yellow-400">
                  {unlockedAchievements.length} / {achievements.length}
                </div>
                <div className="text-xs text-text-muted">conquistas desbloqueadas</div>
              </div>
              <div className="ml-auto w-24">
                <ProgressBar value={(unlockedAchievements.length / Math.max(achievements.length, 1)) * 100} size="sm" animated />
              </div>
            </div>

            {/* Filtros por categoria */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {ACH_FILTERS.map(f => (
                <button key={f.id} onClick={() => setAchFilter(f.id)}
                  className={cn('flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                    achFilter === f.id
                      ? 'bg-yellow-500 text-bg-base'
                      : 'bg-bg-elevated text-text-muted hover:text-text-primary border border-border-subtle')}>
                  <span>{f.icon}</span><span>{f.label}</span>
                </button>
              ))}
            </div>

            {/* Lista de conquistas filtradas */}
            {filteredAchievements.length === 0 ? (
              <div className="text-center py-8 text-text-muted text-sm">
                Nenhuma conquista nesta categoria ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAchievements.map((a: any) => (
                  <AchievementCard key={a.id} achievement={a} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== TAB: METAS ========== */}
        {activeTab === 'goals' && (
          <div className="space-y-3">
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Metas Ativas</h4>
              <div className="space-y-3">
                {goalsWithLiveProgress.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-4">Nenhuma meta configurada.</p>
                ) : (
                  goalsWithLiveProgress.map((g: any) => (
                    <GoalCard
                      key={g.id}
                      goal={g}
                      canRemove={isPremiumUser && !['g001', 'g002'].includes(g.id)}
                      onRemove={() => removeGoal(g.id)}
                    />
                  ))
                )}
              </div>
            </Card>

            {/* Botão de adicionar meta */}
            <div className="rounded-2xl border border-dashed border-border-default p-5 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-sm font-semibold text-text-secondary mb-1">Adicionar nova meta</div>
              <div className="text-xs text-text-muted mb-3">Personalize seus objetivos de estudo</div>
              {isPremiumUser ? (
                <Button size="sm" variant="secondary" onClick={() => setShowAddGoal(true)}>
                  <Plus size={12} /> Nova Meta
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button size="sm" variant="secondary" disabled>
                    <Lock size={12} /> Premium
                  </Button>
                  <p className="text-[10px] text-text-muted">Faça upgrade para criar metas personalizadas</p>
                </div>
              )}
            </div>

            {/* Dicas */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">💡 Dicas de Consistência</h4>
              <div className="space-y-2 text-xs text-text-secondary">
                {[
                  'Estude pelo menos 20 questões por dia para manter a consistência',
                  'Foque nos pontos fracos: posições com menor precisão primeiro',
                  'Revise as mãos erradas no dia seguinte para fixar o aprendizado',
                  defaultDifficulty === 'hard'
                    ? 'No modo Difícil, a seleção inclui mais hands borderline — paciência na análise!'
                    : 'Troque para o modo Difícil quando atingir 80%+ de precisão no modo atual.',
                ].map((tip, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-yellow-400 shrink-0">▸</span><span>{tip}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ========== TAB: STATS ========== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            {/* Performance por posição */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Performance por Posição</h4>
              <PositionPerformance sessionHistory={sessionHistory} />
            </Card>

            {/* Performance por cenário */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Performance por Cenário</h4>
              <ScenarioPerformance sessionHistory={sessionHistory} />
            </Card>

            {/* Distribuição de resultados */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Distribuição de Resultados</h4>
              <div className="space-y-2">
                {[
                  { label: 'Acertos', value: stats.totalCorrect, color: 'bg-emerald-500' },
                  { label: 'Erros',   value: stats.totalQuestions - stats.totalCorrect, color: 'bg-red-500' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-text-muted w-12">{item.label}</span>
                    <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                      <motion.div className={cn('h-full rounded-full', item.color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / Math.max(stats.totalQuestions, 1)) * 100}%` }}
                        transition={{ duration: 0.8 }} />
                    </div>
                    <span className="text-xs font-mono text-text-secondary w-10 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Grade de stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: stats.totalSessions, label: 'Sessões', color: 'text-yellow-400' },
                { val: formatTime(stats.studyTimeMinutes), label: 'Tempo total', color: 'text-blue-400' },
                { val: stats.maxStreak, label: 'Maior streak', color: 'text-purple-400' },
                { val: stats.totalSessions > 0
                    ? (stats.totalQuestions / stats.totalSessions).toFixed(0)
                    : '0',
                  label: 'Méd/sessão', color: 'text-emerald-400' },
                { val: stats.competitionGamesPlayed || 0, label: 'Competições', color: 'text-orange-400' },
                { val: stats.competitionBestScore || 0, label: 'Melhor score', color: 'text-cyan-400' },
              ].map(item => (
                <div key={item.label} className="glass rounded-2xl p-3 text-center">
                  <div className={cn('text-2xl font-bold font-mono', item.color)}>{item.val}</div>
                  <div className="text-xs text-text-muted">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Tier Roadmap */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Progressão de Tier</h4>
              <p className="text-xs text-text-muted mb-3">
                Nível {stats.level} — {levelData.fullName}
              </p>
              <TierRoadmap currentLevel={stats.level} />
            </Card>

            {/* Info de XP */}
            <Card className="p-4">
              <h4 className="text-xs font-bold text-text-muted uppercase mb-3">Sistema de XP</h4>
              <div className="space-y-1.5 text-xs text-text-secondary">
                {[
                  { label: 'Acerto no estudo', xp: `${XP_REWARDS.CORRECT_STUDY} XP` },
                  { label: 'Acerto no exam', xp: `${XP_REWARDS.CORRECT_EXAM} XP` },
                  { label: 'Sessão completa', xp: `${XP_REWARDS.SESSION_COMPLETE} XP` },
                  { label: 'Sessão perfeita', xp: `+${XP_REWARDS.PERFECT_SESSION} XP` },
                  { label: 'Completar aula', xp: `${XP_REWARDS.LESSON_COMPLETE} XP` },
                  { label: 'Flashcard revisado', xp: `${XP_REWARDS.FLASHCARD_REVIEW} XP` },
                ].map(r => (
                  <div key={r.label} className="flex justify-between">
                    <span>{r.label}</span>
                    <span className="text-yellow-400 font-mono">{r.xp}</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t border-border-subtle text-[10px] text-text-muted">
                  Multiplicador atual ({DIFFICULTY_LABELS[defaultDifficulty]}):
                  {' '}<span className="text-yellow-400 font-mono">
                    {defaultDifficulty === 'easy' ? '×1.2' : defaultDifficulty === 'hard' ? '×0.75' : '×1.0'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* ===== MODAIS ===== */}
      <AnimatePresence>
        {showEditName && (
          <EditNameModal
            name={profile.name}
            onSave={updateName}
            onClose={() => setShowEditName(false)}
          />
        )}
        {showAddGoal && (
          <AddGoalModal
            onAdd={addGoal}
            onClose={() => setShowAddGoal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
