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

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const derived = new Map<string, BotProfile>()

/**
 * Perfil por id. Alem dos ids base, aceita "base~frouxidao~agressividade" (ex.: "lag~1.10~0.85"):
 * o perfil base com os dois multiplicadores, para cada jogador do campo ter estilo proprio.
 * Id desconhecido ou quebrado cai no TAG.
 */
export function profileOf(id: string): BotProfile {
  const base = BOT_PROFILES[id]
  if (base) return base
  const hit = derived.get(id)
  if (hit) return hit
  const m = /^([a-z]+)~(\d+(?:\.\d+)?)~(\d+(?:\.\d+)?)$/.exec(id)
  const root = m ? BOT_PROFILES[m[1]] : undefined
  if (!m || !root) return BOT_PROFILES.tag
  const loose = clamp(Number(m[2]), 0.5, 1.5)
  const aggr = clamp(Number(m[3]), 0.5, 1.5)
  // + e - no rotulo mostram a tendencia individual (ASCII: o rotulo vai para a mesa e o HUD)
  const mark = aggr >= 1.12 ? '+' : aggr <= 0.88 ? '-' : ''
  const p: BotProfile = {
    ...root,
    id,
    label: `${root.label}${mark}`,
    blurb: mark === '+' ? `${root.blurb} (mais agressivo que o normal)` : mark === '-' ? `${root.blurb} (mais passivo que o normal)` : root.blurb,
    looseness: root.looseness * loose,
    aggression: root.aggression * aggr,
  }
  derived.set(id, p)
  return p
}

/** Peso de cada estilo no campo de um torneio: muitos TAGs e pagadores, poucos maniacos. */
const FIELD_WEIGHTS: [string, number][] = [['tag', 32], ['station', 20], ['lag', 20], ['nit', 14], ['maniac', 8]]

/** Perfil de um jogador do campo: estilo sorteado por peso, com frouxidao e agressividade proprias. */
export function fieldProfile(rng: () => number = Math.random): string {
  const total = FIELD_WEIGHTS.reduce((a, [, w]) => a + w, 0)
  let r = rng() * total
  let base = FIELD_WEIGHTS[0][0]
  for (const [id, w] of FIELD_WEIGHTS) {
    if ((r -= w) < 0) { base = id; break }
  }
  const loose = 0.8 + rng() * 0.45 // 0,80 a 1,25
  const aggr = 0.7 + rng() * 0.65 // 0,70 a 1,35
  return `${base}~${loose.toFixed(2)}~${aggr.toFixed(2)}`
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
