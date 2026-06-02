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
}

export async function uploadUserData(uid: string, data: SyncPayload) {
  const writes = (Object.entries(data) as [keyof SyncPayload, Record<string, unknown>][])
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([key, value]) =>
      setDoc(userDoc(uid, key), { ...value, updatedAt: serverTimestamp() }, { merge: false })
    )
  await Promise.all(writes)
}

export async function downloadUserData(uid: string): Promise<Record<string, Record<string, unknown> | null>> {
  const storeNames = ['profile', 'training', 'spacedRepetition', 'postflopReview', 'hands']
  const entries = await Promise.all(
    storeNames.map(async (name) => {
      const snap = await getDoc(userDoc(uid, name))
      return [name, snap.exists() ? snap.data() : null] as const
    })
  )
  return Object.fromEntries(entries)
}

export function toTimestampMillis(val: unknown): number {
  if (!val) return 0
  if (val instanceof Timestamp) return val.toMillis()
  if (typeof val === 'number') return val
  return 0
}
