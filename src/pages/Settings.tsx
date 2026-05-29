// ============================================================
// POKERMIND PRO — CONFIGURAÇÕES
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore, useTrainingStore, useUIStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, User, Target, Palette, Database,
  Info, ChevronRight, Check, AlertTriangle, Zap, Crown
} from 'lucide-react'

// ============================================================
// PRIMITIVOS
// ============================================================

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
        value ? 'bg-accent-gold' : 'bg-bg-elevated border border-border-default'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full shadow transition-all duration-200',
          value ? 'bg-bg-base right-0.5' : 'bg-text-muted left-0.5'
        )}
      />
    </button>
  )
}

function SettingRow({
  icon, label, sublabel, children, onClick,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  children?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-xl transition-colors',
        onClick ? 'hover:bg-white/5 active:bg-white/10 cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 text-text-muted">
        {icon}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        {sublabel && <div className="text-xs text-text-muted truncate">{sublabel}</div>}
      </div>
      {children ?? (onClick && <ChevronRight size={14} className="text-text-muted shrink-0" />)}
    </button>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl overflow-hidden border border-border-subtle mb-3">
      <div className="px-4 pt-3 pb-1">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{title}</span>
      </div>
      <div className="divide-y divide-border-subtle/50">{children}</div>
    </div>
  )
}

// ============================================================
// MODAL DE CONFIRMAÇÃO — sem AnimatePresence, CSS simples
// ============================================================

function ConfirmModal({
  title, message, confirmLabel, onConfirm, onCancel, danger = false,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm glass-strong rounded-2xl p-5 border border-border-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            danger ? 'bg-red-500/20' : 'bg-yellow-500/20'
          )}>
            <AlertTriangle size={18} className={danger ? 'text-red-400' : 'text-yellow-400'} />
          </div>
          <div className="text-sm font-bold text-text-primary">{title}</div>
        </div>
        <p className="text-sm text-text-secondary mb-5">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              danger
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PAINEL: EDITAR NOME — sem AnimatePresence
// ============================================================

