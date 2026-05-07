import * as XLSX from 'xlsx'
import { normalizeToken } from './normalize'
import type { Entry, InflectionType, NounGender, PartOfSpeech } from '../db/types'
import { parseExamplePairsText } from './examples'
import { nounAutoForms } from '../grammar/noun'
import { adjectiveAutoForms } from '../grammar/adjective'
import { verbAoristMatrix, verbImperativeForms, verbMatrix } from '../grammar/verb'

export type ImportBWordRow = {
  rowNumber: number
  foreignLemma: string
  pos: PartOfSpeech
  meaningJa: string
  tags?: string
  memo?: string
  examples?: string
  related?: string
}

export type ImportBResult =
  | { ok: false; errors: Array<{ rowNumber: number; foreignLemma: string; message: string }> }
  | { ok: true; entries: Entry[] }

function sheetToObjects<T extends Record<string, any>>(wb: XLSX.WorkBook, name: string): T[] {
  const ws = wb.Sheets[name]
  if (!ws) return []
  return XLSX.utils.sheet_to_json(ws, { defval: '' }) as T[]
}

function splitCsvLike(s: string, sep: string) {
  return (s ?? '')
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean)
}

function normalizeExamplesCell(s: string) {
  // セル内で \n 文字列として入っているケースと、実改行のケースの両対応
  return (s ?? '').replace(/\\n/g, '\n')
}

type VerbSheetRow = Record<string, string> & { foreignLemma: string; inflectionType?: string }
type NounSheetRow = Record<string, string> & { foreignLemma: string; nounGender?: string }
type AdjSheetRow = Record<string, string> & { foreignLemma: string; pos?: string }

function pickOverrides(row: Record<string, any>, prefix: string) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    if (!k.startsWith(prefix)) continue
    const s = String(v ?? '').trim()
    if (!s) continue
    out[k] = s
  }
  return out
}

