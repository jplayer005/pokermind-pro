// Nota e explicacao de uma decisao push/fold (portado do treinador-poker, decision.ts).
// Os dados do solver trazem FREQUENCIAS, nao EV por acao. Por isso a nota e pela
// probabilidade de o solver tomar a acao escolhida; EV em bb fica para depois.
import type { Spot } from '../spots'
import type { Formato, SpotRef } from '../spotCatalog'
import { posDisplay } from '../spotCatalog'

export type PushFoldGrade = 'correct' | 'acceptable' | 'mistake'

export interface PushFoldEval {
  /** Frequencia do solver para a acao agressiva (all-in / call). */
  freq: number
  /** Probabilidade do solver de tomar a acao que o usuario escolheu. */
  pChosen: number
  best: 'aggressive' | 'fold'
  grade: PushFoldGrade
  /** Spot dividido: frequencia entre 5% e 95%. */
  mixed: boolean
}

export function gradePushFold(spot: Spot, hand: string, choseAggressive: boolean): PushFoldEval {
  const freq = spot.freq(hand)
  const pChosen = choseAggressive ? freq : 1 - freq
  const grade: PushFoldGrade = pChosen >= 0.5 ? 'correct' : pChosen > 0.05 ? 'acceptable' : 'mistake'
  return {
    freq,
    pChosen,
    best: freq >= 0.5 ? 'aggressive' : 'fold',
    grade,
    mixed: freq > 0.05 && freq < 0.95,
  }
}

export const rotuloAgressivo = (acao: 'push' | 'call') => (acao === 'push' ? 'ALL-IN' : 'CALL')

/** Explicacao do porque, em linhas curtas. */
export function explainPushFold(
  spot: Spot,
  ref: SpotRef,
  formato: Formato,
  stack: number,
  hand: string,
  ev: PushFoldEval,
): string[] {
  const dentro = ev.freq >= 0.5
  const pct = Math.round(ev.freq * 100)
  const linhas: string[] = []

  if (ref.acao === 'push') {
    const ctx = `na posição ${posDisplay(ref.hero)}, com ${stack}bb efetivos`
    linhas.push(dentro ? `${hand} ESTÁ no range de all-in ${ctx}.` : `${hand} está FORA do range de all-in ${ctx}.`)
    linhas.push(
      dentro
        ? 'Tem equity e fold equity suficientes: dar all-in rende mais (em EV) do que foldar.'
        : 'Não tem equity nem fold equity suficiente aqui. Stack mais fundo e mais gente atrás apertam o range de all-in.',
    )
  } else {
    const ctx = `contra o all-in do ${posDisplay(ref.shover)} (${stack}bb)`
    linhas.push(dentro ? `${hand} ESTÁ no range de call ${ctx}.` : `${hand} está FORA do range de call ${ctx}.`)
    linhas.push(
      dentro
        ? 'A equity da mão contra o range do agressor compensa pagar o all-in.'
        : 'Pagar com essa mão perde fichas no longo prazo (equity insuficiente contra o range do agressor). Melhor foldar.',
    )
  }

  if (formato.icm) {
    const cen = formato.label + (formato.premios ? ` (${formato.premios})` : '')
    linhas.push(
      ref.acao === 'call'
        ? `Sob ICM, ${cen}, o call fica mais apertado: bustar custa caro (prêmio de risco), então só se paga com mãos fortes.`
        : `Sob ICM, ${cen}, o agressor ganha fold equity, mas arrisca a vida no torneio, o que pesa nas mãos marginais.`,
    )
  }

  if (ev.mixed) {
    const acaoAg = ref.acao === 'push' ? 'all-in' : 'call'
    linhas.push(
      `Spot dividido: ${acaoAg} ${pct}%, fold ${100 - pct}% das vezes. As duas jogadas têm EV quase igual, então escolher a outra não é erro grave.`,
    )
  }

  const correta = dentro ? rotuloAgressivo(ref.acao) : 'FOLD'
  const tipo = ref.acao === 'push' ? 'all-in' : 'call'
  linhas.push(`Jogada correta: ${correta}. Neste spot o range de ${tipo} pega ${spot.pct}% das mãos.`)
  return linhas
}
