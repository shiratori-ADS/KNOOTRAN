import type { Entry, NounGender } from '../db/types'
import { stripGreekTonos } from './accent'
import { adjectiveFormsForMatch } from './adjective'
import { inferNounInflectionTypeFromLemma, resolveNounInflectionType } from './infer'
import { nounAutoForms } from './noun'
import { collectNounTriGenderForms } from './nounTriGender'
import { personalPronounFormsForMatch } from './personalPronoun'
import { verbAoristMatrix, verbImperativeForms, verbMatrix } from './verb'
import { normalizeToken } from '../lib/normalize'

/** 単語帳検索・ノートリンク用：見出し・別形・上書き・自動生成活用形 */
export function collectEntryForeignMatchForms(e: Entry): string[] {
  const lemmaNorm = normalizeToken(e.foreignLemma ?? '')
  const raw: string[] = [e.foreignLemma ?? '', ...(e.foreignForms ?? []), ...Object.values(e.inflectionOverrides ?? {})]

  if (lemmaNorm) {
    if (e.pos === 'verb') {
      const m = verbMatrix(lemmaNorm, e.inflectionType)
      const a = verbAoristMatrix(lemmaNorm, e.inflectionType)
      const imp = verbImperativeForms(lemmaNorm, e.inflectionType)
      if (m) raw.push(...m.flatMap((r) => [r.pres, r.past, r.fut, r.na]))
      if (a) raw.push(...a.flatMap((r) => [r.pres, r.aorPast, r.aorFut, r.aorNa]))
      if (imp) raw.push(imp.pres2sg, imp.pres2pl, imp.aor2sg, imp.aor2pl)
    }

    if (e.pos === 'noun') {
      if (e.nounGender === 'tri_gender') {
        raw.push(...collectNounTriGenderForms(e.inflectionOverrides))
      } else {
        const genders: NounGender[] =
          e.nounGender === 'common_mf' ? ['masc', 'fem'] : e.nounGender ? [e.nounGender] : []
        for (const gender of genders) {
          const type =
            e.nounGender === 'common_mf'
              ? inferNounInflectionTypeFromLemma(lemmaNorm, gender)
              : resolveNounInflectionType(e, lemmaNorm)
          const forms = nounAutoForms(lemmaNorm, gender, type)
          if (forms) raw.push(...Object.values(forms))
        }
      }
    }

    if (e.pos === 'adjective' || e.pos === 'pronoun_interrogative') {
      raw.push(...adjectiveFormsForMatch(e, lemmaNorm))
    }

    if (e.pos === 'pronoun_personal') {
      raw.push(...personalPronounFormsForMatch(e))
    }
  }

  return Array.from(new Set(raw.map((x) => normalizeToken(x ?? '')).filter(Boolean)))
}

/** 正規化トークンが活用形を含め完全一致するか（トノス差は吸収） */
export function entryHasForeignFormExact(e: Entry, tokenNorm: string): boolean {
  if (!tokenNorm) return false
  const plain = stripGreekTonos(tokenNorm)
  return collectEntryForeignMatchForms(e).some(
    (x) => x === tokenNorm || stripGreekTonos(x) === plain,
  )
}

/** 部分一致（トノス差は吸収）。意味は含まない */
export function entryMatchesForeignQuery(e: Entry, queryNorm: string): boolean {
  if (!queryNorm) return true
  const queryPlain = stripGreekTonos(queryNorm)
  return collectEntryForeignMatchForms(e).some(
    (x) => x.includes(queryNorm) || stripGreekTonos(x).includes(queryPlain),
  )
}
