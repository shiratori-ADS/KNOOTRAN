import { db } from '../db/db'
import type { Entry } from '../db/types'
import { normalizeToken } from './normalize'

/** foreignLemma を正規化比較で検索（DB 索引の大文字小文字と一致しない場合があるため filter を使う） */
export async function findEntryByNormalizedForeignLemma(norm: string): Promise<Entry | undefined> {
  if (!norm) return undefined
  return db.entries.filter((e) => normalizeToken(e.foreignLemma ?? '') === norm).first()
}

/** foreignForms のいずれかを正規化比較で検索 */
export async function findEntryByNormalizedForeignForm(norm: string): Promise<Entry | undefined> {
  if (!norm) return undefined
  return db.entries
    .filter((e) => (e.foreignForms ?? []).some((f) => normalizeToken(f) === norm))
    .first()
}

export async function findEntryByNormalizedForeign(norm: string): Promise<Entry | undefined> {
  const byLemma = await findEntryByNormalizedForeignLemma(norm)
  if (byLemma) return byLemma
  return findEntryByNormalizedForeignForm(norm)
}

/** 正規化した見出し語または別形が一致するエントリをすべて返す（重複なし） */
export async function findEntriesByNormalizedForeign(norm: string): Promise<Entry[]> {
  if (!norm) return []
  const byId = new Map<number, Entry>()
  const rows = await db.entries
    .filter(
      (e) =>
        normalizeToken(e.foreignLemma ?? '') === norm ||
        (e.foreignForms ?? []).some((f) => normalizeToken(f) === norm),
    )
    .toArray()
  for (const e of rows) {
    if (e.id != null) byId.set(e.id, e)
  }
  return Array.from(byId.values())
}

/** ノートから単語帳へのリンク用 href */
export function wordbookEntryHref(entryId: number): string {
  return `/wordbook?id=${entryId}`
}
