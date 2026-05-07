import type { Entry, InflectionType, NounGender, PartOfSpeech } from '../../db/types'
import {
  stripGreekTonos,
} from '../../grammar/accent'

export { verbAoristMatrix, verbImperativeForms, verbMatrix } from '../../grammar/verb'

export function renderEndingRed(form: string, endingsPlain: string[]) {
  const s = form ?? ''
  if (!s.trim()) return s
  const parts = s.split(/\s+/g)
  const last = parts[parts.length - 1] ?? ''
  const lastPlain = stripGreekTonos(last)
  const sorted = [...endingsPlain].filter(Boolean).sort((a, b) => b.length - a.length)
  const hit = sorted.find((e) => lastPlain.endsWith(e) && lastPlain.length > e.length)
  if (!hit) return s
  const base = last.slice(0, last.length - hit.length)
  const suffix = last.slice(last.length - hit.length)
  const head = parts.slice(0, -1).join(' ')
  return (
    <>
      {head ? `${head} ` : null}
      {base}
      <span className="ending">{suffix}</span>
    </>
  )
}

export function displayForm(s?: string) {
  return (s ?? '').normalize('NFC')
}

export const posOptions: Array<{ value: PartOfSpeech; label: string }> = [
  { value: 'noun', label: '名詞' },
  { value: 'pronoun_personal', label: '人称代名詞' },
  { value: 'pronoun_interrogative', label: '疑問詞' },
  { value: 'adjective', label: '形容詞' },
  { value: 'verb', label: '動詞' },
  { value: 'preposition', label: '前置詞' },
  { value: 'conjunction', label: '接続詞' },
  { value: 'adverb', label: '副詞' },
  { value: 'other', label: 'その他' },
]

export const nounGenderOptions: Array<{ value: NounGender; label: string }> = [
  { value: 'masc', label: '男性' },
  { value: 'fem', label: '女性' },
  { value: 'common_mf', label: '男性/女性' },
  { value: 'neut', label: '中性' },
]

