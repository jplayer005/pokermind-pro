// ============================================================
// Tela com barra de acao fixa: o conteudo ocupa o espaco que sobra (e rola por dentro se
// precisar) e a barra fica SEMPRE na mesma posicao, colada acima do menu inferior.
// (Um `sticky` nao serve: com conteudo curto a barra flutua logo depois dele.)
// ============================================================
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  bar: ReactNode
}

export default function BottomBarScreen({ children, bar }: Props) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="p-4 max-w-2xl mx-auto space-y-4">{children}</div>
      </div>
      <div className="shrink-0 border-t border-border-subtle" style={{ backgroundColor: 'rgb(var(--c-bg-base))' }}>
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-3">{bar}</div>
      </div>
    </div>
  )
}
