// ============================================================
// POKERMIND PRO — STORE GLOBAL (ZUSTAND)
// Gerenciamento centralizado de estado da aplicação
// ============================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import {
  UserProfile, UserStats, DrillSession, DrillResult,
  SavedHand, NavSection, UserPlan, QuestionSM2Data, StudyGoal
} from '@/types'
import { ACHIEVEMENTS_DATA } from '@/data/ranges'
import { levelFromXP } from '@/lib/utils'

// ------- STORE DE USUÁRIO -------
interface UserStore {
  profile: UserProfile
  isAuthenticated: boolean
  updateStats: (updates: Partial<UserStats>) => void
  addXP: (amount: number) => void
  updateStreak: () => void
  upgradePlan: (plan: UserPlan) => void
  updateName: (name: string) => void
  setGoalTarget: (goalId: string, target: number) => void
  resetUserStats: () => void
  syncAchievements: (sessionHistory: DrillSession[], competitionHighScores?: CompetitionScore[]) => void
  addGoal: (goal: StudyGoal) => void
  removeGoal: (goalId: string) => void
}

const defaultStats: UserStats = {
  totalSessions: 0,
  totalQuestions: 0,
  totalCorrect: 0,
  accuracy: 0,
  studyTimeMinutes: 0,
  currentStreak: 0,
  maxStreak: 0,
  xp: 0,
  level: 1,
  lastStudyDate: '',
  lastStudyDates: [],
  flashcardsReviewed: 0,
  competitionBestScore: 0,
  competitionGamesPlayed: 0,
  modulesCompleted: 0,
}

