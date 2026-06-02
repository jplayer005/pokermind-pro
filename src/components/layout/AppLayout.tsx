import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Layers, Grid3x3, Video,
  Calculator, BookOpen, User, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'
import { App as CapApp } from '@capacitor/app'
import { useSyncTrigger } from '@/hooks/useSyncTrigger'

const NAV_ITEMS = [
  { path: '/dashboard',   icon: LayoutDashboard, label: 'Início',       desc: 'Dashboard e métricas' },
  { path: '/preflop',     icon: Layers,          label: 'Pré-Flop',     desc: 'Ranges e posições GTO' },
  { path: '/postflop',    icon: Grid3x3,         label: 'Pós-Flop',     desc: 'Board, mão e decisões' },
  { path: '/calculators', icon: Calculator,      label: 'Calculadoras', desc: 'EV, ICM e pot odds' },
  { path: '/study',       icon: BookOpen,        label: 'Estudos',      desc: 'Cursos e flashcards' },
  { path: '/profile',     icon: User,            label: 'Perfil',       desc: 'Stats e conquistas' },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useUIStore()
  useSyncTrigger()

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme === 'system' ? 'system' : theme
  }, [theme])

  const [exitToast, setExitToast] = useState(false)
  const backPressedOnce = useRef(false)
  const backTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = CapApp.addListener('backButton', () => {
      const isRoot = location.pathname === '/dashboard'
      if (!isRoot) { navigate(-1); return }
      if (backPressedOnce.current) { CapApp.exitApp(); return }
      backPressedOnce.current = true
      setExitToast(true)
      backTimer.current = setTimeout(() => {
        backPressedOnce.current = false
        setExitToast(false)
      }, 2000)
    })
    return () => {
      handler.then((h) => h.remove())
      if (backTimer.current) clearTimeout(backTimer.current)
    }
  }, [location.pathname, navigate])

  return (
    <div className="flex h-full bg-bg-base overflow-hidden">

      {/* ===== SIDEBAR DESKTOP (lg+) ===== */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 glass-strong border-r border-border-subtle shrink-0 z-20">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-gold to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-900/30">
              <Zap size={17} className="text-bg-base" />
            </div>
            <div>
              <div className="font-display font-bold text-[17px] text-text-primary tracking-tight leading-none">
                Poker<span className="text-gradient-gold">Mind</span>
              </div>
              <div className="text-[9px] text-text-muted font-mono mt-1 tracking-widest uppercase opacity-60">
                Pro Training
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label, desc }) => {
            const isActive = location.pathname === path ||
              (path !== '/dashboard' && location.pathname.startsWith(path))
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  'relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left',
                  isActive
                    ? 'text-accent-gold'
                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-accent-gold/10 border border-accent-gold/20"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className="relative z-10 shrink-0" />
                <div className="relative z-10 text-left">
                  <div className={cn('text-sm font-body font-semibold leading-none', isActive ? 'text-accent-gold' : '')}>
                    {label}
                  </div>
                  <div className="text-[10px] text-text-muted leading-none mt-0.5">{desc}</div>
                </div>
              </button>
            )
          })}
        </nav>

        {/* Footer — plan badge */}
        <div className="px-4 py-4 border-t border-border-subtle">
          <div className="bg-gradient-to-br from-accent-gold/8 to-transparent rounded-xl p-3 border border-accent-gold/15">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[11px] font-semibold text-text-secondary">Plano Gratuito</span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Upgrade para PRO: análises ilimitadas e todos os recursos avançados.
            </p>
          </div>
        </div>
      </aside>

      {/* ===== COLUNA PRINCIPAL ===== */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header — mobile only */}
        <header
          className="lg:hidden glass-strong border-b border-border-subtle flex items-center justify-between px-4 py-3 flex-shrink-0 z-20"
          style={{ paddingTop: 'max(12px, var(--safe-top))' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-gold to-yellow-600 flex items-center justify-center">
              <Zap size={14} className="text-bg-base" />
            </div>
            <span className="font-display font-bold text-base text-text-primary tracking-tight">
              Poker<span className="text-gradient-gold">Mind</span>
            </span>
            <span className="text-[10px] text-text-muted font-mono bg-bg-elevated px-1.5 py-0.5 rounded ml-1">PRO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-bg-elevated rounded-full px-3 py-1.5 border border-border-subtle">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              <span className="text-[11px] text-text-secondary font-body">Livre</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden relative">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>

        {/* Bottom Nav — mobile only */}
        <nav className="lg:hidden glass-strong border-t border-border-subtle flex-shrink-0 z-20 bottom-nav-safe">
          <div className="flex items-center justify-around px-1 pt-2 pb-1">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path ||
                (path !== '/dashboard' && location.pathname.startsWith(path))
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-0 flex-1',
                    'active:scale-95',
                    isActive ? 'text-accent-gold' : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  <div className={cn(
                    'relative p-1.5 rounded-lg transition-all duration-200',
                    isActive && 'bg-accent-gold/10'
                  )}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                    {isActive && (
                      <motion.div
                        layoutId="nav-indicator"
                        className="absolute inset-0 rounded-lg bg-accent-gold/10"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-body font-medium truncate',
                    isActive ? 'text-accent-gold' : 'text-text-muted'
                  )}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

      </div>

      {/* Toast: pressione novamente para sair */}
      <AnimatePresence>
        {exitToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-bg-elevated border border-border-default rounded-full px-5 py-2.5 shadow-xl"
          >
            <span className="text-sm text-text-primary whitespace-nowrap">
              Pressione novamente para sair
            </span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
