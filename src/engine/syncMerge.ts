// ============================================================
// ENGINE: fusao dos dados locais com os da nuvem (dois aparelhos, mesma conta).
// Regra geral: UNIAO, nunca "quem tem mais itens sobrescreve". Cada documento tem uma funcao pura
// merge(local, nuvem) -> resultado; o app aplica o resultado nos dois lados. Itens apagados de
// proposito viram "lapides" (id -> quando) para nao voltarem do outro aparelho.
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any>

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

/** Timestamp do Firestore (tem toMillis) ou numero em ms. */
export function millis(v: unknown): number {
  if (typeof v === 'number') return v
  if (isObj(v) && typeof v.toMillis === 'function') return v.toMillis() as number
  return 0
}

export const MAX_TOMBSTONES = 200
export const MAX_SESSIONS = 50
export const MAX_PLAYED_HANDS = 40

/** Une lapides dos dois lados (fica com o instante mais recente) e limita o tamanho. */
export function mergeTombstones(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
  const out: Record<string, number> = { ...a }
  for (const [id, t] of Object.entries(b)) out[id] = Math.max(out[id] ?? 0, t)
  const keep = Object.entries(out).sort((x, y) => y[1] - x[1]).slice(0, MAX_TOMBSTONES)
  return Object.fromEntries(keep)
}

/** Uniao por id; em conflito `pick` decide (padrao: o local). Itens com lapide mais nova saem. */
export function unionById<T extends { id: string }>(
  local: T[] = [],
  cloud: T[] = [],
  tomb: Record<string, number> = {},
  pick: (l: T, c: T) => T = (l) => l,
  stamp: (x: T) => number = () => 0,
): T[] {
  const map = new Map<string, T>()
  for (const c of cloud) map.set(c.id, c)
  for (const l of local) {
    const c = map.get(l.id)
    map.set(l.id, c ? pick(l, c) : l)
  }
  return [...map.values()].filter((x) => !(tomb[x.id] !== undefined && tomb[x.id] >= stamp(x)))
}

// ---------------------------------------------------------------- maos

interface HandLike {
  id: string
  date: number
  tags: string[]
}

/** Maos jogadas na mesa sao limitadas; as marcadas 'revisar' e as manuais ficam sempre. */
export function capPlayedHands<T extends HandLike>(list: T[]): T[] {
  let played = 0
  return list.filter((h) => {
    if (!h.tags.includes('jogada') || h.tags.includes('revisar')) return true
    return ++played <= MAX_PLAYED_HANDS
  })
}

export function mergeHands(local: Obj | null, cloud: Obj | null): Obj {
  const tomb = mergeTombstones(local?.deleted, cloud?.deleted)
  const hands = unionById<HandLike & Obj>(local?.savedHands, cloud?.savedHands, tomb)
    .sort((a, b) => b.date - a.date)
  return { savedHands: capPlayedHands(hands), deleted: tomb }
}

// ---------------------------------------------------------------- treino (drills)

