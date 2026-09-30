// Altura (clientHeight) de um elemento, atualizada quando ele muda de tamanho.
// Usado para dimensionar a mesa pelo espaco que sobra entre o cabecalho e a barra de acoes.
import { useLayoutEffect, useState, type RefObject } from 'react'

export function useElementHeight(ref: RefObject<HTMLElement>): number {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setHeight(el.clientHeight)
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return height
}
