import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, LogIn, UserX } from 'lucide-react'
import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { signInWithGoogle } from '@/firebase/auth'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const { setGuestMode } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Back button no Android: sai do app na tela de login
  // Delay de 600ms para não capturar eventos do transition anterior (ex: signout)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let listenerHandle: Awaited<ReturnType<typeof CapApp.addListener>> | null = null
    const timeout = setTimeout(async () => {
      listenerHandle = await CapApp.addListener('backButton', () => {
        CapApp.exitApp()
      })
    }, 600)
    return () => {
      clearTimeout(timeout)
      listenerHandle?.remove()
    }
  }, [])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      // onAuthStateChanged no AuthGate cuida do restante
    } catch (e: unknown) {
      console.error('[login] signInWithGoogle error', e)
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('popup-closed') || msg.includes('cancelled')) {
        setError(null) // usuário fechou o popup intencionalmente
      } else {
        setError('Erro ao entrar com Google. Tente novamente.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-5"
      style={{ paddingTop: 'max(40px, var(--safe-top))', paddingBottom: 'max(40px, var(--safe-bottom))' }}>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center gap-4 mb-10"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent-gold to-yellow-600 flex items-center justify-center shadow-2xl shadow-yellow-900/40">
          <Zap size={38} className="text-bg-base" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <div className="font-display font-bold text-4xl text-text-primary tracking-tight leading-none">
            Poker<span className="text-gradient-gold">Mind</span>
          </div>
          <div className="text-sm text-text-muted font-mono mt-2 tracking-widest uppercase opacity-60">
            Pro Training
          </div>
        </div>
        <p className="text-text-muted text-sm text-center max-w-xs leading-relaxed mt-1">
          Treine GTO poker com inteligência adaptativa e acompanhe sua evolução.
        </p>
      </motion.div>

      {/* Card de login */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        <div className="glass rounded-2xl p-6 border border-border-subtle space-y-4">

          {/* Botão Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-accent-gold hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed text-bg-base font-semibold rounded-xl py-3.5 transition-all duration-200 active:scale-95 shadow-lg shadow-yellow-900/25"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-bg-base border-t-transparent rounded-full"
              />
            ) : (
              <GoogleIcon />
            )}
            <span className="text-sm">
              {loading ? 'Entrando...' : 'Entrar com Google'}
            </span>
          </button>

          {/* Erro */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-400 text-center px-2"
            >
              {error}
            </motion.p>
          )}

          {/* Divisor */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-text-muted">ou</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Guest mode */}
          <button
            onClick={() => setGuestMode(true)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary disabled:opacity-60 border border-border-subtle hover:border-border-default rounded-xl py-3 transition-all duration-200 active:scale-95 text-sm font-medium"
          >
            <UserX size={16} />
            Continuar sem login
          </button>

          <p className="text-[11px] text-text-muted text-center leading-relaxed px-2">
            Sem conta: dados ficam salvos apenas neste dispositivo.{'\n'}
            Com Google: progresso sincronizado na nuvem.
          </p>
        </div>

        {/* Nota de privacidade */}
        <p className="text-[11px] text-text-muted text-center mt-4 leading-relaxed">
          Usamos apenas nome e e-mail do Google.{'\n'}
          Seus dados de treino ficam na sua conta.
        </p>
      </motion.div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4069 3.78409 7.83 3.96409 7.29V4.9582H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.8918 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9582L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z" fill="#EA4335"/>
    </svg>
  )
}