const defaultGoals = [
  { id: 'g001', type: 'daily_questions' as const, target: 20, current: 0, period: 'daily' as const },
  { id: 'g002', type: 'weekly_accuracy' as const, target: 80, current: 0, period: 'weekly' as const },
]

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      isAuthenticated: true, // Mock: sempre logado por agora
      profile: {
        id: 'user_001',
        name: 'Jogador Pro',
        email: 'player@pokermind.pro',
        plan: 'free' as UserPlan,
        joinedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        stats: defaultStats,
        achievements: ACHIEVEMENTS_DATA.map(a => ({
          ...a,
          unlockedAt: a.progress >= (a.maxProgress || 1) ? Date.now() : undefined,
        })),
        goals: defaultGoals,
      },

      updateStats: (updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            stats: { ...state.profile.stats, ...updates },
          },
        })),

      addXP: (amount) =>
        set((state) => {
          const newXP = state.profile.stats.xp + Math.max(0, amount)
          // levelFromXP usa fórmula progressiva; compat. com nível ≤10 (500 XP/nível = igual ao anterior)
          const newLevel = Math.max(levelFromXP(newXP), state.profile.stats.level)
          return {
            profile: {
              ...state.profile,
              stats: { ...state.profile.stats, xp: newXP, level: newLevel },
            },
          }
        }),

      updateStreak: () =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0]
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          const lastDate = state.profile.stats.lastStudyDate

          // Já contou hoje
          if (lastDate === today) return state

          // Consecutivo (ontem) → incrementa; caso contrário → reseta para 1
          const newStreak = lastDate === yesterdayStr
            ? state.profile.stats.currentStreak + 1
            : 1
          const maxStreak = Math.max(newStreak, state.profile.stats.maxStreak)

          // Registra a data de hoje no histórico (máx 30 datas, sem duplicatas)
          const existing = state.profile.stats.lastStudyDates || []
          const lastStudyDates = [...new Set([today, ...existing])].slice(0, 30)

          return {
            profile: {
              ...state.profile,
              stats: {
                ...state.profile.stats,
                currentStreak: newStreak,
                maxStreak,
                lastStudyDate: today,
                lastStudyDates,
              },
            },
          }
        }),

      upgradePlan: (plan) =>
        set((state) => ({
          profile: { ...state.profile, plan },
        })),

      updateName: (name: string) =>
        set((state) => ({
          profile: { ...state.profile, name },
        })),

      setGoalTarget: (goalId: string, target: number) =>
        set((state) => ({
          profile: {
            ...state.profile,
            goals: state.profile.goals.map((g: any) =>
              g.id === goalId ? { ...g, target } : g
            ),
          },
        })),

      syncAchievements: (sessionHistory: DrillSession[], competitionHighScores?: CompetitionScore[]) =>
        set((state) => {
          const stats = state.profile.stats

          // Merge: garante que novos achievements de ACHIEVEMENTS_DATA apareçam
          // e que unlocks existentes sejam preservados
          const existingMap = new Map(state.profile.achievements.map(a => [a.id, a]))
          const mergedBase = ACHIEVEMENTS_DATA.map(template => {
            const ex = existingMap.get(template.id)
            return ex
              ? { ...template, unlockedAt: ex.unlockedAt, progress: ex.progress ?? 0 }
              : { ...template, progress: 0, unlockedAt: undefined as number | undefined }
          })

          // ---- Derivações a partir do histórico ----

          // Maior sequência de acertos consecutivos
          let maxConsec = 0, consec = 0
          sessionHistory.forEach(s => s.questions.forEach(q => {
            if (q.isCorrect) { consec++; if (consec > maxConsec) maxConsec = consec }
            else consec = 0
          }))

          // Questões por cenário
          const byScenario: Record<string, number> = {}
          sessionHistory.forEach(s => {
            byScenario[s.scenario] = (byScenario[s.scenario] || 0) + s.totalQuestions
          })
          const preflopTotal    = (byScenario['open_raise'] || 0)
          const threeBetTotal   = (byScenario['3bet'] || 0)
          const pushFoldTotal   = (byScenario['push_fold'] || 0)
          const bbDefenseTotal  = (byScenario['bb_defense'] || 0)
          const sbVsBbTotal     = (byScenario['sb_vs_bb'] || 0)
          const squeezeTotal    = (byScenario['squeeze'] || 0)
          const fourBetTotal    = (byScenario['4bet'] || 0)
          const callRfiTotal    = (byScenario['call_rfi'] || 0)
          const postflopTotal   = (byScenario['postflop'] || 0)

          // Maior número de questões em uma única sessão
          const maxSessionQ = sessionHistory.reduce((mx, s) => Math.max(mx, s.totalQuestions), 0)

          // Precisão geral em % (arredondada)
          const accPct = Math.round(stats.accuracy * 100)

          // Horas de estudo
          const hoursStudied = Math.floor(stats.studyTimeMinutes / 60)

          // Scores de competição
          const compScores = competitionHighScores || []
          const bestCompScore = stats.competitionBestScore || 0
          const compPlayed    = stats.competitionGamesPlayed || 0

          // XP total
          const totalXP = stats.xp

          // Nível atual
          const currentLevel = stats.level

          const achievements = mergedBase.map(ach => {
            let newProgress = ach.progress || 0
            const max = ach.maxProgress || 1

            switch (ach.id) {
              // ---- ORIGINAIS (a001-a006) — lógica preservada ----
              case 'a001': newProgress = Math.min(stats.totalSessions >= 1 ? 1 : 0, max); break
              case 'a002': newProgress = Math.min(stats.currentStreak, max); break
              case 'a003': newProgress = Math.min(maxConsec, max); break
              case 'a004': newProgress = Math.min(preflopTotal, max); break
              case 'a005': newProgress = Math.min(hoursStudied, max); break
              case 'a006': newProgress = Math.min(postflopTotal, max); break

              // ---- STREAK ----
              case 'a007': newProgress = Math.min(stats.currentStreak, max); break  // 3 dias
              case 'a008': newProgress = Math.min(stats.currentStreak, max); break  // 14 dias
              case 'a009': newProgress = Math.min(stats.currentStreak, max); break  // 30 dias
              case 'a010': newProgress = Math.min(stats.currentStreak, max); break  // 60 dias
              case 'a011': newProgress = Math.min(stats.currentStreak, max); break  // 100 dias

              // ---- PRECISÃO CONSECUTIVA ----
              case 'a012': newProgress = Math.min(maxConsec, max); break  // 20
              case 'a013': newProgress = Math.min(maxConsec, max); break  // 50
              case 'a014': newProgress = Math.min(maxConsec, max); break  // 100

              // ---- PRECISÃO GERAL ----
              case 'a015': newProgress = Math.min(accPct, max); break  // 60%
              case 'a016': newProgress = Math.min(accPct, max); break  // 70%
              case 'a017': newProgress = Math.min(accPct, max); break  // 80%
              case 'a018': newProgress = Math.min(accPct, max); break  // 85%
              case 'a019': newProgress = Math.min(accPct, max); break  // 90%

              // ---- VOLUME ----
              case 'a020': newProgress = Math.min(stats.totalQuestions, max); break  // 50
              case 'a021': newProgress = Math.min(stats.totalQuestions, max); break  // 100
              case 'a022': newProgress = Math.min(stats.totalQuestions, max); break  // 250
              case 'a023': newProgress = Math.min(stats.totalQuestions, max); break  // 500
              case 'a024': newProgress = Math.min(stats.totalQuestions, max); break  // 1000
              case 'a025': newProgress = Math.min(stats.totalQuestions, max); break  // 2500
              case 'a026': newProgress = Math.min(stats.totalQuestions, max); break  // 5000

              // ---- DOMÍNIO ----
              case 'a027': newProgress = Math.min(threeBetTotal,  max); break
              case 'a028': newProgress = Math.min(pushFoldTotal,  max); break
              case 'a029': newProgress = Math.min(bbDefenseTotal, max); break
              case 'a030': newProgress = Math.min(sbVsBbTotal,    max); break
              case 'a031': newProgress = Math.min(squeezeTotal,   max); break
              case 'a032': newProgress = Math.min(fourBetTotal,   max); break
              case 'a033': newProgress = Math.min(callRfiTotal,   max); break

              // ---- TEMPO ----
              case 'a034': newProgress = Math.min(hoursStudied, max); break  // 25h
              case 'a035': newProgress = Math.min(hoursStudied, max); break  // 50h
              case 'a036': newProgress = Math.min(hoursStudied, max); break  // 100h

              // ---- SESSÕES ----
              case 'a037': newProgress = Math.min(stats.totalSessions, max); break  // 5
              case 'a038': newProgress = Math.min(stats.totalSessions, max); break  // 25
              case 'a039': newProgress = Math.min(stats.totalSessions, max); break  // 100
              case 'a040': newProgress = Math.min(stats.totalSessions, max); break  // 250
              case 'a041': newProgress = Math.min(stats.totalSessions, max); break  // 500

              // ---- COMPETIÇÃO ----
              case 'a042': newProgress = compPlayed >= 1 || compScores.length >= 1 ? 1 : 0; break
              case 'a043': newProgress = (bestCompScore >= 50  || compScores.some(s => s.score >= 50))  ? 1 : 0; break
              case 'a044': newProgress = (bestCompScore >= 150 || compScores.some(s => s.score >= 150)) ? 1 : 0; break
              case 'a045': newProgress = (bestCompScore >= 300 || compScores.some(s => s.score >= 300)) ? 1 : 0; break
              case 'a046': newProgress = (bestCompScore >= 500 || compScores.some(s => s.score >= 500)) ? 1 : 0; break
              case 'a047': newProgress = (bestCompScore >= 700 || compScores.some(s => s.score >= 700)) ? 1 : 0; break

              // ---- CONTEÚDO (depende de rastreamento externo via updateStats) ----
              // ==== XP_HOOK: a048 — chamar syncAchievements após updateStats({ modulesCompleted: +1 }) em Study.tsx ====
              case 'a048': newProgress = (stats.modulesCompleted || 0) >= 1 ? 1 : 0; break
              // ==== XP_HOOK: a049/a050 — chamar syncAchievements após updateStats({ flashcardsReviewed: +n }) em Study.tsx ====
              case 'a049': newProgress = Math.min(stats.flashcardsReviewed || 0, max); break
              case 'a050': newProgress = Math.min(stats.flashcardsReviewed || 0, max); break

              // ---- NÍVEIS ----
              case 'a051': newProgress = Math.min(currentLevel, max); break  // nível 5
              case 'a052': newProgress = Math.min(currentLevel, max); break  // nível 10
              case 'a053': newProgress = Math.min(currentLevel, max); break  // nível 20
              case 'a054': newProgress = Math.min(currentLevel, max); break  // nível 35
              case 'a055': newProgress = Math.min(currentLevel, max); break  // nível 50

              // ---- XP ----
              case 'a056': newProgress = Math.min(totalXP, max); break   // 1000
              case 'a057': newProgress = Math.min(totalXP, max); break   // 5000
              case 'a058': newProgress = Math.min(totalXP, max); break   // 25000
              case 'a059': newProgress = Math.min(totalXP, max); break   // 100000

              // ---- ESPECIAIS ----
              case 'a060': newProgress = (stats.accuracy >= 0.95 && stats.totalQuestions >= 200) ? 1 : 0; break
              case 'a061': newProgress = Math.min(maxSessionQ, max); break  // 100 em uma sessão

              // Conquistas futuras ainda não mapeadas ficam com progresso atual
              default: return ach
            }

            const isNowComplete = newProgress >= max
            return {
              ...ach,
              progress: newProgress,
              unlockedAt: ach.unlockedAt ?? (isNowComplete ? Date.now() : undefined),
            }
          })

          return { profile: { ...state.profile, achievements } }
        }),

      addGoal: (goal: StudyGoal) =>
        set((state) => ({
          profile: {
            ...state.profile,
            goals: [...state.profile.goals, goal],
          },
        })),

      removeGoal: (goalId: string) =>
        set((state) => ({
          profile: {
            ...state.profile,
            goals: state.profile.goals.filter((g: any) => g.id !== goalId),
          },
        })),

      resetUserStats: () =>
        set((state) => ({
          profile: {
            ...state.profile,
            stats: { ...defaultStats },
            achievements: ACHIEVEMENTS_DATA.map(a => ({ ...a, progress: 0, unlockedAt: undefined })),
            goals: defaultGoals.map(g => ({ ...g, current: 0 })),
          },
        })),
    }),
    {
      name: 'pokermind-user',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ------- STORE DE TREINO -------
export interface CompetitionScore {
  score: number
  accuracy: number
  date: string
  scenario: string
  totalQuestions: number
  correctAnswers: number
}

interface TrainingStore {
  currentSession: DrillSession | null
  sessionHistory: DrillSession[]
  startSession: (mode: DrillSession['mode'], scenario: DrillSession['scenario']) => void
  answerQuestion: (result: DrillResult) => void
  endSession: () => void
  totalQuestionsToday: number
  lastResetDate: string
  resetProgress: () => void
  competitionHighScores: CompetitionScore[]
  addCompetitionScore: (entry: CompetitionScore) => void
}

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set) => ({
      currentSession: null,
      sessionHistory: [],
      totalQuestionsToday: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      competitionHighScores: [],

      startSession: (mode, scenario) => {
        const session: DrillSession = {
          id: `session_${Date.now()}`,
          startedAt: Date.now(),
          totalQuestions: 0,
          correctAnswers: 0,
          questions: [],
          mode,
          scenario,
        }
        set({ currentSession: session })
      },

      answerQuestion: (result) =>
        set((state) => {
          if (!state.currentSession) return state
          const today = new Date().toISOString().split('T')[0]
          const needsReset = state.lastResetDate !== today
          const updatedSession = {
            ...state.currentSession,
            totalQuestions: state.currentSession.totalQuestions + 1,
            correctAnswers: state.currentSession.correctAnswers + (result.isCorrect ? 1 : 0),
            questions: [...state.currentSession.questions, result],
          }
          return {
            currentSession: updatedSession,
            totalQuestionsToday: needsReset ? 1 : state.totalQuestionsToday + 1,
            lastResetDate: needsReset ? today : state.lastResetDate,
          }
        }),

      endSession: () =>
        set((state) => {
          if (!state.currentSession) return state
          const endedSession = {
            ...state.currentSession,
            endedAt: Date.now(),
          }
          return {
            currentSession: null,
            sessionHistory: [endedSession, ...state.sessionHistory].slice(0, 50),
          }
        }),

      resetProgress: () =>
        set({
          sessionHistory: [],
          currentSession: null,
          totalQuestionsToday: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        }),

      addCompetitionScore: (entry) =>
        set((state) => ({
          competitionHighScores: [entry, ...state.competitionHighScores]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10),
        })),

    }),
    {
      name: 'pokermind-training',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ------- STORE DE NAVEGAÇÃO / UI -------
export type AppTheme = 'dark' | 'light' | 'system'

interface UIStore {
  activeSection: NavSection
  isSidebarOpen: boolean
  isFullscreen: boolean
  theme: AppTheme
  animationsEnabled: boolean
  soundEnabled: boolean
  defaultDifficulty: 'easy' | 'medium' | 'hard'
  setActiveSection: (section: NavSection) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setFullscreen: (fs: boolean) => void
  setAnimations: (v: boolean) => void
  setSound: (v: boolean) => void
  setDifficulty: (v: 'easy' | 'medium' | 'hard') => void
  setTheme: (v: AppTheme) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activeSection: 'dashboard',
      isSidebarOpen: false,
      isFullscreen: false,
      theme: 'dark' as AppTheme,
      animationsEnabled: true,
      soundEnabled: false,
      defaultDifficulty: 'medium',

      setActiveSection: (section) => set({ activeSection: section }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      setFullscreen: (fs) => set({ isFullscreen: fs }),
      setAnimations: (v) => set({ animationsEnabled: v }),
      setSound: (v) => set({ soundEnabled: v }),
      setDifficulty: (v) => set({ defaultDifficulty: v }),
      setTheme: (v) => set({ theme: v }),
    }),
    {
      name: 'pokermind-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        animationsEnabled: state.animationsEnabled,
        soundEnabled: state.soundEnabled,
        defaultDifficulty: state.defaultDifficulty,
        theme: state.theme,
      }),
    }
  )
)