export function mergeTraining(local: Obj | null, cloud: Obj | null): Obj {
  const sessions = unionById<{ id: string; startedAt: number }>(local?.sessionHistory, cloud?.sessionHistory)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, MAX_SESSIONS)

  const seen = new Set<string>()
  const scores = [...(local?.competitionHighScores ?? []), ...(cloud?.competitionHighScores ?? [])]
    .filter((s: Obj) => {
      const k = `${s.score}|${s.date}|${s.scenario}|${s.totalQuestions}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .sort((a: Obj, b: Obj) => b.score - a.score)
    .slice(0, 10)

  // contador do dia: vale o do dia mais recente; no mesmo dia, o maior
  const ld = local?.lastResetDate ?? ''
  const cd = cloud?.lastResetDate ?? ''
  let lastResetDate = ld
  let totalQuestionsToday = local?.totalQuestionsToday ?? 0
  if (cd > ld) { lastResetDate = cd; totalQuestionsToday = cloud?.totalQuestionsToday ?? 0 }
  else if (cd === ld) totalQuestionsToday = Math.max(totalQuestionsToday, cloud?.totalQuestionsToday ?? 0)

  return { sessionHistory: sessions, competitionHighScores: scores, totalQuestionsToday, lastResetDate }
}

// ---------------------------------------------------------------- revisao espacada

export function mergeSm2(local: Obj | null, cloud: Obj | null): Obj {
  const a: Obj = local?.sm2Data ?? {}
  const b: Obj = cloud?.sm2Data ?? {}
  const out: Obj = { ...b }
  for (const [k, l] of Object.entries(a)) {
    const c = b[k]
    if (!c) { out[k] = l; continue }
    // fica com quem tem mais tentativas; empate: visto por ultimo
    out[k] = l.totalAttempts !== c.totalAttempts
      ? (l.totalAttempts > c.totalAttempts ? l : c)
      : (String(l.lastSeen) >= String(c.lastSeen) ? l : c)
  }
  return { sm2Data: out }
}

export function mergePostflop(local: Obj | null, cloud: Obj | null): Obj {
  const a: Obj = local?.profiles ?? {}
  const b: Obj = cloud?.profiles ?? {}
  const out: Obj = { ...b }
  for (const [k, l] of Object.entries(a)) {
    const c = b[k]
    out[k] = !c ? l : l.attempts !== c.attempts ? (l.attempts > c.attempts ? l : c) : (l.lastSeenAt >= c.lastSeenAt ? l : c)
  }
  return { profiles: out }
}

// ---------------------------------------------------------------- vazamentos (coach)

export function mergeLeaks(local: Obj | null, cloud: Obj | null): Obj {
  const a: Obj = local?.stats ?? {}
  const b: Obj = cloud?.stats ?? {}
  const out: Obj = { ...b }
  for (const [k, l] of Object.entries(a)) {
    const c = b[k]
    out[k] = !c ? l : l.n !== c.n ? (l.n > c.n ? l : c) : (l.lastSeen >= c.lastSeen ? l : c)
  }
  // o total de decisoes nunca pode ser menor que a soma do que a tabela ja registra
  const sumN = Object.values(out).reduce((s: number, x: Obj) => s + (x.n ?? 0), 0)
  return { stats: out, decisions: Math.max(local?.decisions ?? 0, cloud?.decisions ?? 0, sumN) }
}

// ---------------------------------------------------------------- anotacoes e mesa

export function mergeNotes(local: Obj | null, cloud: Obj | null): Obj {
  const tomb = mergeTombstones(local?.deleted, cloud?.deleted)
  const notes = unionById<{ id: string; updatedAt: number }>(
    local?.notes, cloud?.notes, tomb,
    (l, c) => (l.updatedAt >= c.updatedAt ? l : c), // a edicao mais recente vence
    (n) => n.updatedAt,
  ).sort((x, y) => y.updatedAt - x.updatedAt)
  return { notes, deleted: tomb }
}

export function mergePlay(local: Obj | null, cloud: Obj | null): Obj {
  const sessions = unionById<{ id: string; endedAt: number }>(local?.sessions, cloud?.sessions)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, MAX_SESSIONS)
  const ld = local?.xpDay ?? ''
  const cd = cloud?.xpDay ?? ''
  let xpDay = ld
  let xpToday = local?.xpToday ?? 0
  if (cd > ld) { xpDay = cd; xpToday = cloud?.xpToday ?? 0 }
  else if (cd === ld) xpToday = Math.max(xpToday, cloud?.xpToday ?? 0)
  return { sessions, xpDay, xpToday }
}

// ---------------------------------------------------------------- perfil

/**
 * "Mais nova" nao basta: uma nuvem recem-criada e vazia (XP 0) nao pode sobrescrever um perfil
 * local com progresso. A nuvem so vence se tem mais XP, ou e mais nova e nao tem menos.
 */
export function mergeProfile(local: Obj, cloud: Obj | null): Obj {
  if (!cloud) return local
  const cloudXP = cloud.stats?.xp ?? 0
  const localXP = local.stats?.xp ?? 0
  const cloudAt = millis(cloud.updatedAt)
  const localAt = millis(local.updatedAt)
  if (cloudXP > localXP || (cloudAt > localAt && cloudXP >= localXP)) {
    const { updatedAt: _u, ...rest } = cloud // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...local, ...rest, id: local.id }
  }
  return local
}

export const MERGERS: Record<string, (local: Obj, cloud: Obj | null) => Obj> = {
  profile: mergeProfile,
  training: mergeTraining,
  spacedRepetition: mergeSm2,
  postflopReview: mergePostflop,
  hands: mergeHands,
  leaks: mergeLeaks,
  notes: mergeNotes,
  play: mergePlay,
}

/** Remove o campo `updatedAt` (do servidor) antes de comparar ou aplicar. */
export function stripMeta(doc: Obj | null): Obj | null {
  if (!doc) return null
  const { updatedAt: _u, ...rest } = doc // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest
}

/** Igualdade por conteudo (as chaves vem em ordem diferente conforme o aparelho). */
export function sameData(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(norm)
    : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k])]))
    : v
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b))
}
