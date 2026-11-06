// ============================================================
// Linha rolavel na horizontal (abas, filtros) com pista de que ha mais: degrade nas bordas que ainda
// tem conteudo escondido, e a aba ativa (aria-pressed, aria-selected ou data-active) entra na vista
// ao montar. A barra de rolagem fica oculta; o degrade e o que avisa.
// ============================================================
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  /** Classes da linha que rola. */
  className?: string
  /** Classes do envoltorio (margens). */
  outerClassName?: string
  /** Cor de origem do degrade, igual ao fundo atras da linha (ex.: "from-bg-elevated"). */
  fadeFrom?: string
}

const ACTIVE = '[aria-pressed="true"],[aria-selected="true"],[data-active="true"]'

export default function ScrollRow({ children, className, outerClassName, fadeFrom = 'from-bg-base' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
    el.querySelector<HTMLElement>(ACTIVE)?.scrollIntoView({ inline: 'center', block: 'nearest' })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    ro?.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [])

  return (
    <div className={cn('relative', outerClassName)}>
      <div ref={ref} className={cn('flex overflow-x-auto hide-scrollbar', className)}>{children}</div>
      {edges.left && <span aria-hidden="true" className={cn('pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent', fadeFrom)} />}
      {edges.right && <span aria-hidden="true" className={cn('pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent', fadeFrom)} />}
    </div>
  )
}
