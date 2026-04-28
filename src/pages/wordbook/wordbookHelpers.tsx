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
  { value: 'adjective', label: '形容詞' },
  { value: 'verb', label: '動詞' },
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
    case 'adjective':
      return '形容詞'
    case 'verb':
      return '動詞'
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
    case 'verb_pres_act_B1_-άω_-ησα':
      return 'Β1 : -άω（アオリスト -ησα）'
    case 'verb_pres_act_B1_-άω_-ασα':
      return 'Β1 : -άω（アオリスト -ασα）'
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
  if (!t || t === 'none') return null
  switch (t) {
    case 'verb_pres_act_-ω':
      return 'Α'
    case 'verb_pres_act_-γω_-χω_-χνω':
      return 'Α'
    case 'verb_pres_act_-πω_-φω_-βω_-εύω':
      return 'Α'
    case 'verb_pres_act_B1_-άω_-ησα':
      return 'Β1'
    case 'verb_pres_act_B1_-άω_-ασα':
      return 'Β1'
    default:
      return null
  }
}

export const verbInflectionOptions: Array<{ value: InflectionType; label: string }> = [
  { value: 'verb_pres_act_-ω', label: inflectionLabel('verb_pres_act_-ω') },
  { value: 'verb_pres_act_-γω_-χω_-χνω', label: inflectionLabel('verb_pres_act_-γω_-χω_-χνω') },
  { value: 'verb_pres_act_-πω_-φω_-βω_-εύω', label: inflectionLabel('verb_pres_act_-πω_-φω_-βω_-εύω') },
  { value: 'verb_pres_act_B1_-άω_-ησα', label: inflectionLabel('verb_pres_act_B1_-άω_-ησα') },
  { value: 'verb_pres_act_B1_-άω_-ασα', label: inflectionLabel('verb_pres_act_B1_-άω_-ασα') },
]
export { nounAutoForms } from '../../grammar/noun'

export function adjectiveMatrix(lemmaNorm: string) {
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  // 最小対応:
  // - 男性形 -ος → 女性形 -η / 中性形 -ο
  // - 男性形 -ύς → 女性形 -ιά / 中性形 -ύ（提示されたパターン）

  if (lemmaPlain.endsWith('ος')) {
    const stem = lemmaNorm.slice(0, -2) // トノス保持
    return {
      headers: ['男', '女', '中'],
      rows: [
        { label: '単数 ～は', cells: [`${stem}ος`, `${stem}η`, `${stem}ο`] },
        { label: '単数 ～の', cells: [`${stem}ου`, `${stem}ης`, `${stem}ου`] },
        { label: '単数 ～を', cells: [`${stem}ο`, `${stem}η`, `${stem}ο`] },
        { label: '複数 ～は', cells: [`${stem}οι`, `${stem}ες`, `${stem}α`] },
        { label: '複数 ～の', cells: [`${stem}ων`, `${stem}ων`, `${stem}ων`] },
        { label: '複数 ～を', cells: [`${stem}ους`, `${stem}ες`, `${stem}α`] },
      ],
    }
  }

  // -ύς（例：βαθύς）
  if (lemmaPlain.endsWith('υς')) {
    // 見出しの末尾2文字（ύς/υς）を落として語幹にする
    const stem = lemmaNorm.slice(0, -2)
    return {
      headers: ['男', '女', '中'],
      rows: [
        { label: '単数 ～は', cells: [`${stem}ύς`, `${stem}ιά`, `${stem}ύ`] },
        { label: '単数 ～の', cells: [`${stem}ιού`, `${stem}ιάς`, `${stem}ιού`] },
        { label: '単数 ～を', cells: [`${stem}ύ`, `${stem}ιά`, `${stem}ύ`] },
        { label: '複数 ～は', cells: [`${stem}ιοί`, `${stem}ιές`, `${stem}ιά`] },
        { label: '複数 ～の', cells: [`${stem}ιών`, `${stem}ιών`, `${stem}ιών`] },
        { label: '複数 ～を', cells: [`${stem}ιούς`, `${stem}ιές`, `${stem}ιά`] },
      ],
    }
  }

  return null
}

export function adjectiveAutoForms(lemmaNorm: string) {
  const m = adjectiveMatrix(lemmaNorm)
  if (!m) return null
  const rows = m.rows
  // rows: [sg nom/gen/acc, pl nom/gen/acc], headers: ['男','女','中']
  const sgNom = rows[0]?.cells ?? []
  const sgGen = rows[1]?.cells ?? []
  const sgAcc = rows[2]?.cells ?? []
  const plNom = rows[3]?.cells ?? []
  const plGen = rows[4]?.cells ?? []
  const plAcc = rows[5]?.cells ?? []
  return {
    a_m_nom_sg: sgNom[0] ?? '',
    a_f_nom_sg: sgNom[1] ?? '',
    a_n_nom_sg: sgNom[2] ?? '',
    a_m_gen_sg: sgGen[0] ?? '',
    a_f_gen_sg: sgGen[1] ?? '',
    a_n_gen_sg: sgGen[2] ?? '',
    a_m_acc_sg: sgAcc[0] ?? '',
    a_f_acc_sg: sgAcc[1] ?? '',
    a_n_acc_sg: sgAcc[2] ?? '',
    a_m_nom_pl: plNom[0] ?? '',
    a_f_nom_pl: plNom[1] ?? '',
    a_n_nom_pl: plNom[2] ?? '',
    a_m_gen_pl: plGen[0] ?? '',
    a_f_gen_pl: plGen[1] ?? '',
    a_n_gen_pl: plGen[2] ?? '',
    a_m_acc_pl: plAcc[0] ?? '',
    a_f_acc_pl: plAcc[1] ?? '',
    a_n_acc_pl: plAcc[2] ?? '',
  } as const
}

export { nounMatrix } from '../../grammar/noun'

export { endingsByCell, resolveNounTypeForMatrix } from '../../grammar/noun'

