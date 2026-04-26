import Dexie, { type Table } from 'dexie'
import type { Entry, Settings } from './types'
import { normalizeToken } from '../lib/normalize'
import { inferNounInflectionTypeFromLemma } from '../grammar/infer'

export class AppDB extends Dexie {
  entries!: Table<Entry, number>
  settings!: Table<Settings, string>

  constructor() {
    super('knownOnlyTranslate')
    this.version(1).stores({
      entries: '++id, pos, meaningJa, foreignLemma, *foreignForms, updatedAt',
      settings: 'id',
    })

    this.version(2)
      .stores({
        entries:
          '++id, pos, meaningJaPrimary, *meaningJaVariants, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table('entries')
        await table.toCollection().modify((e: any) => {
          if (typeof e.meaningJaPrimary === 'string' && Array.isArray(e.meaningJaVariants)) return
          const legacy = typeof e.meaningJa === 'string' ? e.meaningJa : ''
          const primary = (legacy || '').toString()
          e.meaningJaPrimary = primary
          e.meaningJaVariants = primary ? [primary] : []
          delete e.meaningJa
        })
      })

    this.version(3)
      .stores({
        entries:
          '++id, pos, nounGender, meaningJaPrimary, *meaningJaVariants, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table('entries')
        await table.toCollection().modify((e: any) => {
          if (e.pos !== 'noun') {
            delete e.nounGender
            return
          }
          if (e.nounGender === 'masc' || e.nounGender === 'fem' || e.nounGender === 'neut' || e.nounGender === 'common_mf') return
          // 未設定は空のまま（UIで選べるようにする）
          delete e.nounGender
        })
      })

    this.version(4)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table('entries')
        await table.toCollection().modify((e: any) => {
          if (typeof e.inflectionType === 'string') return
          if (e.pos === 'verb') {
            e.inflectionType = 'verb_pres_act_-ω'
            return
          }
          if (e.pos === 'noun') {
            // 既存データは判定不能なので、とりあえず none（ユーザーが後で編集）
            e.inflectionType = 'none'
            return
          }
          e.inflectionType = 'none'
        })
      })

    this.version(5)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, memo, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table('entries')
        await table.toCollection().modify((e: any) => {
          if (typeof e.memo === 'string') return
          // 未入力は空文字（UIのtextareaにそのまま載せられる）
          e.memo = ''
        })
      })

    this.version(6)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, *tags, memo, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const entries = tx.table('entries')
        await entries.toCollection().modify((e: any) => {
          if (Array.isArray(e.tags)) return
          e.tags = []
        })

        const settings = tx.table('settings')
        const s = await settings.get('singleton')
        if (s) {
          if (!Array.isArray((s as any).tags)) {
            ;(s as any).tags = []
            await settings.put(s)
          }
        }
      })

    // v7: 旧型の名詞 inflectionType を新しい推定結果へ移行（レコード削除はしない）
    this.version(7)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, *tags, memo, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const entries = tx.table('entries')
        await entries.toCollection().modify((e: any) => {
          if (!e || e.pos !== 'noun') return
          const t = e.inflectionType
          if (t !== 'noun_2nd_masc_-ος' && t !== 'noun_masc_-ας' && t !== 'noun_masc_-ης') return

          const lemma = normalizeToken(e.foreignLemma ?? e.foreignForms?.[0] ?? '')
          if (!lemma) return

          e.inflectionType = inferNounInflectionTypeFromLemma(lemma, e.nounGender)
        })
      })

    // v8: 旧型の女性名詞（-α/-η）を新しい5パターンへ移行
    this.version(8)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, *tags, memo, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const entries = tx.table('entries')
        await entries.toCollection().modify((e: any) => {
          if (!e || e.pos !== 'noun') return
          const t = e.inflectionType
          if (t !== 'noun_1st_fem_-α' && t !== 'noun_1st_fem_-η') return
          const lemma = normalizeToken(e.foreignLemma ?? e.foreignForms?.[0] ?? '')
          if (!lemma) return
          e.inflectionType = inferNounInflectionTypeFromLemma(lemma, 'fem')
        })
      })

    // v9: 文字正規化（NFC）をDBにも適用。トノスは保持し、結合文字だけ合成する。
    this.version(9)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, *tags, memo, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const entries = tx.table('entries')
        await entries.toCollection().modify((e: any) => {
          if (!e) return

          if (typeof e.foreignLemma === 'string') {
            const norm = normalizeToken(e.foreignLemma)
            e.foreignLemma = norm ? norm : undefined
          }

          if (Array.isArray(e.foreignForms)) {
            const forms = e.foreignForms.map((x: any) => (typeof x === 'string' ? normalizeToken(x) : '')).filter(Boolean)
            e.foreignForms = Array.from(new Set(forms))
          }

          if (e.inflectionOverrides && typeof e.inflectionOverrides === 'object') {
            Object.keys(e.inflectionOverrides).forEach((k) => {
              const v = e.inflectionOverrides[k]
              if (typeof v !== 'string') return
              e.inflectionOverrides[k] = v ? v.normalize('NFC') : v
            })
          }
        })
      })

    // v10: 旧型の中性名詞 -μα を新しい2分類へ移行（noun_neut_-μα -> noun_neut_-μα_2syll/_3plus）
    this.version(10)
      .stores({
        entries:
          '++id, pos, nounGender, inflectionType, meaningJaPrimary, *meaningJaVariants, *tags, memo, foreignLemma, *foreignForms, updatedAt',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const entries = tx.table('entries')
        await entries.toCollection().modify((e: any) => {
          if (!e || e.pos !== 'noun') return
          if (e.inflectionType !== 'noun_neut_-μα') return
          const lemma = normalizeToken(e.foreignLemma ?? e.foreignForms?.[0] ?? '')
          if (!lemma) return
          e.inflectionType = inferNounInflectionTypeFromLemma(lemma, 'neut')
        })
      })
  }
}

export const db = new AppDB()

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('singleton')
  if (existing) {
    const tags = Array.isArray(existing.tags) ? existing.tags : []
    const uiLanguage = (existing as any).uiLanguage === 'en' ? 'en' : 'ja'
    const patched: Settings = { id: 'singleton', uiLanguage, tags }
    // 旧フィールド foreignLanguageLabel は互換のため読み捨てる（翻訳対象はギリシャ語固定）
    if ((existing as any).uiLanguage !== uiLanguage || (existing as any).tags !== tags || (existing as any).id !== 'singleton') {
      await db.settings.put(patched)
    }
    return patched
  }
  const initial: Settings = { id: 'singleton', uiLanguage: 'ja', tags: [] }
  await db.settings.put(initial)
  return initial
}