export function parseExcelImportB(arrayBuffer: ArrayBuffer): ImportBResult {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetNames = new Set(wb.SheetNames)

  const required = ['word', 'noun', 'adjective', 'verb'] as const
  const missingSheets = required.filter((s) => !sheetNames.has(s))
  if (missingSheets.length) {
    return {
      ok: false,
      errors: missingSheets.map((s) => ({
        rowNumber: 0,
        foreignLemma: '',
        message: `必須シート「${s}」が見つかりません。`,
      })),
    }
  }

  const wordRaw = sheetToObjects<Record<string, any>>(wb, 'word')
  // 1行目はヘッダ、sheet_to_json は2行目以降を返す。Excel上の行番号は +2 とする。
  const wordRows: ImportBWordRow[] = wordRaw.map((r, idx) => ({
    rowNumber: idx + 2,
    foreignLemma: String(r.foreignLemma ?? '').trim(),
    pos: r.pos as PartOfSpeech,
    meaningJa: String(r.meaningJa ?? '').trim(),
    tags: String(r.tags ?? '').trim(),
    memo: String(r.memo ?? '').trim(),
    examples: String(r.examples ?? '').trim(),
    related: String(r.related ?? '').trim(),
  }))

  const nounRows = sheetToObjects<NounSheetRow>(wb, 'noun')
  const adjRows = sheetToObjects<AdjSheetRow>(wb, 'adjective')
  const verbRows = sheetToObjects<VerbSheetRow>(wb, 'verb')

  const nounByLemma = new Map(nounRows.map((r) => [normalizeToken(String(r.foreignLemma ?? '')), r]))
  const adjByLemma = new Map(adjRows.map((r) => [normalizeToken(String(r.foreignLemma ?? '')), r]))
  const verbByLemma = new Map(verbRows.map((r) => [normalizeToken(String(r.foreignLemma ?? '')), r]))

  const errors: Array<{ rowNumber: number; foreignLemma: string; message: string }> = []

  const entries: Entry[] = []
  const seenLemma = new Set<string>()

  for (const w of wordRows) {
    const lemmaNorm = normalizeToken(w.foreignLemma)
    if (!lemmaNorm) {
      errors.push({ rowNumber: w.rowNumber, foreignLemma: '', message: 'foreignLemma が空です。' })
      continue
    }
    if (seenLemma.has(lemmaNorm)) {
      errors.push({ rowNumber: w.rowNumber, foreignLemma: w.foreignLemma, message: 'wordシート内で foreignLemma が重複しています。' })
      continue
    }
    seenLemma.add(lemmaNorm)

    if (!w.pos) {
      errors.push({ rowNumber: w.rowNumber, foreignLemma: w.foreignLemma, message: 'pos が空です。' })
      continue
    }
    if (!w.meaningJa.trim()) {
      errors.push({ rowNumber: w.rowNumber, foreignLemma: w.foreignLemma, message: 'meaningJa が空です。' })
      continue
    }

    // 品詞ごとの必須シート行チェック
    if (w.pos === 'noun') {
      const nr = nounByLemma.get(lemmaNorm)
      if (!nr) {
        errors.push({ rowNumber: w.rowNumber, foreignLemma: w.foreignLemma, message: 'nounシートに対応行がありません。' })
      }
    }
    if (w.pos === 'verb') {
      const vr = verbByLemma.get(lemmaNorm)
      if (!vr) {
        errors.push({ rowNumber: w.rowNumber, foreignLemma: w.foreignLemma, message: 'verbシートに対応行がありません。' })
      }
    }
    if (w.pos === 'adjective' || w.pos === 'pronoun_interrogative') {
      const ar = adjByLemma.get(lemmaNorm)
      if (!ar) {
        errors.push({ rowNumber: w.rowNumber, foreignLemma: w.foreignLemma, message: 'adjectiveシートに対応行がありません。' })
      }
    }

    const now = Date.now()
    const meanings = splitCsvLike(w.meaningJa, ';').length ? splitCsvLike(w.meaningJa, ';') : splitCsvLike(w.meaningJa, ',')
    const meaningJaVariants = Array.from(new Set(meanings.map(normalizeToken))).filter(Boolean)
    const meaningJaPrimary = meaningJaVariants[0] ?? normalizeToken(w.meaningJa)

    const tags = splitCsvLike(w.tags ?? '', ',')
    const related = splitCsvLike(w.related ?? '', ';')

    // overrides 統合
    let nounGender: NounGender | undefined = undefined
    let inflectionType: InflectionType = 'none'
    const overrides: Record<string, string> = {}
    const autoForms: string[] = []

    if (w.pos === 'noun') {
      const nr = nounByLemma.get(lemmaNorm)
      if (nr) {
        nounGender = (String(nr.nounGender ?? '').trim() as NounGender) || undefined
        Object.assign(overrides, pickOverrides(nr, 'n_'))
        // nounシートが空欄なら自動生成（登録は foreignForms に反映）
        if (Object.keys(overrides).length === 0 && nounGender) {
          const a = nounAutoForms(lemmaNorm, nounGender)
          if (a) autoForms.push(...Object.values(a))
        }
      }
    } else if (w.pos === 'verb') {
      const vr = verbByLemma.get(lemmaNorm)
      if (vr) {
        inflectionType = (String(vr.inflectionType ?? '').trim() as InflectionType) || 'none'
        Object.assign(overrides, pickOverrides(vr, 'v_'))
        // verbシートが空欄なら自動生成（登録は foreignForms に反映）
        if (Object.keys(overrides).length === 0 && inflectionType !== 'none') {
          const m = verbMatrix(lemmaNorm, inflectionType)
          const a = verbAoristMatrix(lemmaNorm, inflectionType)
          const imp = verbImperativeForms(lemmaNorm, inflectionType)
          if (m) {
            for (const r of m) autoForms.push(r.pres, r.past, r.fut, r.na)
          }
          if (a) {
            for (const r of a) autoForms.push(r.aorPast, r.aorFut, r.aorNa)
          }
          if (imp) autoForms.push(imp.pres2sg, imp.pres2pl, imp.aor2sg, imp.aor2pl)
        }
      }
    } else if (w.pos === 'adjective' || w.pos === 'pronoun_interrogative') {
      const ar = adjByLemma.get(lemmaNorm)
      if (ar) {
        Object.assign(overrides, pickOverrides(ar, 'a_'))
        // adjectiveシートが空欄なら自動生成（登録は foreignForms に反映）
        if (Object.keys(overrides).length === 0) {
          const a = adjectiveAutoForms(lemmaNorm)
          if (a) autoForms.push(...Object.values(a))
        }
      }
    }

    // foreignForms は lemma + overrides 内の語形を集める（単語モード照合用）
    const overrideForms = Object.values(overrides).map((x) => normalizeToken(x ?? '')).filter(Boolean)
    const autoNorm = autoForms.map((x) => normalizeToken(x ?? '')).filter(Boolean)
    const foreignForms = Array.from(new Set([lemmaNorm, ...overrideForms, ...autoNorm]))

    entries.push({
      pos: w.pos,
      meaningJaPrimary,
      meaningJaVariants,
      tags,
      memo: w.memo?.trim() ? w.memo.trim() : '',
      nounGender,
      inflectionType: w.pos === 'verb' ? inflectionType : 'none',
      inflectionOverrides: Object.keys(overrides).length ? overrides : {},
      foreignLemma: lemmaNorm,
      foreignForms,
      examples: parseExamplePairsText(normalizeExamplesCell(w.examples ?? '')),
      related,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (errors.length) return { ok: false, errors }
  return { ok: true, entries }
}

