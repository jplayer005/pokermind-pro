// Rede de seguranca: um erro de render numa tela nao derruba o app inteiro.
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[app] erro de render', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="min-h-[100dvh] bg-bg-base flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-display font-bold text-text-primary">Algo deu errado nesta tela</p>
        <p className="text-xs text-text-muted max-w-xs">
          Seus dados continuam salvos. Volte ao início; se acontecer de novo, feche e abra o app.
        </p>
        <button
          onClick={() => {
            window.location.hash = '#/dashboard'
            window.location.reload()
          }}
          className="px-5 py-3 rounded-xl bg-accent-gold text-bg-base text-sm font-semibold"
        >
          Voltar ao início
        </button>
      </div>
    )
  }
}
