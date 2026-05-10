import type { Entry, PersonalPronounCol, PersonalPronounInflectionKey, PersonalPronounRow } from '../db/types'
import { normalizeToken } from '../lib/normalize'
import { stripGreekTonos } from './accent'

/** マトリックスの行順（表示・編集共通） */
export const PP_ROWS: readonly PersonalPronounRow[] = [
  '1sg',
  '2sg',
  '3m_sg',
  '3f_sg',
  '3n_sg',
  '1pl',
  '2pl',
  '3m_pl',
  '3f_pl',
  '3n_pl',
] as const

/** マトリックスの列順 */
export const PP_COLS: readonly PersonalPronounCol[] = ['wa', 'no_kyo', 'no_jaku', 'wo_kyo', 'wo_jaku'] as const

export const PP_ROW_LABELS: Record<PersonalPronounRow, string> = {
  '1sg': '一単',
  '2sg': '二単',
  '3m_sg': '三男単',
  '3f_sg': '三女単',
  '3n_sg': '三中単',
  '1pl': '一複',
  '2pl': '二複',
  '3m_pl': '三男複',
  '3f_pl': '三女複',
  '3n_pl': '三中複',
}

export const PP_COL_LABELS: Record<PersonalPronounCol, string> = {
  wa: '～は',
  no_kyo: '～の強',
  no_jaku: '～の弱',
  wo_kyo: '～を強',
  wo_jaku: '～を弱',
}

/** 現代ギリシャ語の人称代名詞（強調形／クライトン対応の標準表） */
const DEFAULT_MATRIX: Record<PersonalPronounRow, Record<PersonalPronounCol, string>> = {
  '1sg': {
    wa: 'εγώ',
    no_kyo: 'εμένα',
    no_jaku: 'μου',
    wo_kyo: 'εμένα',
    wo_jaku: 'με',
  },
  '2sg': {
    wa: 'εσύ',
    no_kyo: 'εσένα',
    no_jaku: 'σου',
    wo_kyo: 'εσένα',
    wo_jaku: 'σε',
  },
  '3m_sg': {
    wa: 'αυτός',
    no_kyo: 'αυτού',
    no_jaku: 'του',
    wo_kyo: 'αυτόν',
    wo_jaku: 'τον',
  },
  '3f_sg': {
    wa: 'αυτή',
    no_kyo: 'αυτής',
    no_jaku: 'της',
    wo_kyo: 'αυτήν',
    wo_jaku: 'την',
  },
  '3n_sg': {
    wa: 'αυτό',
    no_kyo: 'αυτού',
    no_jaku: 'του',
    wo_kyo: 'αυτό',
    wo_jaku: 'το',
  },
  '1pl': {
    wa: 'εμείς',
    no_kyo: 'εμάς',
    no_jaku: 'μας',
    wo_kyo: 'εμάς',
    wo_jaku: 'μας',
  },
  '2pl': {
    wa: 'εσείς',
    no_kyo: 'εσάς',
    no_jaku: 'σας',
    wo_kyo: 'εσάς',
    wo_jaku: 'σας',
  },
  '3m_pl': {
    wa: 'αυτοί',
    no_kyo: 'αυτών',
    no_jaku: 'τους',
    wo_kyo: 'αυτούς',
    wo_jaku: 'τους',
  },
  '3f_pl': {
    wa: 'αυτές',
    no_kyo: 'αυτών',
    no_jaku: 'τους',
    wo_kyo: 'αυτές',
    wo_jaku: 'τις',
  },
  '3n_pl': {
    wa: 'αυτά',
    no_kyo: 'αυτών',
    no_jaku: 'τους',
    wo_kyo: 'αυτά',
    wo_jaku: 'τα',
  },
}

export function ppKey(row: PersonalPronounRow, col: PersonalPronounCol): PersonalPronounInflectionKey {
  return `pp_${row}_${col}`
}

export function personalPronounAutoForms(): Record<PersonalPronounInflectionKey, string> {
  const out = {} as Record<PersonalPronounInflectionKey, string>
  for (const row of PP_ROWS) {
    for (const col of PP_COLS) {
      const k = ppKey(row, col)
      out[k] = DEFAULT_MATRIX[row][col]
    }
  }
  return out
}

function withPlainNorms(forms: string[]): string[] {
  return Array.from(new Set(forms.flatMap((f) => [f, stripGreekTonos(f)]))).filter(Boolean)
}

/** 照合用：自動表＋上書きから語形集合（正規化済みトークン） */
export function personalPronounFormsForMatch(entry: Entry): string[] {
  const o = entry.inflectionOverrides ?? {}
  const auto = personalPronounAutoForms()
  const raw: string[] = []
  for (const row of PP_ROWS) {
    for (const col of PP_COLS) {
      const k = ppKey(row, col)
      const v = ((o as Record<string, string>)[k] as string | undefined)?.trim() || auto[k]
      if (v) raw.push(normalizeToken(v))
    }
  }
  return withPlainNorms(raw)
}

export function personalPronounMatchesToken(tokenNorm: string, entry: Entry): boolean {
  return personalPronounFormsForMatch(entry).includes(tokenNorm)
}
