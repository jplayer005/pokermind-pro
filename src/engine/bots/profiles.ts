// ============================================================
// ENGINE: perfis de bot. Cada perfil e so um conjunto de parametros
// aplicados pela mesma politica (bots/policy.ts).
// ============================================================

export interface BotProfile {
  id: string
  label: string
  /** Estilo em uma linha, mostrado na mesa e no HUD. */
  blurb: string
  /** >1 abre/paga mais maos que o range base; <1 menos. */
  looseness: number
  /** Multiplica a frequencia de apostar e aumentar. */
  aggression: number
  /** Frequencia base de blefe (aposta sem equity). */
  bluff: number
  /** Soma na tolerancia de pagar: positivo paga com menos equity. */
  stickiness: number
}

export const BOT_PROFILES: Record<string, BotProfile> = {
  tag: { id: 'tag', label: 'TAG', blurb: 'Sólido: poucas mãos, agressivo', looseness: 1, aggression: 1, bluff: 0.18, stickiness: 0 },
  nit: { id: 'nit', label: 'Nit', blurb: 'Só joga mãos fortes, foga fácil', looseness: 0.6, aggression: 0.7, bluff: 0.05, stickiness: -0.06 },
  lag: { id: 'lag', label: 'LAG', blurb: 'Joga muitas mãos e pressiona', looseness: 1.4, aggression: 1.4, bluff: 0.32, stickiness: 0.02 },
  maniac: { id: 'maniac', label: 'Maníaco', blurb: 'Aposta e aumenta quase sempre', looseness: 2, aggression: 2, bluff: 0.5, stickiness: 0.05 },
  station: { id: 'station', label: 'Calling Station', blurb: 'Paga tudo, raramente aumenta', looseness: 1.6, aggression: 0.35, bluff: 0.04, stickiness: 0.14 },
}

export const PROFILE_IDS = Object.keys(BOT_PROFILES)

export function profileOf(id: string): BotProfile {
  return BOT_PROFILES[id] ?? BOT_PROFILES.tag
}

/** Sorteia perfis para uma mesa: sempre pelo menos um TAG, mistura o resto. */
export function pickProfiles(count: number, rng: () => number = Math.random): string[] {
  const bag = ['tag', 'tag', 'lag', 'nit', 'station', 'maniac', 'tag', 'lag']
  const out: string[] = ['tag']
  while (out.length < count) out.push(bag[Math.floor(rng() * bag.length)])
  // embaralha
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out.slice(0, count)
}
