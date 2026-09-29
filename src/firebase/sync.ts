import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from './config'

function userDoc(uid: string, storeName: string) {
  return doc(db, 'users', uid, 'data', storeName)
}

export interface SyncPayload {
  profile?: Record<string, unknown>
  training?: Record<string, unknown>
  spacedRepetition?: Record<string, unknown>
  postflopReview?: Record<string, unknown>
  hands?: Record<string, unknown>
  leaks?: Record<string, unknown>
}

export const SYNC_DOCS = ['profile', 'training', 'spacedRepetition', 'postflopReview', 'hands', 'leaks'] as const

const errText = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : String(e))

export interface UploadResult {
  /** Documento -> motivo da falha. Vazio = tudo enviou. */
  failed: Record<string, string>
}

/**
 * Envia cada documento em separado: uma falha (ex.: regra de seguranca) nao derruba os outros.
 * `skip` = documentos que NAO podem ser sobrescritos (nao deu para ler o que ha na nuvem, entao
 * enviar o estado local poderia apagar dados do jogador).
 */
export async function uploadUserData(
  uid: string,
  data: SyncPayload,
  skip: readonly string[] = [],
): Promise<UploadResult> {
  const failed: Record<string, string> = {}
  const entries = (Object.entries(data) as [keyof SyncPayload, Record<string, unknown>][]).filter(
    ([key, v]) => v !== undefined && v !== null && !skip.includes(key),
  )
  const results = await Promise.allSettled(
    entries.map(([key, value]) =>
      setDoc(userDoc(uid, key), { ...value, updatedAt: serverTimestamp() }, { merge: false }),
    ),
  )
  results.forEach((r, i) => {
    if (r.status === 'rejected') failed[entries[i][0]] = errText(r.reason)
  })
  return { failed }
}

export interface DownloadResult {
  /** Conteudo de cada documento; null = nao existe na nuvem (ou falhou, ver `failed`). */
  data: Record<string, Record<string, unknown> | null>
  /** Documento -> motivo da falha de leitura. */
  failed: Record<string, string>
}

export async function downloadUserData(uid: string): Promise<DownloadResult> {
  const data: DownloadResult['data'] = {}
  const failed: Record<string, string> = {}
  await Promise.all(
    SYNC_DOCS.map(async (name) => {
      try {
        const snap = await getDoc(userDoc(uid, name))
        data[name] = snap.exists() ? snap.data() : null
      } catch (e) {
        data[name] = null
        failed[name] = errText(e)
      }
    }),
  )
  return { data, failed }
}

export function toTimestampMillis(val: unknown): number {
  if (!val) return 0
  if (val instanceof Timestamp) return val.toMillis()
  if (typeof val === 'number') return val
  return 0
}
