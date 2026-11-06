// ============================================================
// Chave liga/desliga em linha: o estado aparece na chave (nao em "sim/nao" no texto), a linha toda e
// o alvo de toque (44 px) e o leitor de tela anuncia "ligado/desligado" (role="switch").
// ============================================================
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  hint?: string
  className?: string
}

export default function Switch({ checked, onChange, label, hint, className }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border-default bg-bg-base px-3 py-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold',
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-xs text-text-primary">{label}</span>
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-text-muted">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn('relative h-6 w-11 shrink-0 rounded-full border transition-colors', checked ? 'border-accent-gold/60 bg-accent-gold/40' : 'border-border-default bg-bg-elevated')}
      >
        <span className={cn('absolute top-0.5 h-[18px] w-[18px] rounded-full transition-all', checked ? 'left-[22px] bg-accent-gold' : 'left-0.5 bg-text-muted')} />
      </span>
    </button>
  )
}
