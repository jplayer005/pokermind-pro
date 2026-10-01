// Liga o toggle "Animacoes" (e a preferencia de movimento reduzido do sistema) ao framer-motion e ao CSS.
import { useEffect, type ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { useUIStore } from '@/store'

export default function MotionRoot({ children }: { children: ReactNode }) {
  const animationsEnabled = useUIStore((s) => s.animationsEnabled)

  useEffect(() => {
    document.documentElement.dataset.motion = animationsEnabled ? 'on' : 'off'
  }, [animationsEnabled])

  // 'user' respeita prefers-reduced-motion; 'always' desliga transformacoes e layout animados
  return <MotionConfig reducedMotion={animationsEnabled ? 'user' : 'always'}>{children}</MotionConfig>
}
