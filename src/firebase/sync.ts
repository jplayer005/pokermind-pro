import { doc, getDoc, serverTimestamp, Timestamp, runTransaction, deleteDoc } from 'firebase/firestore'
import { db } from './config'
import { MERGERS, stripMeta } from '@/engine/syncMerge'

function userDoc(uid: string, storeName: string) {
  return doc(db, 'users', uid, 'data', storeName)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = Record<string, any>

export type SyncPayload = Partial<Record<(typeof SYNC_DOCS)[number], Obj>>

export const SYNC_DOCS = ['profile', 'training', 'spacedRepetition', 'postflopReview', 'hands', 'leaks', 'notes', 'play'] as const

/** Limite por documento do Firestore e uma margem de seguranca (1 MiB). */
export const DOC_SIZE_LIMIT = 800_000

const errText = (e: unknown) => (e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : String(e))

export interface UploadResult {
  /** Documento -> motivo da falha. Vazio = tudo enviou. */
  failed: Record<string, string>
  /** Documento -> resultado da fusao com a nuvem (o app aplica de volta no aparelho). */
  merged: Record<string, Obj>
}

/**
 * Envia cada documento em separado: uma falha (ex.: regra de seguranca) nao derruba os outros.
 * Cada envio e uma TRANSACAO: le o que esta na nuvem, funde com o local (uniao, ver
 * engine/syncMerge) e grava o resultado. Assim dois aparelhos nunca se sobrescrevem.
 * `skip` = documentos que NAO podem ser gravados (nao deu para ler a nuvem no login).
 */
export async function uploadUserData(
  uid: string,
  data: SyncPayload,
  skip: readonly string[] = [],
): Promise<UploadResult> {
  const failed: Record<string, string> = {}
  const merged: Record<string, Obj> = {}
  const entries = (Object.entries(data) as [string, Obj][]).filter(
    ([key, v]) => v !== undefined && v !== null && !skip.includes(key),
  )
  const results = await Promise.allSettled(
    entries.map(([key, local]) =>
      runTransaction(db, async (tx) => {
        const ref = userDoc(uid, key)
        const snap = await tx.get(ref)
        const cloud = snap.exists() ? (snap.data() as Obj) : null
        const result = MERGERS[key](local, cloud)
        // JSON ida e volta tira os `undefined`, que o Firestore recusa ("Unsupported field value")
        const out = JSON.parse(JSON.stringify(stripMeta(result) ?? {})) as Obj
        if (JSON.stringify(out).length > DOC_SIZE_LIMIT) throw new Error('documento grande demais')
        tx.set(ref, { ...out, updatedAt: serverTimestamp() }, { merge: false })
        merged[key] = out
      }),
    ),
  )
  results.forEach((r, i) => {
    if (r.status === 'rejected') failed[entries[i][0]] = errText(r.reason)
  })
  return { failed, merged }
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

/** Apaga documentos do usuario na nuvem (todos, ou so os de `names`), ao resetar dados no app. */
export async function clearUserCloudData(
  uid: string,
  names: readonly string[] = SYNC_DOCS,
): Promise<{ failed: Record<string, string> }> {
  const failed: Record<string, string> = {}
  const results = await Promise.allSettled(names.map((name) => deleteDoc(userDoc(uid, name))))
  results.forEach((r, i) => {
    if (r.status === 'rejected') failed[names[i]] = errText(r.reason)
  })
  return { failed }
}

export function toTimestampMillis(val: unknown): number {
  if (!val) return 0
  if (val instanceof Timestamp) return val.toMillis()
  if (typeof val === 'number') return val
  return 0
}
