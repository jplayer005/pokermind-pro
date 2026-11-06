// ============================================================
// Formulario "Recriar minha mao": mesa, posicoes, stacks, cartas, board e as acoes ate a sua decisao.
// A mao e conferida ao vivo montando-a de verdade (as regras do jogo dizem se ela fecha); so entao
// da para salvar ou jogar. Os erros aparecem em portugues, no proprio formulario.
// ============================================================
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { POSITIONS_BY_FORMAT } from '@/data/ranges'
import { streetLabel, validateRecord, type HandRecord, type RecordStep, type RecordWho } from '@/engine/lab/myHand'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import CardPicker from './CardPicker'
import type { Position } from '@/types'

interface DraftStep {
  who: RecordWho
  type: RecordStep['type']
  bb: string
  allIn: boolean
}

interface Draft {
  title: string
  tableSize: 6 | 9
  heroPos: Position
  villainPos: Position
  heroStackBB: string
  villainStackBB: string
  anteBB: string
  heroCards: number[]
  villainCards: number[]
  board: number[]
  steps: DraftStep[]
  notes: string
}

const num = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')))

function draftOf(rec?: HandRecord): Draft {
  if (!rec) {
    return {
      title: '', tableSize: 6, heroPos: 'BTN', villainPos: 'SB', heroStackBB: '100', villainStackBB: '100', anteBB: '0',
      heroCards: [], villainCards: [], board: [], steps: [{ who: 'hero', type: 'raise', bb: '2.5', allIn: false }], notes: '',
    }
  }
  return {
    title: rec.title, tableSize: rec.tableSize, heroPos: rec.heroPos, villainPos: rec.villainPos,
    heroStackBB: String(rec.heroStackBB), villainStackBB: String(rec.villainStackBB), anteBB: String(rec.anteBB),
    heroCards: [...rec.heroCards], villainCards: rec.villainCards ? [...rec.villainCards] : [], board: [...rec.board],
    steps: rec.steps.map((s) => ({ who: s.who, type: s.type, bb: s.bb !== undefined ? String(s.bb) : '', allIn: !!s.allIn })),
    notes: rec.notes ?? '',
  }
}

/** Rascunho -> registro, ou a mensagem do que falta. */
function recordOf(d: Draft, id: string, createdAt: number): HandRecord | string {
  if (d.heroCards.length !== 2) return 'Escolha as suas duas cartas.'
  if (d.villainCards.length === 1) return 'Escolha as duas cartas do vilão ou deixe sem nenhuma.'
  const steps: RecordStep[] = []
  for (const [i, s] of d.steps.entries()) {
    if (s.type === 'raise' && !s.allIn) {
      const bb = num(s.bb)
      if (!(bb > 0)) return `Na ação ${i + 1}, informe até quantos bb vai a aposta.`
      steps.push({ who: s.who, type: 'raise', bb })
    } else {
      steps.push({ who: s.who, type: s.type, ...(s.allIn ? { allIn: true } : {}) })
    }
  }
  return {
    id, createdAt, updatedAt: Date.now(),
    title: d.title.trim() || 'Minha mão',
    tableSize: d.tableSize, heroPos: d.heroPos, villainPos: d.villainPos,
    heroStackBB: num(d.heroStackBB), villainStackBB: num(d.villainStackBB), anteBB: num(d.anteBB || '0'),
    heroCards: [d.heroCards[0], d.heroCards[1]],
    villainCards: d.villainCards.length === 2 ? [d.villainCards[0], d.villainCards[1]] : undefined,
    board: d.board, steps, notes: d.notes.trim() || undefined,
  }
}

const TYPE_LABEL: Record<RecordStep['type'], string> = { fold: 'Largar', check: 'Passar', call: 'Pagar', raise: 'Apostar/aumentar' }

const fieldCls = 'w-full rounded-lg border border-border-default bg-bg-base px-2 py-1.5 text-sm text-text-primary'

interface Props {
  initial?: HandRecord
  onSave: (rec: HandRecord) => void
  onPlay: (rec: HandRecord) => void
  onClose: () => void
}

