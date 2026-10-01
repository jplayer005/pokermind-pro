// Guarda do botao Voltar do Android: uma tela pode "segurar" o Voltar (ex.: mesa com torneio em
// andamento) para confirmar antes de sair. O AppLayout pergunta aqui antes de navegar.
type Guard = () => boolean

let guard: Guard | null = null

/** Registra a guarda; devolve a funcao que a remove. A guarda devolve true quando TRATOU o Voltar. */
export function setBackGuard(fn: Guard | null): () => void {
  guard = fn
  return () => {
    if (guard === fn) guard = null
  }
}

/** true = a tela atual tratou o Voltar (nao navegar). */
export function backHandledByScreen(): boolean {
  return guard ? guard() : false
}