export function splitLines(s: string): string[] {
  return s
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function genderLabel(g?: NounGender) {
  switch (g) {
    case 'masc':
      return '男'
    case 'fem':
      return '女'
    case 'common_mf':
      return '男/女'
    case 'neut':
      return '中'
    default:
      return '—'
  }
}

export function posLabel(pos: Entry['pos']) {
  switch (pos) {
    case 'noun':
      return '名詞'
    case 'pronoun_personal':
      return '人称代名詞'
    case 'pronoun_interrogative':
      return '疑問詞'
    case 'adjective':
      return '形容詞'
    case 'verb':
      return '動詞'
    case 'preposition':
      return '前置詞'
    case 'conjunction':
      return '接続詞'
    case 'adverb':
      return '副詞'
    default:
      return 'その他'
  }
}

export function inflectionLabel(t?: InflectionType) {
  switch (t) {
    case 'verb_pres_act_-ω':
      return 'Α : -νω/-ζω'
    case 'verb_pres_act_-γω_-χω_-χνω':
      return 'Α : -γω/-χω/-χνω'
    case 'verb_pres_act_-πω_-φω_-βω_-εύω':
      return 'Α : -πω/-φω/-βω/-εύω'
    case 'verb_pres_act_AB':
      return 'ΑΒ : -ω（αόρ. 不規則）'
    case 'verb_pres_act_B1_-άω_-ησα':
      return 'Β1 : -άω（αόρ. -ησα）'
    case 'verb_pres_act_B1_-άω_-εσα':
      return 'Β1 : -άω（αόρ. -εσα）'
    case 'verb_pres_act_B1_-άω_-ασα':
      return 'Β1 : -άω（αόρ. -ασα）'
    case 'verb_pres_act_B2_-ώ_-ησα':
      return 'Β2 : -ώ（αόρ. -ησα）'
    case 'verb_pres_act_B2_-ώ_-ασα':
      return 'Β2 : -ώ（αόρ. -ασα）'
    case 'verb_pres_act_B2_-ώ_-εσα':
      return 'Β2 : -ώ（αόρ. -εσα）'
    case 'verb_pres_mid_Γ1_-ομαι':
      return 'Γ1 : -ομαι'
    case 'verb_pres_mid_Γ2_-άμαι':
      return 'Γ2 : -άμαι'
    case 'noun_masc_-ος_last':
    case 'noun_masc_-ος_penult':
    case 'noun_masc_-ος_antepenult':
      return '名詞（男性・-ος,-οι）'
    case 'noun_2nd_neut_-ο':
      return '名詞（第2変化・中性・-ο）'
    case 'noun_2nd_neut_-ος':
      return '名詞（第2変化・中性・見出し-ος）'
    case 'noun_fem_-η':
      return '名詞（女性・-η）'
    case 'noun_fem_-α':
      return '名詞（女性・-α）'
    case 'noun_fem_-ά':
      return '名詞（女性・-ά）'
    case 'noun_fem_-ος':
      return '名詞（女性・-ος,-οι）'
    case 'noun_fem_-ού':
      return '名詞（女性・-ού）'
    case 'noun_masc_-ας_penult':
    case 'noun_masc_-ας_antepenult':
    case 'noun_masc_-ας_disyllabic':
    case 'noun_masc_-ας_istas_ias':
      return '名詞（男性・-ας,-ες）'
    case 'noun_masc_-ης_last':
    case 'noun_masc_-ης_penult':
      return '名詞（男性・-ης,-ες）'
    case 'noun_masc_-ης_-εις_last':
    case 'noun_masc_-ης_-εις_penult':
      return '名詞（男性・-ης,-εις）'
    case 'noun_neut_-ι':
      return '名詞（中性・-ι）'
    case 'noun_neut_-ί':
      return '名詞（中性・-ί,-ιά）'
    case 'noun_neut_-υ_-ια':
      return '名詞（中性・-υ,-ια）'
    case 'noun_neut_-υ_-υα':
      return '名詞（中性・-υ,-υα）'
    case 'noun_neut_-μα_2syll':
      return '名詞（中性・-μα,-ματα：2音節）'
    case 'noun_neut_-μα_3plus':
      return '名詞（中性・-μα,-ματα：3音節以上）'
    case 'noun_neut_-μο':
      return '名詞（中性・-μο,-ματα）'
    default:
      return '未設定'
  }
}

export function verbInflectionShortLabel(t?: InflectionType): string | null {
  if (!t) return null
  switch (t) {
    case 'none':
      return '他'
    case 'verb_pres_act_-ω':
      return 'Α'
    case 'verb_pres_act_-γω_-χω_-χνω':
      return 'Α'
    case 'verb_pres_act_-πω_-φω_-βω_-εύω':
      return 'Α'
    case 'verb_pres_act_AB':
      return 'ΑΒ'
    case 'verb_pres_act_B1_-άω_-ησα':
      return 'Β1'
    case 'verb_pres_act_B1_-άω_-εσα':
      return 'Β1'
    case 'verb_pres_act_B1_-άω_-ασα':
      return 'Β1'
    case 'verb_pres_act_B2_-ώ_-ησα':
      return 'Β2'
    case 'verb_pres_act_B2_-ώ_-ασα':
      return 'Β2'
    case 'verb_pres_act_B2_-ώ_-εσα':
      return 'Β2'
    case 'verb_pres_mid_Γ1_-ομαι':
      return 'Γ1'
    case 'verb_pres_mid_Γ2_-άμαι':
      return 'Γ2'
    default:
      return null
  }
}

export const verbInflectionOptions: Array<{ value: InflectionType; label: string }> = [
  { value: 'none', label: 'その他' },
  { value: 'verb_pres_act_-ω', label: inflectionLabel('verb_pres_act_-ω') },
  { value: 'verb_pres_act_-γω_-χω_-χνω', label: inflectionLabel('verb_pres_act_-γω_-χω_-χνω') },
  { value: 'verb_pres_act_-πω_-φω_-βω_-εύω', label: inflectionLabel('verb_pres_act_-πω_-φω_-βω_-εύω') },
  { value: 'verb_pres_act_AB', label: inflectionLabel('verb_pres_act_AB') },
  { value: 'verb_pres_act_B1_-άω_-ησα', label: inflectionLabel('verb_pres_act_B1_-άω_-ησα') },
  { value: 'verb_pres_act_B1_-άω_-εσα', label: inflectionLabel('verb_pres_act_B1_-άω_-εσα') },
  { value: 'verb_pres_act_B1_-άω_-ασα', label: inflectionLabel('verb_pres_act_B1_-άω_-ασα') },
  { value: 'verb_pres_act_B2_-ώ_-ησα', label: inflectionLabel('verb_pres_act_B2_-ώ_-ησα') },
  { value: 'verb_pres_act_B2_-ώ_-ασα', label: inflectionLabel('verb_pres_act_B2_-ώ_-ασα') },
  { value: 'verb_pres_act_B2_-ώ_-εσα', label: inflectionLabel('verb_pres_act_B2_-ώ_-εσα') },
  { value: 'verb_pres_mid_Γ1_-ομαι', label: inflectionLabel('verb_pres_mid_Γ1_-ομαι') },
  { value: 'verb_pres_mid_Γ2_-άμαι', label: inflectionLabel('verb_pres_mid_Γ2_-άμαι') },
]
export { nounAutoForms } from '../../grammar/noun'
export { adjectiveMatrix, adjectiveAutoForms } from '../../grammar/adjective'

export { nounMatrix } from '../../grammar/noun'

export { endingsByCell, resolveNounTypeForMatrix } from '../../grammar/noun'

