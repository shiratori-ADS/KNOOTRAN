import { db, getSettings } from '../db/db'
import type { Entry, Settings as SettingsType } from '../db/types'
import { normalizeToken } from './normalize'

export type BackupPayloadV1 = {
  kind: 'known-only-translate-backup'
  version: 1
  exportedAt: number
  settings: SettingsType
  entries: Entry[]
}

export async function buildLocalPayload(): Promise<BackupPayloadV1> {
  const s = await getSettings()
  const entries = await db.entries.toArray()
  return {
    kind: 'known-only-translate-backup',
    version: 1,
    exportedAt: Date.now(),
    settings: s,
    entries,
  }
}

export async function restoreFromPayload(raw: unknown): Promise<{ restoredCount: number }> {
  const r = raw as any
  if (!r || r.kind !== 'known-only-translate-backup' || r.version !== 1) {
    throw new Error('バックアップ形式が不正です。')
  }

  const nextSettings: SettingsType | null =
    r.settings && r.settings.id === 'singleton' ? (r.settings as SettingsType) : null
  const nextEntries: Entry[] = Array.isArray(r.entries) ? (r.entries as Entry[]) : []

  if (!nextSettings) {
    throw new Error('settingsが不正です。')
  }

  const normalizedEntries: Entry[] = nextEntries.map((e) => {
    const lemma = normalizeToken(e.foreignLemma ?? '')
    const forms = Array.isArray(e.foreignForms)
      ? Array.from(new Set(e.foreignForms.map((f) => normalizeToken(f ?? '')).filter(Boolean)))
      : lemma
        ? [lemma]
        : []
    return {
      ...e,
      foreignLemma: lemma ? lemma : undefined,
      foreignForms: forms,
    }
  })

  await db.transaction('rw', db.entries, db.settings, async () => {
    await db.entries.clear()
    await db.settings.clear()
    const patchedSettings: SettingsType = {
      id: 'singleton',
      uiLanguage: r.settings?.uiLanguage === 'en' ? 'en' : 'ja',
      tags: Array.isArray(r.settings?.tags) ? r.settings.tags : [],
    }
    await db.settings.put(patchedSettings)
    await db.entries.bulkPut(normalizedEntries)
  })

  return { restoredCount: normalizedEntries.length }
}

