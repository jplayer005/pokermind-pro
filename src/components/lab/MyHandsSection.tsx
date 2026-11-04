// ============================================================
// "Minhas maos" na tela Jogar: botao para recriar uma mao real e a lista das ja registradas, com
// jogar, editar e apagar (o apagar pede confirmacao aqui mesmo).
// ============================================================
import { useState } from 'react'
import { History, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui'
import { useMyHandsStore } from '@/store'
import { scenarioFromRecord, validateRecord, type HandRecord } from '@/engine/lab/myHand'
import type { Scenario } from '@/engine/lab/scenarios'
import MyHandForm from './MyHandForm'

interface Props {
  /** Inicia a mesa com a mao escolhida. */
  onPlay: (sc: Scenario) => void
}

export default function MyHandsSection({ onPlay }: Props) {
  const hands = useMyHandsStore((s) => s.hands)
  const { saveHand, deleteHand } = useMyHandsStore.getState()
  const [editing, setEditing] = useState<HandRecord | 'new' | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const play = (rec: HandRecord) => {
    if (validateRecord(rec).ok) onPlay(scenarioFromRecord(rec))
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-display font-bold text-text-primary">
            <History size={15} className="text-accent-gold" /> Minhas mãos
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Registre uma mão que você jogou de verdade e jogue de novo, com o coach analisando e o vilão variando.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-accent-gold/40 bg-accent-gold/10 px-2.5 py-1.5 text-xs font-semibold text-accent-gold"
        >
          <Plus size={13} /> Recriar minha mão
        </button>
      </div>

      {hands.length > 0 && (
        <div className="grid gap-2">
          {hands.map((h) => {
            const check = validateRecord(h)
            return (
              <div key={h.id} className="rounded-xl border border-border-default bg-bg-base px-3 py-2">
                <p className="text-sm font-display font-bold text-text-primary">{h.title}</p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {h.heroPos} contra {h.villainPos}, mesa de {h.tableSize}, {h.heroStackBB} bb
                  {check.ok ? '' : ' (precisa de ajuste: abra para editar)'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!check.ok}
                    onClick={() => play(h)}
                    className="flex items-center gap-1 rounded-lg bg-accent-gold px-2.5 py-1 text-xs font-semibold text-black disabled:opacity-40"
                  >
                    <Play size={12} /> Jogar
                  </button>
                  <button type="button" onClick={() => setEditing(h)} className="flex items-center gap-1 rounded-lg border border-border-default px-2.5 py-1 text-xs text-text-primary">
                    <Pencil size={12} /> Editar
                  </button>
                  {confirmId === h.id ? (
                    <span className="ml-auto flex items-center gap-1.5 text-[11px]">
                      <span className="text-text-secondary">Apagar?</span>
                      <button type="button" onClick={() => { deleteHand(h.id); setConfirmId(null) }} className="rounded-md border border-accent-crimson/40 px-2 py-0.5 text-accent-crimson">Apagar</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="rounded-md border border-border-default px-2 py-0.5 text-text-muted">Cancelar</button>
                    </span>
                  ) : (
                    <button type="button" aria-label={`Apagar ${h.title}`} onClick={() => setConfirmId(h.id)} className="ml-auto p-1 text-text-muted hover:text-accent-crimson">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <MyHandForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(rec) => { saveHand(rec); setEditing(null) }}
          onPlay={(rec) => { saveHand(rec); setEditing(null); play(rec) }}
        />
      )}
    </Card>
  )
}
