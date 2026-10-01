// Anotacoes de estudo: escrever, salvar, editar e excluir (persistido no aparelho).
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, Button, SectionHeader, EmptyState } from '@/components/ui'
import { useNotesStore, type StudyNote } from '@/store'

const fmtDate = (t: number) => new Date(t).toLocaleDateString('pt-BR')

export default function NotesTab() {
  const notes = useNotesStore((s) => s.notes)
  const { addNote, updateNote, deleteNote } = useNotesStore.getState()
  const [editing, setEditing] = useState<StudyNote | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const clear = () => {
    setEditing(null)
    setTitle('')
    setBody('')
    setError(null)
  }

  const save = () => {
    if (editing) {
      if (!body.trim() && !title.trim()) { setError('Escreva algo antes de salvar.'); return }
      updateNote(editing.id, title, body)
      clear()
      return
    }
    if (addNote(title, body) === null) { setError('Escreva algo antes de salvar.'); return }
    clear()
  }

  const startEdit = (n: StudyNote) => {
    setEditing(n)
    setTitle(n.title)
    setBody(n.body)
    setError(null)
    setConfirmDelete(null)
  }

  return (
    <div className="space-y-3">
      <Card className="p-4 space-y-3">
        <SectionHeader title={editing ? 'Editar anotação' : 'Minhas Anotações'} />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          aria-label="Título da anotação"
          placeholder="Título (opcional)"
          className="w-full bg-bg-base border border-border-subtle rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder-text-muted font-body focus:border-accent-gold focus:outline-none transition-colors"
        />
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); if (error) setError(null) }}
          aria-label="Texto da anotação"
          placeholder={'Escreva suas anotações de estudo aqui...\n\nDica: anote spots difíceis, conceitos novos e insights das sessões.'}
          className="w-full bg-bg-base border border-border-subtle rounded-xl p-3 text-sm text-text-primary placeholder-text-muted font-body min-h-40 resize-none focus:border-accent-gold focus:outline-none transition-colors"
        />
        {error && <p role="alert" className="text-[11px] text-accent-crimson">{error}</p>}
        <div className="flex gap-2">
          {editing && (
            <Button variant="ghost" size="sm" className="flex-1" onClick={clear}>Cancelar</Button>
          )}
          <Button variant="secondary" size="sm" className="flex-1" onClick={save}>
            {editing ? 'Atualizar anotação' : 'Salvar anotação'}
          </Button>
        </div>
      </Card>

      <SectionHeader title="Anotações Salvas" subtitle={notes.length > 0 ? `${notes.length} no total` : undefined} />
      {notes.length === 0 ? (
        <EmptyState icon="📝" title="Nenhuma anotação ainda" description="O que você salvar aparece aqui e fica no aparelho." />
      ) : (
        notes.map((n) => (
          <Card key={n.id} className="p-3 flex items-start gap-3">
            <button onClick={() => startEdit(n)} className="flex-1 min-w-0 text-left min-h-[44px]" aria-label={`Editar anotação ${n.title}`}>
              <div className="text-xs font-display font-bold text-text-primary truncate">{n.title || 'Sem título'}</div>
              <div className="text-[11px] text-text-secondary mt-0.5 line-clamp-2 whitespace-pre-line">{n.body}</div>
              <div className="text-[10px] text-text-muted mt-1">{fmtDate(n.updatedAt)}</div>
            </button>
            {confirmDelete === n.id ? (
              <div className="flex flex-col gap-1 shrink-0">
                <Button variant="danger" size="sm" onClick={() => { deleteNote(n.id); setConfirmDelete(null); if (editing?.id === n.id) clear() }}>
                  Excluir
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Manter</Button>
              </div>
            ) : (
              <button
                aria-label={`Excluir anotação ${n.title}`}
                onClick={() => setConfirmDelete(n.id)}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-lg text-text-muted hover:text-accent-crimson"
              >
                <Trash2 size={15} />
              </button>
            )}
          </Card>
        ))
      )}
    </div>
  )
}
