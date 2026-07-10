import { db, getSettings } from '../db/db'
import type { Entry, NotePage, Settings as SettingsType } from '../db/types'
import { normalizeForeignStorage } from './normalize'

export type BackupPayloadV1 = {
  kind: 'known-only-translate-backup'
  version: 1
  exportedAt: number
  settings: SettingsType
  entries: Entry[]
  notePages?: NotePage[]
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export async function buildLocalPayload(): Promise<BackupPayloadV1> {
  const s = await getSettings()
  const entries = await db.entries.toArray()
  const notePages = await db.notePages.orderBy('sortOrder').toArray()
  return {
    kind: 'known-only-translate-backup',
    version: 1,
    exportedAt: Date.now(),
    settings: s,
    entries,
    notePages,
  }
}

export async function restoreFromPayload(raw: unknown): Promise<{ restoredCount: number }> {
  const r = asObject(raw)
  if (!r || r.kind !== 'known-only-translate-backup' || r.version !== 1) {
    throw new Error('バックアップ形式が不正です。')
  }

  const settingsRaw = asObject(r.settings)
  const nextSettings: SettingsType | null =
    settingsRaw && settingsRaw.id === 'singleton' ? (r.settings as SettingsType) : null
  const nextEntries: Entry[] = Array.isArray(r.entries) ? (r.entries as Entry[]) : []
  const nextNotePages: NotePage[] = Array.isArray(r.notePages) ? (r.notePages as NotePage[]) : []

  if (!nextSettings) {
    throw new Error('settingsが不正です。')
  }

  const normalizedEntries: Entry[] = nextEntries.map((e) => {
    const lemma = normalizeForeignStorage(e.foreignLemma ?? '')
    const forms = Array.isArray(e.foreignForms)
      ? Array.from(new Set(e.foreignForms.map((f) => normalizeForeignStorage(f ?? '')).filter(Boolean)))
      : lemma
        ? [lemma]
        : []
    return {
      ...e,
      foreignLemma: lemma ? lemma : undefined,
      foreignForms: forms,
    }
  })

  await db.transaction('rw', db.entries, db.settings, db.notePages, async () => {
    await db.entries.clear()
    await db.settings.clear()
    await db.notePages.clear()
    const patchedSettings: SettingsType = {
      id: 'singleton',
      uiLanguage:
        settingsRaw?.uiLanguage === 'en'
          ? 'en'
          : settingsRaw?.uiLanguage === 'el'
            ? 'el'
            : 'ja',
      tags: Array.isArray(settingsRaw?.tags) ? settingsRaw.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    }
    await db.settings.put(patchedSettings)
    await db.entries.bulkPut(normalizedEntries)
    if (nextNotePages.length > 0) {
      await db.notePages.bulkPut(nextNotePages)
    }
  })

  return { restoredCount: normalizedEntries.length }
}

