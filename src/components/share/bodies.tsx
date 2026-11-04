// ============================================================
// Corpos dos cartoes de compartilhar (revisao da mao, replayer, sessao, dashboard, perfil).
// Estilos inline e cores fixas (SHARE_COLORS): a imagem sai igual em qualquer tema.
// ============================================================
import { RANK_CHARS } from '@/engine/cards'
import { SHARE_COLORS, SHARE_FONT_MONO } from './ShareCard'

const SUITS = ['♠', '♥', '♦', '♣']
const RED_SUITS = new Set([1, 2])

/** Carta como indice do motor (rank * 4 + naipe) ou como objeto das maos salvas do Replayer. */
export type ShareCardValue = number | { rank: string; suit: 'spades' | 'hearts' | 'diamonds' | 'clubs' }
const SUIT_INDEX = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 } as const

/** Carta em texto colorido (o naipe vermelho segue o tema escuro do cartao). */
function CardText({ c }: { c: ShareCardValue }) {
  const rank = typeof c === 'number' ? RANK_CHARS[c >> 2] : c.rank
  const suit = typeof c === 'number' ? c & 3 : SUIT_INDEX[c.suit]
  return (
    <span style={{ fontFamily: SHARE_FONT_MONO, fontWeight: 700, color: RED_SUITS.has(suit) ? '#f87171' : SHARE_COLORS.text }}>
      {rank}{SUITS[suit]}
    </span>
  )
}

const box = { flex: 1, border: `1px solid ${SHARE_COLORS.border}`, borderRadius: 12, padding: '10px 14px' } as const

/** "Voce: Ah Kd  |  Board: 7s 8s 2c" */
function CardsLine({ hero, board }: { hero?: readonly ShareCardValue[]; board: readonly ShareCardValue[] }) {
  return (
    <div style={{ fontSize: 18, color: SHARE_COLORS.muted, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'baseline' }}>
      {hero && hero.length > 0 && (
        <>
          <span>Você</span>
          {hero.map((c, i) => <CardText key={i} c={c} />)}
        </>
      )}
      {board.length > 0 && (
        <>
          <span style={{ marginLeft: hero && hero.length > 0 ? 12 : 0 }}>Board</span>
          {board.map((c, i) => <CardText key={i} c={c} />)}
        </>
      )}
    </div>
  )
}

export interface ReviewShareDecision {
  street: string
  gradeLabel: string
  lossBB: number | null
  took: string
  best: string
}

/** Revisao de uma mao: cartas, board e cada decisao do heroi. */
export function HandReviewShareBody({ hero, board, decisions }: { hero?: readonly ShareCardValue[]; board: readonly ShareCardValue[]; decisions: ReviewShareDecision[] }) {
  return (
    <div>
      <CardsLine hero={hero} board={board} />
      <div style={{ marginTop: 16 }}>
        {decisions.map((d, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, padding: '7px 0', borderTop: i > 0 ? `1px solid ${SHARE_COLORS.border}` : 'none' }}>
            <span style={{ color: SHARE_COLORS.muted, textTransform: 'capitalize', minWidth: 64 }}>{d.street}</span>
            <span style={{ flex: 1, color: SHARE_COLORS.text }}>
              {d.gradeLabel}: {d.took}{d.took !== d.best ? ` (ref.: ${d.best})` : ''}
            </span>
            <span style={{ fontFamily: SHARE_FONT_MONO, fontWeight: 700, color: SHARE_COLORS.text }}>
              {d.lossBB !== null && d.lossBB >= 0.1 ? `-${d.lossBB.toFixed(1)} bb` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface ReplayShareAction {
  street: string
  player: string
  text: string
}

/** Mao do Replayer: cartas, resultado e as acoes por rua. */
export function ReplayShareBody({
  hero, board, resultLine, actions,
}: { hero?: readonly ShareCardValue[]; board: readonly ShareCardValue[]; resultLine: string; actions: ReplayShareAction[] }) {
  const streets = [...new Set(actions.map((a) => a.street))]
  return (
    <div>
      <CardsLine hero={hero} board={board} />
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 700 }}>{resultLine}</div>
      <div style={{ marginTop: 12 }}>
        {streets.map((s) => (
          <div key={s} style={{ padding: '6px 0', borderTop: `1px solid ${SHARE_COLORS.border}` }}>
            <div style={{ fontSize: 12, color: SHARE_COLORS.muted, textTransform: 'uppercase', letterSpacing: 1 }}>{s}</div>
            <div style={{ fontSize: 14, color: SHARE_COLORS.text, lineHeight: 1.5 }}>
              {actions.filter((a) => a.street === s).map((a) => `${a.player} ${a.text}`).join('  ·  ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface StatsShareRow {
  label: string
  value: string
}

/** Cartao generico de numeros: um destaque grande e uma lista (sessao, dashboard, perfil). */
export function StatsShareBody({
  big, bigLabel, tiles, rows,
}: { big?: string; bigLabel?: string; tiles?: StatsShareRow[]; rows?: StatsShareRow[] }) {
  return (
    <div>
      {big && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{big}</span>
          {bigLabel && <span style={{ fontSize: 16, color: SHARE_COLORS.muted }}>{bigLabel}</span>}
        </div>
      )}
      {tiles && tiles.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
          {tiles.map((t) => (
            <div key={t.label} style={box}>
              <div style={{ fontSize: 12, color: SHARE_COLORS.muted }}>{t.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: SHARE_FONT_MONO }}>{t.value}</div>
            </div>
          ))}
        </div>
      )}
      {rows && rows.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, padding: '5px 0' }}>
              <span style={{ color: SHARE_COLORS.muted }}>{r.label}</span>
              <span style={{ fontFamily: SHARE_FONT_MONO, fontWeight: 700, color: SHARE_COLORS.text }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
