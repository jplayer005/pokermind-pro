// Texto de uma mao salva, para copiar ou compartilhar (forum, chat, coach).
import type { Card, SavedHand } from '@/types'

const SUIT: Record<Card['suit'], string> = { spades: 's', hearts: 'h', diamonds: 'd', clubs: 'c' }
const STREET: Record<string, string> = { preflop: 'Pré-flop', flop: 'Flop', turn: 'Turn', river: 'River' }
const GRADE: Record<string, string> = {
  best: 'Melhor jogada', good: 'Boa', inaccuracy: 'Imprecisão', mistake: 'Erro', blunder: 'Erro grave',
}

const cardText = (c: Card) => `${c.rank}${SUIT[c.suit]}`
const cardsText = (cs: Card[]) => cs.map(cardText).join(' ')
const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`

export function handToText(hand: SavedHand): string {
  const out: string[] = []
  out.push(`${hand.title} (${new Date(hand.date).toLocaleDateString('pt-BR')})`)
  if (hand.mode) out.push(`Modo: ${hand.mode}`)
  out.push(`Herói: ${cardsText(hand.heroCards)}`)
  if (hand.board.length) out.push(`Board: ${cardsText(hand.board)}`)
  out.push(`Pote: ${hand.pot.toFixed(1)} bb | Resultado: ${signed(hand.result)} bb`)

  const players = hand.players.map((p) => `${p.name} (${p.position}, ${p.stack} bb)${p.cards ? ` ${cardsText(p.cards)}` : ''}`)
  if (players.length) out.push(`Jogadores: ${players.join('; ')}`)

  let street = ''
  for (const a of hand.actions) {
    if (a.street !== street) {
      street = a.street
      out.push('', STREET[street] ?? street)
    }
    out.push(`  ${a.player}: ${a.action}${a.amount ? ` ${a.amount} bb` : ''}`)
  }

  if (hand.decisions?.length) {
    out.push('', 'Avaliação do coach')
    for (const d of hand.decisions) {
      const loss = d.evLossBB != null && d.evLossBB > 0 ? `, perda de ${d.evLossBB.toFixed(1)} bb` : ''
      out.push(`  ${STREET[d.street] ?? d.street}: ${d.took} (referência: ${d.best}), ${GRADE[d.grade] ?? d.grade}${loss}${d.approx ? ' [estimativa]' : ''}`)
    }
  }
  if (hand.notes.trim()) out.push('', `Anotações: ${hand.notes.trim()}`)
  if (hand.tags.length) out.push(`Tags: ${hand.tags.map((t) => `#${t}`).join(' ')}`)
  return out.join('\n')
}