// ------- STORE DE SPACED REPETITION (SM-2) -------
interface SpacedRepetitionStore {
  sm2Data: Record<string, QuestionSM2Data>
  updateSM2: (questionId: string, isCorrect: boolean) => void
  getDueQuestions: () => string[]
  getQuestionStats: (questionId: string) => QuestionSM2Data | null
  resetSR: () => void
}

function todayStr() {
  // Usa data LOCAL para alinhar com a percepção do usuário (não UTC).
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(date: string, days: number): string {
  // Fix: `new Date("YYYY-MM-DD")` é interpretado como UTC midnight.
  // Em timezones negativos (ex: UTC-3 Brasil) o getDate() local retorna o dia ANTERIOR,
  // e setDate(+1) é absorvido pelo offset → addDays retorna o mesmo dia.
  // Solução: parse manual + Date.UTC para operar 100% em UTC,
  //          e o resultado é uma data calendário válida independente de timezone.
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().split('T')[0]
}

export const useSpacedRepetitionStore = create<SpacedRepetitionStore>()(
  persist(
    (set, get) => ({
      sm2Data: {},

      updateSM2: (questionId, isCorrect) =>
        set((state) => {
          const today = todayStr()
          const existing = state.sm2Data[questionId] ?? {
            questionId,
            interval: 1,
            repetitions: 0,
            easeFactor: 2.5,
            nextReview: addDays(today, 1), // padrão seguro: já agendado para amanhã
            totalAttempts: 0,
            totalCorrect: 0,
            lastSeen: today,
          }
          const quality = isCorrect ? 5 : 2
          let { interval, repetitions, easeFactor } = existing

          if (quality >= 3) {
            easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
            if (repetitions === 0) interval = 1
            else if (repetitions === 1) interval = 6
            else interval = Math.round(interval * easeFactor)
            repetitions += 1
          } else {
            repetitions = 0
            interval = 1
          }

          // Guard: nextReview SEMPRE > today (mínimo +1 dia).
          // Corrige eventuais corrupções herdadas do bug de timezone em addDays.
          let nextReview = addDays(today, interval)
          if (nextReview <= today) nextReview = addDays(today, Math.max(1, interval))
          if (nextReview <= today) {
            // Fallback final: força avanço de 1 dia via Date UTC explícito
            const [y, m, d] = today.split('-').map(Number)
            const dt = new Date(Date.UTC(y, m - 1, d))
            dt.setUTCDate(dt.getUTCDate() + 1)
            nextReview = dt.toISOString().split('T')[0]
          }

          const updated: QuestionSM2Data = {
            ...existing,
            interval,
            repetitions,
            easeFactor,
            nextReview,
            totalAttempts: existing.totalAttempts + 1,
            totalCorrect: existing.totalCorrect + (isCorrect ? 1 : 0),
            lastSeen: today,
          }
          return { sm2Data: { ...state.sm2Data, [questionId]: updated } }
        }),

      getDueQuestions: () => {
        const today = todayStr()
        return Object.values(get().sm2Data)
          .filter(q => q.nextReview <= today)
          .sort((a, b) => a.nextReview.localeCompare(b.nextReview))
          .map(q => q.questionId)
      },

      getQuestionStats: (questionId) => get().sm2Data[questionId] ?? null,

      resetSR: () => set({ sm2Data: {} }),
    }),
    {
      name: 'pokermind-sr',
      storage: createJSONStorage(() => localStorage),
      // Auto-reparo na hidratação: entradas com nextReview <= hoje (legado do bug
      // de timezone) são empurradas para amanhã pelo menos. Isso quebra loops de
      // SM-2 que existiam em versões anteriores ao fix de addDays.
      onRehydrateStorage: () => (state) => {
        if (!state || !state.sm2Data) return
        const today = todayStr()
        let fixed = 0
        const repaired: Record<string, QuestionSM2Data> = {}
        for (const [id, entry] of Object.entries(state.sm2Data)) {
          if (!entry) continue
          if (entry.nextReview <= today) {
            // Corrupto: empurra para today + max(interval, 1) dias
            const interval = Math.max(1, entry.interval || 1)
            repaired[id] = { ...entry, nextReview: addDays(today, interval) }
            fixed++
          } else {
            repaired[id] = entry
          }
        }
        if (fixed > 0) {
          state.sm2Data = repaired
          // eslint-disable-next-line no-console
          console.log(`[SM-2] Reparadas ${fixed} entradas com nextReview corrompido`)
        }
      },
    }
  )
)

// ------- STORE DE REVIEW QUEUE PÓS-FLOP -------
// Rastreia o desempenho do usuário por categoria de spot (categoria de mão +
// posição + potType + street + textura). Usado para enviesar a geração de
// novos spots no PostflopTrainer — quem erra um spot vê spots similares
// com mais frequência nas próximas mãos (sem usar SR/SM-2 tradicional).
export interface PostflopSpotProfile {
  key: string                 // hash: `${category}_${position}_${potType}_${street}_${textureClass}`
  category: string            // PostflopHandCategory (ex: 'tptk', 'middle_pair', 'draw_strong')
  position: 'IP' | 'OOP'
  potType: 'SRP' | '3bet'
  street: 'flop' | 'turn' | 'river'
  textureClass: 'dry' | 'wet' | 'paired' | 'monotone' | 'neutral'
  attempts: number
  mistakes: number
  lastMissedAt?: number       // timestamp do último erro
  lastSeenAt: number          // timestamp da última exposição
}

interface PostflopReviewStore {
  profiles: Record<string, PostflopSpotProfile>
  recordSpot: (
    key: string,
    dimensions: {
      category: string
      position: 'IP' | 'OOP'
      potType: 'SRP' | '3bet'
      street: 'flop' | 'turn' | 'river'
      textureClass: 'dry' | 'wet' | 'paired' | 'monotone' | 'neutral'
    },
    isMistake: boolean
  ) => void
  getProfile: (key: string) => PostflopSpotProfile | null
  getWeakSpots: (limit?: number) => PostflopSpotProfile[]
  resetReview: () => void
}

export const usePostflopReviewStore = create<PostflopReviewStore>()(
  persist(
    (set, get) => ({
      profiles: {},

      recordSpot: (key, dim, isMistake) =>
        set((state) => {
          const now = Date.now()
          const existing = state.profiles[key] ?? {
            key,
            ...dim,
            attempts: 0,
            mistakes: 0,
            lastSeenAt: now,
          }
          const updated: PostflopSpotProfile = {
            ...existing,
            attempts: existing.attempts + 1,
            mistakes: existing.mistakes + (isMistake ? 1 : 0),
            lastMissedAt: isMistake ? now : existing.lastMissedAt,
            lastSeenAt: now,
          }
          return { profiles: { ...state.profiles, [key]: updated } }
        }),

      getProfile: (key) => get().profiles[key] ?? null,

      getWeakSpots: (limit = 10) => {
        const all = Object.values(get().profiles)
          .filter(p => p.attempts >= 3) // só conta após 3+ exposições
          .map(p => ({ ...p, errorRate: p.mistakes / p.attempts }))
          .sort((a, b) => b.errorRate - a.errorRate)
          .slice(0, limit)
        return all
      },

      resetReview: () => set({ profiles: {} }),
    }),
    {
      name: 'pokermind-postflop-review',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// ------- STORE DE MÃOS SALVAS -------
interface HandsStore {
  savedHands: SavedHand[]
  saveHand: (hand: SavedHand) => void
  deleteHand: (id: string) => void
  updateHand: (id: string, updates: Partial<SavedHand>) => void
}

export const useHandsStore = create<HandsStore>()(
  persist(
    (set) => ({
      savedHands: [],

      saveHand: (hand) =>
        set((state) => ({ savedHands: [hand, ...state.savedHands] })),

      deleteHand: (id) =>
        set((state) => ({ savedHands: state.savedHands.filter((h) => h.id !== id) })),

      updateHand: (id, updates) =>
        set((state) => ({
          savedHands: state.savedHands.map((h) => (h.id === id ? { ...h, ...updates } : h)),
        })),
    }),
    {
      name: 'pokermind-hands',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
