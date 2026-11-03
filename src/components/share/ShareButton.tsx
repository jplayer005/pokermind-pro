// ============================================================
// Botao de compartilhar imagem. Monta o cartao (children) fora da tela, transforma em PNG e
// entrega ao Android (menu nativo) ou ao navegador (compartilhar do sistema, ou baixar + copiar).
// Uso: <ShareButton title="..." subtitle="..."><ConteudoDoCartao /></ShareButton>
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Share2 } from 'lucide-react'
import { toBlob } from 'html-to-image'
import { cn } from '@/lib/utils'
import { fileNameFor, shareImage } from '@/lib/share'
import ShareCard, { SHARE_COLORS } from './ShareCard'

interface Props {
  /** Titulo do cartao e base do nome do arquivo. */
  title: string
  subtitle?: string
  /** Texto que acompanha a imagem no compartilhamento. */
  text?: string
  /** Conteudo do cartao (a imagem e feita a partir dele, nao da tela). */
  children: ReactNode
  width?: number
  /** Botao so com o icone (cabecalhos apertados) ou com o rotulo. */
  iconOnly?: boolean
  label?: string
  className?: string
}

const frames = (n: number) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)))
    step(n)
  })

export default function ShareButton({
  title, subtitle, text, children, width = 720, iconOnly = false, label = 'Compartilhar', className,
}: Props) {
  const [capturing, setCapturing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timer.current), [])

  const flash = (m: string) => {
    if (!m) return
    setMsg(m)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMsg(null), 3000)
  }

  const onClick = async () => {
    if (busy.current) return
    busy.current = true
    setCapturing(true)
    setMsg(null)
    try {
      // espera o cartao entrar no DOM e pintar antes de capturar
      await frames(2)
      const node = cardRef.current
      if (!node) throw new Error('cartao nao montado')
      // skipFonts: o cartao usa fontes do sistema; buscar fontes da rede deixaria a captura lenta e instavel offline
      const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: SHARE_COLORS.bg, skipFonts: true })
      if (!blob) throw new Error('imagem vazia')
      const r = await shareImage(blob, { title, text: text ?? title, filename: fileNameFor(title) })
      flash(r.message)
    } catch {
      flash('Não foi possível gerar a imagem.')
    } finally {
      setCapturing(false)
      busy.current = false
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={capturing}
        aria-label={iconOnly ? `${label}: ${title}` : undefined}
        className={cn(
          'relative inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-default text-text-secondary transition-colors',
          'hover:border-accent-gold/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold disabled:opacity-60',
          iconOnly
            ? "h-8 w-8 before:absolute before:-inset-1.5 before:content-['']"
            : 'h-9 px-3 text-xs font-body font-medium',
          className,
        )}
      >
        {capturing
          ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden />
          : <Share2 size={14} aria-hidden />}
        {!iconOnly && <span>{capturing ? 'Gerando imagem' : label}</span>}
      </button>

      {/* aviso fixo: nao muda o layout de quem usa o botao */}
      {msg && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-xl border border-border-default bg-bg-elevated px-3 py-2 text-xs text-text-primary shadow-lg"
        >
          {msg}
        </div>
      )}

      {/* o cartao so existe durante a captura e fica fora da tela */}
      {capturing &&
        createPortal(
          <div aria-hidden style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}>
            <ShareCard ref={cardRef} title={title} subtitle={subtitle} width={width}>
              {children}
            </ShareCard>
          </div>,
          document.body,
        )}
    </>
  )
}
