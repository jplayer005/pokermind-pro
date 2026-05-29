import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Layers, Grid3x3, Video,
  Calculator, BookOpen, User, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store'
import { App as CapApp } from '@capacitor/app'

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Início' },
  { path: '/preflop', icon: Layers, label: 'Pré-Flop' },
  { path: '/postflop', icon: Grid3x3, label: 'Pós-Flop' },
  { path: '/calculators', icon: Calculator, label: 'Calc' },
  { path: '/study', icon: BookOpen, label: 'Estudos' },
  { path: '/profile', icon: User, label: 'Perfil' },
]

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isSidebarOpen, theme } = useUIStore()

  // Aplica o tema no elemento <html> para que os CSS custom properties funcionem
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.dataset.theme = 'system'
    } else {
      root.dataset.theme = theme
    }
  }, [theme])
  const [exitToast, setExitToast] = useState(false)
  const backPressedOnce = useRef(false)
  const backTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = CapApp.addListener('backButton', ({ canGoBack }) => {
      const isRoot = location.pathname === '/dashboard'

      if (!isRoot) {
        navigate(-1)
        return
      }

      if (backPressedOnce.current) {
        CapApp.exitApp()
        return
      }

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
    <div className="flex flex-col h-full bg-bg-base overflow-hidden">

      {/* ---- HEADER TOPO ---- */}
      <header className="glass-strong border-b border-border-subtle flex items-center justify-between px-4 py-3 flex-shrink-0 z-20"
        style={{ paddingTop: 'max(12px, var(--safe-top))' }}>
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

      {/* ---- CONTEÚDO PRINCIPAL ---- */}
      {/* AnimatePresence mode="wait" removido: com <Outlet /> ele trava pois
          o Outlet já muda para a nova rota antes da animação de saída terminar,
          causando deadlock e tela preta. Usamos apenas animação de entrada. */}
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

      {/* ---- BOTTOM NAVIGATION (mobile-first) ---- */}
      <nav className="glass-strong border-t border-border-subtle flex-shrink-0 z-20 bottom-nav-safe">
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
                  isActive
                    ? 'text-accent-gold'
                    : 'text-text-muted hover:text-text-secondary'
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

      {/* ---- TOAST: PRESSIONE NOVAMENTE PARA SAIR ---- */}
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