function EditNamePanel({ name, onSave, onClose }: {
  name: string; onSave: (n: string) => void; onClose: () => void
}) {
  const [value, setValue] = useState(name)
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm glass-strong rounded-2xl p-5 border border-border-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-bold text-text-primary mb-3">Editar nome</div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={30}
          autoFocus
          className="w-full bg-bg-elevated border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent-gold/60 transition-colors mb-4"
          placeholder="Seu nome de jogador"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border-default text-sm text-text-secondary">
            Cancelar
          </button>
          <button
            onClick={() => { if (value.trim()) { onSave(value.trim()); onClose() } }}
            disabled={!value.trim()}
            className="flex-1 py-2.5 rounded-xl bg-accent-gold/20 text-accent-gold border border-accent-gold/30 text-sm font-semibold disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function Settings() {
  const navigate = useNavigate()
  const { profile, updateName, setGoalTarget, upgradePlan, resetUserStats } = useUserStore()
  const { resetProgress } = useTrainingStore()
  const { animationsEnabled, soundEnabled, defaultDifficulty, theme, setAnimations, setSound, setDifficulty, setTheme } = useUIStore()

  const [showEditName, setShowEditName] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [saved, setSaved] = useState(false)

  const isPremium = profile.plan !== 'free'
  const dailyGoal = profile.goals.find((g: any) => g.id === 'g001')

  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleResetProgress = () => {
    resetProgress()
    resetUserStats()
    setShowResetConfirm(false)
    flashSaved()
  }

  const handleClearAll = () => {
    localStorage.clear()
    setShowClearConfirm(false)
    window.location.reload()
  }

  return (
    <div className="page-scroll">
      <div className="p-4 max-w-2xl mx-auto pb-28">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl glass border border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Configurações</h1>
            <p className="text-xs text-text-muted">Personalize sua experiência</p>
          </div>
          {saved && (
            <div className="ml-auto flex items-center gap-1 text-emerald-400 text-xs">
              <Check size={14} /><span>Salvo</span>
            </div>
          )}
        </div>

        {/* PERFIL */}
        <SectionCard title="Perfil">
          <SettingRow
            icon={<User size={15} />}
            label="Nome de jogador"
            sublabel={profile.name}
            onClick={() => setShowEditName(true)}
          />
          <SettingRow
            icon={<Crown size={15} />}
            label="Plano atual"
            sublabel={isPremium ? 'Premium — acesso completo' : 'Free — recursos limitados'}
          >
            {isPremium ? (
              <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">Premium</span>
            ) : (
              <button
                onClick={() => { upgradePlan('premium'); flashSaved() }}
                className="text-xs font-bold text-bg-base bg-accent-gold px-3 py-1 rounded-lg"
              >
                Upgrade
              </button>
            )}
          </SettingRow>
        </SectionCard>

        {/* METAS DE ESTUDO */}
        <SectionCard title="Metas de Estudo">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center">
                  <Target size={15} className="text-text-muted" />
                </div>
                <div>
                  <div className="text-sm font-medium text-text-primary">Meta diária de questões</div>
                  <div className="text-xs text-text-muted">Questões por dia</div>
                </div>
              </div>
              <span className="text-lg font-bold font-mono text-accent-gold shrink-0 ml-3">
                {dailyGoal?.target ?? 20}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={dailyGoal?.target ?? 20}
              onChange={(e) => {
                setGoalTarget('g001', Number(e.target.value))
                flashSaved()
              }}
              className="w-full accent-yellow-400 h-1.5"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>5</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border-subtle/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center">
                <Zap size={15} className="text-text-muted" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">Dificuldade padrão</div>
                <div className="text-xs text-text-muted">Nível inicial dos drills</div>
              </div>
            </div>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => {
                const labels = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }
                const colors = {
                  easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
                }
                return (
                  <button
                    key={d}
                    onClick={() => { setDifficulty(d); flashSaved() }}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-semibold border transition-all',
                      defaultDifficulty === d ? colors[d] : 'bg-bg-elevated text-text-muted border-border-subtle'
                    )}
                  >
                    {labels[d]}
                  </button>
                )
              })}
            </div>
          </div>
        </SectionCard>

        {/* APARÊNCIA & FEEDBACK */}
        <SectionCard title="Aparência & Feedback">
          {/* Seletor de Tema */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center">
                <Palette size={15} className="text-text-muted" />
              </div>
              <div>
                <div className="text-sm font-medium text-text-primary">Tema</div>
                <div className="text-xs text-text-muted">Aparência do aplicativo</div>
              </div>
            </div>
            <div className="flex gap-2">
              {([
                { value: 'dark',   label: 'Escuro',  icon: '🌙' },
                { value: 'light',  label: 'Claro',   icon: '☀️' },
                { value: 'system', label: 'Sistema', icon: '📱' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setTheme(t.value); flashSaved() }}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                    theme === t.value
                      ? 'bg-accent-gold/20 text-accent-gold border-accent-gold/40'
                      : 'bg-bg-elevated text-text-muted border-border-subtle hover:border-border-default'
                  )}
                >
                  <span className="text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-text-muted mt-2">
              {theme === 'system'
                ? 'Segue a preferência de tema do sistema operacional.'
                : theme === 'light'
                  ? 'Interface clara, ideal para uso com muito brilho.'
                  : 'Interface escura, padrão do PokerMind Pro.'}
            </p>
          </div>

          <SettingRow
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/>
                <line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/>
                <line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/>
              </svg>
            }
            label="Animações"
            sublabel={animationsEnabled ? 'Transições ativas' : 'Modo estático'}
          >
            <Toggle value={animationsEnabled} onChange={(v) => { setAnimations(v); flashSaved() }} />
          </SettingRow>
          <SettingRow
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            }
            label="Sons de feedback"
            sublabel={soundEnabled ? 'Som ao acertar/errar' : 'Modo silencioso'}
          >
            <Toggle value={soundEnabled} onChange={(v) => { setSound(v); flashSaved() }} />
          </SettingRow>
        </SectionCard>

        {/* DADOS */}
        <SectionCard title="Dados">
          <SettingRow
            icon={<Database size={15} />}
            label="Resetar progresso de treino"
            sublabel="Apaga histórico de sessões"
            onClick={() => setShowResetConfirm(true)}
          >
            <span className="text-xs text-red-400/70 shrink-0">Resetar</span>
          </SettingRow>
          <SettingRow
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            }
            label="Limpar todos os dados"
            sublabel="Remove tudo, incluindo perfil"
            onClick={() => setShowClearConfirm(true)}
          >
            <span className="text-xs text-red-500 shrink-0 font-bold">Apagar tudo</span>
          </SettingRow>
        </SectionCard>

        {/* SOBRE */}
        <SectionCard title="Sobre">
          <SettingRow
            icon={<Info size={15} />}
            label="PokerMind Pro"
            sublabel="Versão 1.0.0"
          >
            <span className="text-[10px] text-text-muted bg-bg-elevated px-2 py-1 rounded font-mono">v1.0.0</span>
          </SettingRow>
        </SectionCard>

      </div>

      {/* MODAIS — renderizados via portais implícitos (fixed), sem AnimatePresence */}
      {showEditName && (
        <EditNamePanel
          name={profile.name}
          onSave={(n) => { updateName(n); flashSaved() }}
          onClose={() => setShowEditName(false)}
        />
      )}
      {showResetConfirm && (
        <ConfirmModal
          title="Resetar progresso?"
          message="Isso apagará todo seu histórico de sessões e estatísticas de treino. Seu perfil e preferências serão mantidos."
          confirmLabel="Resetar progresso"
          onConfirm={handleResetProgress}
          onCancel={() => setShowResetConfirm(false)}
          danger
        />
      )}
      {showClearConfirm && (
        <ConfirmModal
          title="Apagar todos os dados?"
          message="Isso remove TODOS os dados do app: perfil, histórico, preferências e conquistas. Essa ação não pode ser desfeita."
          confirmLabel="Apagar tudo"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearConfirm(false)}
          danger
        />
      )}
    </div>
  )
}
