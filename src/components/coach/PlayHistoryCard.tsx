// Resumo da mesa no Dashboard: totais (cash em bb, torneios, ITM, ROI, precisao) e as ultimas sessoes.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, SectionHeader } from '@/components/ui'
import { usePlayStore } from '@/store'
import { summarizeSessions, type PlaySession } from '@/engine/progress'

const signed = (n: number, d = 1) => `${n >= 0 ? '+' : ''}${n.toFixed(d)}`
const dateText = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

function sessionLine(s: PlaySession): { right: string; tone: 'emerald' | 'crimson' | 'neutral' } {
  if (s.place !== undefined) {
    const paid = (s.prizeBuyIns ?? 0) > 0
    return { right: `${s.place}º de ${s.field}${paid ? `, +${(s.prizeBuyIns as number).toFixed(1)} buy-ins` : ''}`, tone: paid ? 'emerald' : 'neutral' }
  }
  if (s.netBB !== undefined) return { right: `${signed(s.netBB)} bb`, tone: s.netBB >= 0 ? 'emerald' : 'crimson' }
  return { right: 'abandonado', tone: 'neutral' }
}

export default function PlayHistoryCard() {
  const navigate = useNavigate()
  const sessions = usePlayStore((s) => s.sessions)
  const sum = useMemo(() => summarizeSessions(sessions), [sessions])

  return (
    <div>
      <SectionHeader
        title="Sua mesa"
        subtitle={sessions.length > 0 ? `${sum.sessions} ${sum.sessions === 1 ? "sessão" : "sessões"}, ${sum.hands} ${sum.hands === 1 ? "mão" : "mãos"}` : 'Seus resultados na mesa aparecem aqui'}
      />
      {sessions.length === 0 ? (
        <Card className="p-4 text-center space-y-2">
          <p className="text-xs text-text-secondary">
            Cada sessão encerrada guarda o resultado: saldo em bb no cash, colocação e ROI nos torneios.
          </p>
          <Button size="sm" onClick={() => navigate('/play')}>Ir para a mesa</Button>
        </Card>
      ) : (
        <Card className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-text-muted">Cash</p>
              <p className={`text-sm font-mono font-bold ${sum.cashNetBB >= 0 ? 'text-accent-emerald' : 'text-accent-crimson'}`}>
                {sum.cashSessions > 0 ? `${signed(sum.cashNetBB)} bb` : '-'}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Torneios</p>
              <p className="text-sm font-mono font-bold text-text-primary">
                {sum.tournaments > 0 ? `${sum.itm}/${sum.tournaments} ITM` : '-'}
              </p>
              {sum.roi !== null && (
                <p className={`text-[10px] font-mono ${sum.roi >= 0 ? 'text-accent-emerald' : 'text-accent-crimson'}`}>
                  ROI {signed(sum.roi * 100, 0)}%
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Acerto do coach</p>
              <p className="text-sm font-mono font-bold text-accent-gold">
                {sum.accuracy !== null ? `${Math.round(sum.accuracy * 100)}%` : '-'}
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {sessions.slice(0, 3).map((s) => {
              const l = sessionLine(s)
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-text-secondary truncate">{dateText(s.endedAt)}, {s.label}, {s.hands} {s.hands === 1 ? "mão" : "mãos"}</span>
                  <Badge variant={l.tone}>{l.right}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