export default function MyHandForm({ initial, onSave, onPlay, onClose }: Props) {
  const [d, setD] = useState<Draft>(() => draftOf(initial))
  useEscapeKey(onClose)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const labels = POSITIONS_BY_FORMAT[d.tableSize === 6 ? '6max' : '9max'] as Position[]

  const id = useMemo(() => initial?.id ?? `my_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, [initial])
  const built = recordOf(d, id, initial?.createdAt ?? Date.now())
  const check = typeof built === 'string' ? null : validateRecord(built)
  const error = typeof built === 'string' ? built : check && !check.ok ? check.error : null
  const ok = typeof built !== 'string' && check?.ok === true
  const streets = check?.ok ? check.stepStreets : []

  const changeSize = (n: 6 | 9) => {
    const next = POSITIONS_BY_FORMAT[n === 6 ? '6max' : '9max'] as Position[]
    setD((x) => ({
      ...x,
      tableSize: n,
      heroPos: next.includes(x.heroPos) ? x.heroPos : 'BTN',
      villainPos: next.includes(x.villainPos) ? x.villainPos : 'SB',
    }))
  }
  const setStep = (i: number, patch: Partial<DraftStep>) =>
    set('steps', d.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)))

  const allCards = [...d.heroCards, ...d.villainCards, ...d.board]
  const others = (mine: number[]) => allCards.filter((c) => !mine.includes(c))

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Recriar minha mão" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65" onClick={onClose}>
      <div
        style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border-default p-4 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* cabecalho fixo: o X continua a vista mesmo com o formulario rolado */}
        <div
          style={{ backgroundColor: 'rgb(var(--c-bg-elevated))' }}
          className="sticky top-0 z-10 -mx-4 -mt-4 flex items-start justify-between gap-2 border-b border-border-subtle px-4 pb-3 pt-4"
        >
          <div>
            <h3 className="text-sm font-display font-bold text-text-primary">{initial ? 'Editar mão' : 'Recriar minha mão'}</h3>
            <p className="mt-0.5 text-[11px] text-text-muted">
              Registre a mão como foi, até a sua decisão. Depois você joga de novo, com o coach analisando.
            </p>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="-m-2 p-3 text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <label className="block">
          <span className="text-xs text-text-muted">Nome da mão</span>
          <input className={cn(fieldCls, 'mt-1')} value={d.title} maxLength={60} placeholder="Ex.: Top par contra check-raise" onChange={(e) => set('title', e.target.value)} />
        </label>

        <div>
          <p className="text-xs text-text-muted mb-1">Mesa</p>
          <div className="flex gap-2">
            {([6, 9] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={d.tableSize === n}
                onClick={() => changeSize(n)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs', d.tableSize === n ? 'border-accent-gold/40 bg-accent-gold/15 text-accent-gold' : 'border-border-default text-text-muted')}
              >
                {n} jogadores
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-text-muted">Sua posição</span>
            <select className={cn(fieldCls, 'mt-1')} value={d.heroPos} onChange={(e) => set('heroPos', e.target.value as Position)}>
              {labels.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Posição do vilão</span>
            <select className={cn(fieldCls, 'mt-1')} value={d.villainPos} onChange={(e) => set('villainPos', e.target.value as Position)}>
              {labels.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Seu stack (bb)</span>
            <input className={cn(fieldCls, 'mt-1')} inputMode="decimal" value={d.heroStackBB} onChange={(e) => set('heroStackBB', e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted">Stack do vilão (bb)</span>
            <input className={cn(fieldCls, 'mt-1')} inputMode="decimal" value={d.villainStackBB} onChange={(e) => set('villainStackBB', e.target.value)} />
          </label>
          <label className="block col-span-2 sm:col-span-1">
            <span className="text-xs text-text-muted">Ante por jogador (bb, 0 = sem)</span>
            <input className={cn(fieldCls, 'mt-1')} inputMode="decimal" value={d.anteBB} onChange={(e) => set('anteBB', e.target.value)} />
          </label>
        </div>
        <p className="-mt-2 text-[10px] text-text-muted">Os outros jogadores entram com 100 bb e largam antes de agir.</p>

        <CardPicker label="Suas cartas" max={2} value={d.heroCards} taken={others(d.heroCards)} onChange={(c) => set('heroCards', c)} hint="Escolha duas" />
        <CardPicker label="Cartas do vilão (se ele mostrou)" max={2} value={d.villainCards} taken={others(d.villainCards)} onChange={(c) => set('villainCards', c)} hint="Não vi: serão sorteadas do range dele" />
        <CardPicker label="Board até a sua decisão (flop, turn e river)" max={5} value={d.board} taken={others(d.board)} onChange={(c) => set('board', c)} hint="Sem board: decisão no pré-flop" />

        <div>
          <p className="text-xs text-text-muted mb-1">Ações, em ordem, até a sua decisão</p>
          <div className="space-y-2">
            {d.steps.map((s, i) => (
              <div key={i} className="rounded-lg border border-border-default bg-bg-base p-2">
                <div className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-[10px] font-mono text-text-muted">{streets[i] ? streetLabel(streets[i]) : `#${i + 1}`}</span>
                  <select aria-label={`Quem age na ação ${i + 1}`} className={cn(fieldCls, 'w-24 shrink-0 py-1 text-xs')} value={s.who} onChange={(e) => setStep(i, { who: e.target.value as RecordWho })}>
                    <option value="hero">Você</option>
                    <option value="villain">Vilão</option>
                  </select>
                  <select aria-label={`Tipo da ação ${i + 1}`} className={cn(fieldCls, 'min-w-0 flex-1 py-1 text-xs')} value={s.type} onChange={(e) => setStep(i, { type: e.target.value as RecordStep['type'] })}>
                    {(Object.keys(TYPE_LABEL) as RecordStep['type'][]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                  </select>
                  <button type="button" aria-label={`Remover a ação ${i + 1}`} onClick={() => set('steps', d.steps.filter((_, j) => j !== i))} className="-m-1 shrink-0 p-2.5 text-text-muted hover:text-accent-crimson">
                    <Trash2 size={14} />
                  </button>
                </div>
                {s.type === 'raise' && (
                  <div className="mt-2 flex items-center gap-3 pl-14">
                    {!s.allIn && (
                      <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        até
                        <input aria-label={`Valor da ação ${i + 1}, em bb`} className={cn(fieldCls, 'w-20 py-1')} inputMode="decimal" value={s.bb} onChange={(e) => setStep(i, { bb: e.target.value })} />
                        bb
                      </label>
                    )}
                    <label className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      <input type="checkbox" checked={s.allIn} onChange={(e) => setStep(i, { allIn: e.target.checked })} />
                      all-in
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => set('steps', [...d.steps, { who: d.steps.length % 2 === 0 ? 'hero' : 'villain', type: 'call', bb: '', allIn: false }])}
            className="mt-2 flex items-center gap-1 text-[11px] text-accent-gold"
          >
            <Plus size={12} /> Adicionar ação
          </button>
          <p className="mt-1 text-[10px] text-text-muted">
            Aposta ou aumento: informe o total da rua em bb (ex.: abriu para 2,5; apostou 6 no flop). A rua muda sozinha quando todos igualam.
          </p>
        </div>

        <label className="block">
          <span className="text-xs text-text-muted">O que você quer observar (opcional)</span>
          <textarea className={cn(fieldCls, 'mt-1 min-h-[56px]')} maxLength={240} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Ex.: ele só costuma dar check-raise com mão feita?" />
        </label>

        <p role="status" className={cn('text-xs', ok ? 'text-accent-emerald' : 'text-accent-gold')}>
          {ok && check?.ok ? `Tudo certo: a decisão é no ${streetLabel(check.decisionStreet)}.` : error}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!ok}
            onClick={() => typeof built !== 'string' && onSave(built)}
            className="rounded-xl border border-border-default bg-bg-base py-2.5 text-sm font-semibold text-text-primary disabled:opacity-40"
          >
            Salvar
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => typeof built !== 'string' && onPlay(built)}
            className="rounded-xl bg-accent-gold py-2.5 text-sm font-semibold text-black disabled:opacity-40"
          >
            Salvar e jogar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
