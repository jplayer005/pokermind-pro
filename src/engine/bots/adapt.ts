// ============================================================
// ENGINE: adaptacao dos bots. Um bot "profissional" (ou "regular") ajusta o proprio estilo ao que
// viu do heroi (HUD acumulado) e a situacao da mesa (stack curto, chip leader, fundo), como um
// jogador de verdade que sabe quando mudar de marcha. Bots recreativos (adapt = 0) nunca mudam.
// Os ajustes sao limitados: o bot continua reconhecivel pelo estilo base. Puro e sem estado: cada
// decisao recebe o perfil base e devolve o perfil ajustado.
// ============================================================
import type { BotProfile } from './profiles'
import type { HudStats } from './hud'

/** Maos do heroi que o bot precisa ter visto antes de ajustar: o profissional percebe mais cedo. */
export const MIN_HANDS_PRO = 15
export const MIN_HANDS_REGULAR = 25
/** Quantas vezes o heroi precisa ter enfrentado aposta para o bot confiar no fold para aposta. */
const MIN_FACED = 10

export interface AdaptContext {
  /** Estatisticas acumuladas do heroi (o que o bot viu dele). */
  hero?: HudStats
  /** Stack medio do torneio em bb, para saber quem e chip leader. */
  avgStackBB?: number
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/**
 * Perfil ajustado para esta decisao. `own.stackBB` e o stack do bot; `heroActive` diz se o heroi
 * ainda esta na mao (so nesse caso o bot reage ao que sabe dele).
 */
export function adaptProfile(base: BotProfile, ctx: AdaptContext, own: { stackBB: number }, heroActive: boolean): BotProfile {
  if (base.adapt === 0) return base
  const k = base.adapt === 2 ? 1 : 0.5 // forca do ajuste: profissional 1, regular 0,5
  let L = base.looseness
  let A = base.aggression
  let B = base.bluff
  let S = base.stickiness

  // marcha por situacao: stack curto empurra mais e abre mais; fundo joga mais sólido; chip leader pressiona
  if (own.stackBB <= 25) { L *= 1 + 0.15 * k; A *= 1 + 0.1 * k }
  else if (own.stackBB >= 70) L *= 1 - 0.05 * k
  if (ctx.avgStackBB && ctx.avgStackBB > 0 && own.stackBB > 1.6 * ctx.avgStackBB) A *= 1 + 0.15 * k

  // ajuste ao heroi: so com amostra suficiente e com ele ainda na mao
  const h = ctx.hero
  const need = base.adapt === 2 ? MIN_HANDS_PRO : MIN_HANDS_REGULAR
  if (heroActive && h && h.hands >= need) {
    const vpip = h.vpip / h.hands
    const pfr = h.pfr / h.hands
    if (vpip < 0.2) {
      // aperta: vale roubar mais e pressionar
      L *= 1 + 0.25 * k
      A *= 1 + 0.1 * k
    } else if (vpip > 0.38) {
      // joga solto: paga mais fino e blefa menos contra quem nao larga
      S += 0.05 * k
      B *= 1 - 0.35 * k
    }
    if (vpip > 0.35 && pfr < 0.12) {
      // pagador passivo: valor sempre, blefe quase nunca
      B *= 1 - 0.5 * k
      A *= 1 + 0.1 * k
    }
    if (h.facedBet >= MIN_FACED) {
      const fold = h.foldToBet / h.facedBet
      if (fold > 0.6) B *= 1 + 0.6 * k // foge de apostas: blefa mais
      else if (fold < 0.3) B *= 1 - 0.6 * k // nao foge: blefa menos
    }
  }

  return {
    ...base,
    looseness: clamp(L, 0.4, 2.5),
    aggression: clamp(A, 0.3, 2.5),
    bluff: clamp(B, 0, 0.7),
    stickiness: clamp(S, -0.1, 0.25),
  }
}
