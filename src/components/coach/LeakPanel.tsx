// ============================================================
// Painel de vazamentos: os pontos onde o coach mais marcou erro, com tendencia,
// perda estimada, revisao do dia e botao para treinar exatamente aquele contexto.
// ============================================================
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { useLeakStore } from '@/store'
import {
  dateStr, dueLeaks, drillTarget, labelFor, leakRate, rankLeaks, trend, type LeakStat,
} from '@/engine/coach/leaks'

function Trend({ s }: { s: LeakStat }) {
  const t = trend(s)
  if (t === null) return null
  if (t === 'down') return <span className="flex items-center gap-0.5 text-[10px] text-accent-emerald"><ArrowDownRight size={11} />melhorando</span>
  if (t === 'up') return <span className="flex items-center gap-0.5 text-[10px] text-accent-crimson"><ArrowUpRight size={11} />piorando</span>
  return <span className="flex items-center gap-0.5 text-[10px] text-text-muted"><Minus size={11} />estável</span>
}

export default function LeakPanel() {
  const navigate = useNavigate()
  const stats = useLeakStore((s) => s.stats)
  const decisions = useLeakStore((s) => s.decisions)
  const ranked = useMemo(() => rankLeaks(stats).slice(0, 5), [stats])
  const today = dateStr(new Date())
  const due = useMemo(() => new Set(dueLeaks(stats, today).map((s) => s.ctx)), [stats, today])

  return (
    <div>
      <SectionHeader
        title="Seus vazamentos"
        subtitle={decisions > 0 ? `${decisions} decisões avaliadas pelo coach` : 'O coach aponta onde você mais perde'}
        action={due.size > 0 ? <Badge variant="gold">{due.size} para revisar hoje</Badge> : undefined}
      />

      {ranked.length === 0 ? (
        <Card className="p-4 text-center space-y-2">
          <p className="text-xs text-text-secondary">
            {decisions === 0
              ? 'Jogue mãos na mesa com o coach ligado. Os pontos fracos aparecem aqui assim que houver amostra suficiente.'
              : 'Ainda há poucos dados por situação para apontar um vazamento com segurança. Continue jogando.'}
          </p>
          <Button size="sm" onClick={() => navigate('/play')}>Ir para a mesa</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {ranked.map((s) => {
            const target = drillTarget(s.ctx)
            const pct = Math.round(leakRate(s) * 100)
            return (
              <Card key={s.ctx} className="p-3 flex items-center gap-3">
                <div
                  className={
                    'w-10 h-10 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ' +
                    (pct >= 50 ? 'bg-accent-crimson/15 text-accent-crimson' : 'bg-accent-gold/15 text-accent-gold')
                  }
                >
                  {pct}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-display font-bold text-text-primary truncate">{labelFor(s.ctx)}</p>
                  <p className="text-[11px] text-text-muted">
                    {s.leaks} de {s.n} decisões com erro
                    {s.evLossBB > 0 ? `, cerca de -${s.evLossBB.toFixed(1)} bb` : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Trend s={s} />
                    {due.has(s.ctx) && <span className="text-[10px] text-accent-gold">revisar hoje</span>}
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate(target.path, target.state ? { state: target.state } : undefined)}>
                  Treinar
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
