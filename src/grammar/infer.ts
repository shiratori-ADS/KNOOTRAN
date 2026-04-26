import type { Entry, InflectionType, NounGender } from '../db/types'
import { normalizeToken } from '../lib/normalize'
import { accentPositionFromEnd, stripGreekTonos, vowelCount } from './accent'

/** 単語帳に保存された活用タイプがあればそれを優先し、なければ見出し語＋性から推定する */
export function resolveNounInflectionType(
  entry: Pick<Entry, 'pos' | 'inflectionType' | 'nounGender' | 'inflectionOverrides'>,
  lemmaNorm: string,
): InflectionType {
  if (entry.pos !== 'noun') return 'none'
  const stored = entry.inflectionType
  if (stored && stored !== 'none' && stored.startsWith('noun_')) return stored

  // UIで型選択はしない方針でも、マトリックス上書きから -ηδες を推定できるようにする
  const lemmaRaw = normalizeToken(lemmaNorm)
  const lemmaPlain = stripGreekTonos(lemmaRaw)
  const accentPos = accentPositionFromEnd(lemmaRaw)
  const overrides = entry.inflectionOverrides
  const nomPl = normalizeToken(overrides?.n_nom_pl ?? '')
  const accPl = normalizeToken(overrides?.n_acc_pl ?? '')
  const pluralLooksEdes =
    (nomPl && stripGreekTonos(nomPl).endsWith('ηδες')) || (accPl && stripGreekTonos(accPl).endsWith('ηδες'))
  if (lemmaPlain.endsWith('ης') && pluralLooksEdes) {
    // -ηδες は -εις で一律扱い
    return accentPos === 'last' ? 'noun_masc_-ης_-εις_last' : 'noun_masc_-ης_-εις_penult'
  }

  return inferNounInflectionTypeFromLemma(lemmaNorm, entry.nounGender)
}

export function inferNounInflectionTypeFromLemma(rawLemma: string, nounGender?: NounGender): InflectionType {
  const lemmaRaw = normalizeToken(rawLemma)
  if (!lemmaRaw) return 'none'
  const lemma = stripGreekTonos(lemmaRaw)
  const accentPos = accentPositionFromEnd(lemmaRaw)
  const vCount = vowelCount(lemmaRaw)
  // 通性（男/女）は推定結果が1つに定まらないため、呼び出し側で masc/fem を別々に推定する
  if (nounGender === 'common_mf') return 'none'
  if (lemma.endsWith('μο')) return 'noun_neut_-μο'
  if (lemma.endsWith('μα')) return vCount <= 2 ? 'noun_neut_-μα_2syll' : 'noun_neut_-μα_3plus'
  if (lemma.endsWith('ος')) {
    if (nounGender === 'neut') return 'noun_2nd_neut_-ος'
    if (nounGender === 'fem') return 'noun_fem_-ος'
    if (accentPos === 'last') return 'noun_masc_-ος_last'
    if (accentPos === 'antepenult') return 'noun_masc_-ος_antepenult'
    return 'noun_masc_-ος_penult'
  }
  if (lemma.endsWith('ας')) {
    // -ίστας / -ίας は属格複数が最後アクセントになりやすい
    if (lemma.endsWith('ιστας') || lemma.endsWith('ίας') || lemma.endsWith('ιας')) return 'noun_masc_-ας_istas_ias'
    if (vCount === 2) return 'noun_masc_-ας_disyllabic'
    if (accentPos === 'antepenult') return 'noun_masc_-ας_antepenult'
    return 'noun_masc_-ας_penult'
  }
  if (lemma.endsWith('ης')) {
    if (accentPos === 'last') return 'noun_masc_-ης_last'
    return 'noun_masc_-ης_penult'
  }
  if (lemma.endsWith('ο')) return 'noun_2nd_neut_-ο'
  if (lemma.endsWith('ι')) return 'noun_neut_-ι'
  // -ί (U+03AF) は normalizeToken(NFC) 済み前提で判定できる
  if (lemmaRaw.endsWith('ί')) return 'noun_neut_-ί'
  if (lemma.endsWith('υ')) return lemma.endsWith('χτυ') ? 'noun_neut_-υ_-υα' : 'noun_neut_-υ_-ια'
  if (nounGender === 'fem' && (lemmaRaw.endsWith('ού') || lemmaRaw.endsWith('ού'))) return 'noun_fem_-ού'
  if (lemma.endsWith('η')) return nounGender === 'fem' ? 'noun_fem_-η' : 'none'
  if (lemma.endsWith('α')) {
    if (nounGender !== 'fem') return 'none'
    // -ά（最後アクセント）だけは主格単数で判別できる
    return lemmaRaw.endsWith('ά') ? 'noun_fem_-ά' : 'noun_fem_-α'
  }
  return 'none'
}

