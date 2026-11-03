// ============================================================
// Molde do cartao de compartilhar: titulo, subtitulo, conteudo e a marca, em largura fixa.
// Usa cores e fontes FIXAS (nao as variaveis do tema) para a imagem sair igual em qualquer tema,
// aparelho e plataforma. Fica fora da tela e so existe enquanto a imagem e gerada.
// ============================================================
import { forwardRef, type ReactNode } from 'react'

export const SHARE_COLORS = {
  bg: '#0b0d16',
  border: '#232a3d',
  text: '#e8ecf5',
  muted: '#aab3c7',
  faint: '#6f7a94',
  gold: '#f5c842',
  green: '#00c47a',
  red: '#ff3d5a',
} as const

export const SHARE_FONT_SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const SHARE_FONT_MONO = "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace"

interface Props {
  title: string
  subtitle?: string
  width?: number
  children: ReactNode
}

const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ title, subtitle, width = 720, children }, ref) {
  return (
    <div
      ref={ref}
      style={{
        width, boxSizing: 'border-box', padding: 28, background: SHARE_COLORS.bg, color: SHARE_COLORS.text,
        border: `1px solid ${SHARE_COLORS.border}`, borderRadius: 20, fontFamily: SHARE_FONT_SANS,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: SHARE_COLORS.gold }}>PokerMind Pro</div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 14, color: SHARE_COLORS.muted, marginTop: 6 }}>{subtitle}</div>}
      <div style={{ marginTop: 20 }}>{children}</div>
      <div
        style={{
          marginTop: 22, paddingTop: 12, borderTop: `1px solid ${SHARE_COLORS.border}`,
          display: 'flex', justifyContent: 'space-between', fontSize: 12, color: SHARE_COLORS.faint,
        }}
      >
        <span>Treino de poker</span>
        <span>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  )
})

export default ShareCard
