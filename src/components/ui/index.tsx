// ============================================================
// POKERMIND PRO — COMPONENTES UI PRIMITIVOS
// Blocos de construção reutilizáveis da interface
// ============================================================

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ReactNode, ButtonHTMLAttributes } from 'react'

// ------- BUTTON -------
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-xl transition-all duration-200 active:scale-95 select-none'

  const variants = {
    primary: 'bg-accent-gold text-bg-base hover:bg-yellow-400 shadow-glow-gold',
    secondary: 'bg-bg-elevated border border-border-default text-text-primary hover:border-border-strong hover:bg-bg-overlay',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
    danger: 'bg-accent-crimson/10 border border-accent-crimson/30 text-accent-crimson hover:bg-accent-crimson/20',
    gold: 'bg-gradient-to-r from-accent-gold to-yellow-500 text-bg-base font-semibold shadow-glow-gold',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], disabled && 'opacity-50 cursor-not-allowed', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// ------- CARD -------
interface CardProps {
  children: ReactNode
  className?: string
  glow?: 'gold' | 'emerald' | 'crimson' | 'blue' | 'none'
  hoverable?: boolean
  onClick?: () => void
}

export function Card({ children, className, glow = 'none', hoverable, onClick }: CardProps) {
  const glows = {
    gold: 'hover:shadow-glow-gold hover:border-accent-gold/30',
    emerald: 'hover:shadow-glow-emerald hover:border-accent-emerald/30',
    crimson: 'hover:shadow-glow-crimson hover:border-accent-crimson/30',
    blue: 'hover:shadow-glow-blue hover:border-accent-blue/30',
    none: '',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        // Borda 60% opacity = look mais suave (igual ao das conquistas bloqueadas)
        // Shadow sutil reforça "elevação" sem precisar de borda forte
        'bg-bg-elevated border border-border-subtle/60 rounded-xl2 transition-all duration-200',
        'shadow-[0_2px_8px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.03)]',
        hoverable && 'cursor-pointer active:scale-[0.99]',
        glow !== 'none' && glows[glow],
        className
      )}
    >
      {children}
    </div>
  )
}

// ------- BADGE -------
interface BadgeProps {
  children: ReactNode
  variant?: 'gold' | 'emerald' | 'crimson' | 'blue' | 'purple' | 'neutral'
  size?: 'sm' | 'md'
}

export function Badge({ children, variant = 'neutral', size = 'sm' }: BadgeProps) {
  const variants = {
    gold: 'bg-accent-gold/15 text-accent-gold border-accent-gold/30',
    emerald: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
    crimson: 'bg-accent-crimson/15 text-accent-crimson border-accent-crimson/30',
    blue: 'bg-accent-blue/15 text-accent-blue border-accent-blue/30',
    purple: 'bg-accent-purple/15 text-accent-purple border-accent-purple/30',
    neutral: 'bg-bg-overlay text-text-secondary border-border-subtle',
  }

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }

  return (
    <span className={cn(
      'inline-flex items-center font-mono font-bold rounded-full border',
      variants[variant],
      sizes[size]
    )}>
      {children}
    </span>
  )
}

// ------- PROGRESS BAR -------
interface ProgressProps {
  value: number  // 0-100
  color?: 'gold' | 'emerald' | 'crimson' | 'blue'
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  animated?: boolean
}

export function ProgressBar({
  value,
  color = 'gold',
  size = 'sm',
  showLabel,
  animated = true,
}: ProgressProps) {
  const colors = {
    gold: 'bg-gradient-to-r from-accent-gold to-yellow-500',
    emerald: 'bg-gradient-to-r from-accent-emerald to-green-400',
    crimson: 'bg-gradient-to-r from-accent-crimson to-red-400',
    blue: 'bg-gradient-to-r from-accent-blue to-blue-400',
  }

  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' }

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={cn('flex-1 bg-bg-overlay rounded-full overflow-hidden progress-bar', heights[size])}>
        <motion.div
          className={cn('h-full rounded-full', colors[color])}
          initial={animated ? { width: 0 } : { width: `${value}%` }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-mono text-text-secondary w-8 text-right flex-shrink-0">
          {value}%
        </span>
      )}
    </div>
  )
}

// ------- STAT CARD -------
interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: 'gold' | 'emerald' | 'crimson' | 'blue'
}

export function StatCard({
  label, value, subtext, icon, trend, trendValue, color = 'gold'
}: StatCardProps) {
  const colors = {
    gold: 'text-accent-gold',
    emerald: 'text-accent-emerald',
    crimson: 'text-accent-crimson',
    blue: 'text-accent-blue',
  }

  const iconBg = {
    gold: 'bg-accent-gold/10',
    emerald: 'bg-accent-emerald/10',
    crimson: 'bg-accent-crimson/10',
    blue: 'bg-accent-blue/10',
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-body text-text-muted uppercase tracking-wider">{label}</span>
        {icon && (
          <div className={cn('p-1.5 rounded-lg', iconBg[color])}>
            <div className={cn('w-4 h-4', colors[color])}>{icon}</div>
          </div>
        )}
      </div>
      <div className={cn('text-2xl font-display font-bold', colors[color])}>
        {value}
      </div>
      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {subtext && <span className="text-[11px] text-text-muted">{subtext}</span>}
          {trend && trendValue && (
            <span className={cn(
              'text-[10px] font-mono',
              trend === 'up' ? 'text-accent-emerald' : trend === 'down' ? 'text-accent-crimson' : 'text-text-muted'
            )}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

// ------- SECTION HEADER -------
export function SectionHeader({
  title, subtitle, action
}: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-display font-bold text-text-primary">{title}</h2>
        {subtitle && <p className="text-xs text-text-muted mt-0.5 font-body">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ------- EMPTY STATE -------
export function EmptyState({ icon, title, description }: {
  icon: string
  title: string
  description?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-sm font-display font-semibold text-text-secondary mb-1">{title}</h3>
      {description && <p className="text-xs text-text-muted max-w-xs">{description}</p>}
    </div>
  )
}

// ------- DIVIDER -------
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-border-subtle my-4" />
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border-subtle" />
      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border-subtle" />
    </div>
  )
}

// ------- PREMIUM LOCK -------
export function PremiumLock({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="opacity-30 pointer-events-none select-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-base/70 backdrop-blur-sm rounded-xl">
        <div className="text-2xl mb-2">🔒</div>
        <div className="text-xs font-display font-bold text-accent-gold">Premium</div>
        <div className="text-[10px] text-text-muted mt-1">Assine para desbloquear</div>
      </div>
    </div>
  )
}
