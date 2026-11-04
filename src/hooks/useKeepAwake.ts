import { useEffect } from 'react'
import { createKeepAwake } from '@/lib/keepAwake'

/** Mantem a tela do aparelho ligada enquanto `active` for verdadeiro e o componente estiver montado. */
export function useKeepAwake(active: boolean) {
  useEffect(() => {
    if (!active) return
    const k = createKeepAwake()
    k.start()
    return () => k.stop()
  }, [active])
}
