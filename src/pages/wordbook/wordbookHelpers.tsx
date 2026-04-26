import type { Entry, InflectionType, NounGender, PartOfSpeech } from '../../db/types'
import { inferNounInflectionTypeFromLemma, resolveNounInflectionType } from '../../grammar/infer'
import {
  addTonosOnAntepenultVowel,
  addTonosOnLastVowel,
  addTonosOnNthFromEndVowel,
  addTonosOnPenultVowel,
  applyAccentFrom,
  stripGreekTonos,
} from '../../grammar/accent'

function countGreekVowelUnits(s: string): number {
  const plain = stripGreekTonos(s)
  const vowels = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω'])
  const digraphs = new Set(['αι', 'ει', 'οι', 'ου', 'αυ', 'ευ', 'ηυ'])
  let c = 0
  for (let i = 0; i < plain.length; i++) {
    const two = plain.slice(i, i + 2)
    if (two.length === 2 && digraphs.has(two)) {
      c++
      i++
      continue
    }
    if (vowels.has(plain[i] ?? '')) c++
  }
  return c
}

function addTonosOnNthFromEndVowelUnit(word: string, n: 1 | 2 | 3): string {
  const plain = stripGreekTonos(word)
  if (!plain) return word

  const vowels = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω'])
  const digraphs = new Set(['αι', 'ει', 'οι', 'ου', 'αυ', 'ευ', 'ηυ'])
  const accentMap: Record<string, string> = { α: 'ά', ε: 'έ', η: 'ή', ι: 'ί', ο: 'ό', υ: 'ύ', ω: 'ώ' }

  const targets: number[] = []
  for (let i = 0; i < plain.length; i++) {
    const two = plain.slice(i, i + 2)
    if (two.length === 2 && digraphs.has(two)) {
      // 二重母音は後ろ側の母音にトノス（例: ου→ού, ευ→εύ）
      targets.push(i + 1)
      i++
      continue
    }
    if (vowels.has(plain[i] ?? '')) targets.push(i)
  }
  if (targets.length < n) return word

  const idx = targets[targets.length - n]!
  const chars = [...plain]
  const ch = chars[idx] ?? ''
  const accented = accentMap[ch]
  if (!accented) return word
  chars[idx] = accented
  return chars.join('')
}

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
    default:
      return null
  }
}

export const verbInflectionOptions: Array<{ value: InflectionType; label: string }> = [
  { value: 'verb_pres_act_-ω', label: inflectionLabel('verb_pres_act_-ω') },
  { value: 'verb_pres_act_-γω_-χω_-χνω', label: inflectionLabel('verb_pres_act_-γω_-χω_-χνω') },
  { value: 'verb_pres_act_-πω_-φω_-βω_-εύω', label: inflectionLabel('verb_pres_act_-πω_-φω_-βω_-εύω') },
]

export function verbMatrix(lemmaNorm: string, t?: InflectionType) {
  if (
    t !== 'verb_pres_act_-ω' &&
    t !== 'verb_pres_act_-γω_-χω_-χνω' &&
    t !== 'verb_pres_act_-πω_-φω_-βω_-εύω'
  )
    return null
  if (!lemmaNorm.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)
  const withAugment = (s: string) => {
    // 最小ヒューリスティック：
    // - 語頭が母音なら増音しない
    // - それ以外でも、母音数が多い（>=3）場合は増音しない（例: διαλέγω → διάλεξα）
    // - 母音数が少ない場合は増音として έ を付ける（厳密ではない）
    const head = stripGreekTonos(s)[0] ?? ''
    const vowels = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω'])
    if (vowels.has(head)) return s
    if (countGreekVowelUnits(s) >= 3) return s
    return `έ${s}`
  }
  // 最小: 現在は既存の -ω 活用。過去/未来はヒューリスティックで自動生成（例外は上書きで対応）
  const pres = {
    '1sg': `${stem}ω`,
    '2sg': `${stem}εις`,
    '3sg': `${stem}ει`,
    '1pl': `${stem}ουμε`,
    '2pl': `${stem}ετε`,
    '3pl': `${stem}ουν`,
  } as const
  const pastStem = (() => {
    // とりあえず「増音」扱い（厳密ではない）
    return withAugment(stem)
  })()
  const past = {
    '1sg': addTonosOnAntepenultVowel(`${pastStem}α`),
    '2sg': addTonosOnAntepenultVowel(`${pastStem}ες`),
    '3sg': addTonosOnAntepenultVowel(`${pastStem}ε`),
    '1pl': addTonosOnAntepenultVowel(`${pastStem}αμε`),
    '2pl': addTonosOnAntepenultVowel(`${pastStem}ατε`),
    '3pl': addTonosOnAntepenultVowel(`${pastStem}αν`),
  } as const
  const fut = {
    // 未来は周辺的（θα + 現在）。1セル内に表示するためスペース込み。
    '1sg': `θα ${pres['1sg']}`,
    '2sg': `θα ${pres['2sg']}`,
    '3sg': `θα ${pres['3sg']}`,
    '1pl': `θα ${pres['1pl']}`,
    '2pl': `θα ${pres['2pl']}`,
    '3pl': `θα ${pres['3pl']}`,
  } as const
  const na = {
    '1sg': fut['1sg'].replace(/^θα\s+/, 'να '),
    '2sg': fut['2sg'].replace(/^θα\s+/, 'να '),
    '3sg': fut['3sg'].replace(/^θα\s+/, 'να '),
    '1pl': fut['1pl'].replace(/^θα\s+/, 'να '),
    '2pl': fut['2pl'].replace(/^θα\s+/, 'να '),
    '3pl': fut['3pl'].replace(/^θα\s+/, 'να '),
  } as const

  return [
    { person: '1sg' as const, label: '一単', pres: pres['1sg'], past: past['1sg'], fut: fut['1sg'], na: na['1sg'] },
    { person: '2sg' as const, label: '二単', pres: pres['2sg'], past: past['2sg'], fut: fut['2sg'], na: na['2sg'] },
    { person: '3sg' as const, label: '三単', pres: pres['3sg'], past: past['3sg'], fut: fut['3sg'], na: na['3sg'] },
    { person: '1pl' as const, label: '一複', pres: pres['1pl'], past: past['1pl'], fut: fut['1pl'], na: na['1pl'] },
    { person: '2pl' as const, label: '二複', pres: pres['2pl'], past: past['2pl'], fut: fut['2pl'], na: na['2pl'] },
    { person: '3pl' as const, label: '三複', pres: pres['3pl'], past: past['3pl'], fut: fut['3pl'], na: na['3pl'] },
  ]
}

export function verbAoristMatrix(lemmaNorm: string, t?: InflectionType) {
  if (
    t !== 'verb_pres_act_-ω' &&
    t !== 'verb_pres_act_-γω_-χω_-χνω' &&
    t !== 'verb_pres_act_-πω_-φω_-βω_-εύω'
  )
    return null
  if (!lemmaNorm.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)
  const withAugment = (s: string) => {
    const head = stripGreekTonos(s)[0] ?? ''
    const vowels = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω'])
    if (vowels.has(head)) return s
    if (countGreekVowelUnits(s) >= 3) return s
    return `έ${s}`
  }
  // アオリスト用の語幹（最小ルール）
  // - ...ζω の場合: ζ が σ に変化（= ζ を落として σ 系語尾を付ける）
  // - ...νω の場合も同様に ν を落として σ 系語尾を付ける（ユーザー要望：-ζω と同じ扱い）
  const aorStem = (() => {
    if (t === 'verb_pres_act_-γω_-χω_-χνω') {
      // 最小: -γω/-χω/-χνω は ξ アオリスト扱い（例: τρέχω→έτρεξα, δείχνω→έδειξα）
      if (stem.endsWith('χν')) return `${stem.slice(0, -2)}ξ`
      if (stem.endsWith('χ') || stem.endsWith('γ')) return `${stem.slice(0, -1)}ξ`
      return stem
    }
    if (t === 'verb_pres_act_-πω_-φω_-βω_-εύω') {
      // 最小: π/β/φ は ψ アオリスト扱い（例: γράφω→έγραψα）
      // -εύω は「…ευ」→「…εψ」扱い（例: χορεύω→χόρεψα）
      const plainStem = stripGreekTonos(stem)
      if (plainStem.endsWith('ευ')) return `${stem.slice(0, -2)}εψ`
      if (plainStem.endsWith('π') || plainStem.endsWith('β') || plainStem.endsWith('φ')) return `${stem.slice(0, -1)}ψ`
      return stem
    }
    return stem.endsWith('ζ') || stem.endsWith('ν') ? stem.slice(0, -1) : stem
  })()

  const pres = {
    '1sg': `${stem}ω`,
    '2sg': `${stem}εις`,
    '3sg': `${stem}ει`,
    '1pl': `${stem}ουμε`,
    '2pl': `${stem}ετε`,
    '3pl': `${stem}ουν`,
  } as const

  const aorPastStem = (() => {
    // 最小: アオリスト過去の増音（厳密ではない）
    return withAugment(aorStem)
  })()
  const aorPast =
    (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
    (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
      ? ({
          '1sg': addTonosOnAntepenultVowel(`${aorPastStem}α`),
          '2sg': addTonosOnAntepenultVowel(`${aorPastStem}ες`),
          '3sg': addTonosOnAntepenultVowel(`${aorPastStem}ε`),
          '1pl': addTonosOnAntepenultVowel(`${aorPastStem}αμε`),
          '2pl': addTonosOnAntepenultVowel(`${aorPastStem}ατε`),
          '3pl': addTonosOnAntepenultVowel(`${aorPastStem}αν`),
        } as const)
      : ({
          '1sg': addTonosOnAntepenultVowel(`${aorPastStem}σα`),
          '2sg': addTonosOnAntepenultVowel(`${aorPastStem}σες`),
          '3sg': addTonosOnAntepenultVowel(`${aorPastStem}σε`),
          '1pl': addTonosOnAntepenultVowel(`${aorPastStem}σαμε`),
          '2pl': addTonosOnAntepenultVowel(`${aorPastStem}σατε`),
          '3pl': addTonosOnAntepenultVowel(`${aorPastStem}σαν`),
        } as const)

  const aorFutVerb = {
    // 最小: アオリスト未来（=単純未来）の語幹 + σω 系（厳密ではない）
    '1sg':
      (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
      (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
        ? `${aorStem}ω`
        : `${aorStem}σω`,
    '2sg':
      (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
      (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
        ? `${aorStem}εις`
        : `${aorStem}σεις`,
    '3sg':
      (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
      (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
        ? `${aorStem}ει`
        : `${aorStem}σει`,
    '1pl':
      (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
      (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
        ? `${aorStem}ουμε`
        : `${aorStem}σουμε`,
    '2pl':
      (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
      (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
        ? `${aorStem}ετε`
        : `${aorStem}σετε`,
    '3pl':
      (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
      (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))
        ? `${aorStem}ουν`
        : `${aorStem}σουν`,
  } as const
  const aorFutVerbAccented =
    t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && stripGreekTonos(aorStem).endsWith('ψ')
      ? ({
          '1sg': addTonosOnPenultVowel(aorFutVerb['1sg']),
          '2sg': addTonosOnPenultVowel(aorFutVerb['2sg']),
          '3sg': addTonosOnPenultVowel(aorFutVerb['3sg']),
          '1pl': addTonosOnPenultVowel(aorFutVerb['1pl']),
          '2pl': addTonosOnPenultVowel(aorFutVerb['2pl']),
          '3pl': addTonosOnPenultVowel(aorFutVerb['3pl']),
        } as const)
      : aorFutVerb
  const aorFut = {
    '1sg': `θα ${aorFutVerbAccented['1sg']}`,
    '2sg': `θα ${aorFutVerbAccented['2sg']}`,
    '3sg': `θα ${aorFutVerbAccented['3sg']}`,
    '1pl': `θα ${aorFutVerbAccented['1pl']}`,
    '2pl': `θα ${aorFutVerbAccented['2pl']}`,
    '3pl': `θα ${aorFutVerbAccented['3pl']}`,
  } as const
  const aorNa = {
    '1sg': aorFut['1sg'].replace(/^θα\s+/, 'να '),
    '2sg': aorFut['2sg'].replace(/^θα\s+/, 'να '),
    '3sg': aorFut['3sg'].replace(/^θα\s+/, 'να '),
    '1pl': aorFut['1pl'].replace(/^θα\s+/, 'να '),
    '2pl': aorFut['2pl'].replace(/^θα\s+/, 'να '),
    '3pl': aorFut['3pl'].replace(/^θα\s+/, 'να '),
  } as const

  return [
    { person: '1sg' as const, label: '一単', pres: pres['1sg'], aorPast: aorPast['1sg'], aorFut: aorFut['1sg'], aorNa: aorNa['1sg'] },
    { person: '2sg' as const, label: '二単', pres: pres['2sg'], aorPast: aorPast['2sg'], aorFut: aorFut['2sg'], aorNa: aorNa['2sg'] },
    { person: '3sg' as const, label: '三単', pres: pres['3sg'], aorPast: aorPast['3sg'], aorFut: aorFut['3sg'], aorNa: aorNa['3sg'] },
    { person: '1pl' as const, label: '一複', pres: pres['1pl'], aorPast: aorPast['1pl'], aorFut: aorFut['1pl'], aorNa: aorNa['1pl'] },
    { person: '2pl' as const, label: '二複', pres: pres['2pl'], aorPast: aorPast['2pl'], aorFut: aorFut['2pl'], aorNa: aorNa['2pl'] },
    { person: '3pl' as const, label: '三複', pres: pres['3pl'], aorPast: aorPast['3pl'], aorFut: aorFut['3pl'], aorNa: aorNa['3pl'] },
  ]
}

export function verbImperativeForms(lemmaNorm: string, t?: InflectionType) {
  if (
    t !== 'verb_pres_act_-ω' &&
    t !== 'verb_pres_act_-γω_-χω_-χνω' &&
    t !== 'verb_pres_act_-πω_-φω_-βω_-εύω'
  )
    return null
  if (!lemmaNorm.endsWith('ω')) return null
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  const stemPlain = lemmaPlain.slice(0, -1)
  const accentNthForImp2sg = (plainForm: string) => (countGreekVowelUnits(plainForm) <= 2 ? 2 : 3)

  const pres2sgPlain = `${stemPlain}ε`
  const pres2plPlain = `${stemPlain}ετε`

  // 命令形（2sg）は「母音ユニット数」で位置決定（εύ/ου などは1つとして数える）
  const pres2sg = addTonosOnNthFromEndVowelUnit(pres2sgPlain, accentNthForImp2sg(pres2sgPlain))
  // 命令形の複数（2pl）は「後ろから2番目」にトノス
  const pres2pl = addTonosOnNthFromEndVowelUnit(pres2plPlain, 2)

  const a = verbAoristMatrix(lemmaNorm, t)
  const model = a?.find((r) => r.person === '1sg')?.aorPast ?? ''
  void model

  const aorStemPlain = (() => {
    if (t === 'verb_pres_act_-γω_-χω_-χνω') {
      const s = stripGreekTonos(lemmaNorm).slice(0, -1)
      if (s.endsWith('χν')) return `${s.slice(0, -2)}ξ`
      if (s.endsWith('χ') || s.endsWith('γ')) return `${s.slice(0, -1)}ξ`
      return s
    }
    if (t === 'verb_pres_act_-πω_-φω_-βω_-εύω') {
      const s = stripGreekTonos(lemmaNorm).slice(0, -1)
      if (s.endsWith('ευ')) return `${s.slice(0, -2)}εψ`
      if (s.endsWith('π') || s.endsWith('β') || s.endsWith('φ')) return `${s.slice(0, -1)}ψ`
      return s
    }
    const s = stripGreekTonos(lemmaNorm).slice(0, -1)
    return s.endsWith('ζ') || s.endsWith('ν') ? s.slice(0, -1) : s
  })()

  const aor2sgPlain = aorStemPlain.endsWith('ξ') || aorStemPlain.endsWith('ψ') ? `${aorStemPlain}ε` : `${aorStemPlain}σε`
  const aor2plPlain = aorStemPlain.endsWith('ξ') || aorStemPlain.endsWith('ψ') ? `${aorStemPlain}τε` : `${aorStemPlain}στε`

  const aor2sg = addTonosOnNthFromEndVowelUnit(aor2sgPlain, accentNthForImp2sg(aor2sgPlain))
  const aor2pl = addTonosOnNthFromEndVowelUnit(aor2plPlain, 2)

  return { pres2sg, pres2pl, aor2sg, aor2pl } as const
}

export function nounAutoForms(lemmaNorm: string, gender: NounGender, t?: InflectionType) {
  const type = t && t !== 'none' ? t : inferNounInflectionTypeFromLemma(lemmaNorm, gender)
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  const applyLikeLemma = (w: string) => applyAccentFrom(w, lemmaNorm)

  const endsWith = (s: string) => lemmaPlain.endsWith(s)
  const stem = (cut: number) => stripGreekTonos(lemmaNorm.slice(0, cut))

  // masc -ος,-οι
  if (type === 'noun_masc_-ος_last' || type === 'noun_masc_-ος_penult' || type === 'noun_masc_-ος_antepenult') {
    if (!endsWith('ος')) return null
    const st = stem(-2)
    return {
      n_nom_sg: applyLikeLemma(`${st}ος`),
      n_nom_pl: applyLikeLemma(`${st}οι`),
      n_acc_sg: applyLikeLemma(`${st}ο`),
      n_acc_pl: applyLikeLemma(`${st}ους`),
      n_gen_sg: applyLikeLemma(`${st}ου`),
      n_gen_pl: applyLikeLemma(`${st}ων`),
    }
  }

  // masc -ας,-ες (4 subtypes only affect gen.pl)
  if (
    type === 'noun_masc_-ας_penult' ||
    type === 'noun_masc_-ας_antepenult' ||
    type === 'noun_masc_-ας_disyllabic' ||
    type === 'noun_masc_-ας_istas_ias'
  ) {
    if (!endsWith('ας')) return null
    const st = stem(-2)
    const genPlPlain = `${st}ων`
    const genPl =
      type === 'noun_masc_-ας_disyllabic' || type === 'noun_masc_-ας_istas_ias'
        ? addTonosOnLastVowel(genPlPlain)
        : type === 'noun_masc_-ας_antepenult'
          ? addTonosOnNthFromEndVowel(genPlPlain, 2)
          : applyLikeLemma(genPlPlain)
    return {
      n_nom_sg: applyLikeLemma(`${st}ας`),
      n_nom_pl: applyLikeLemma(`${st}ες`),
      n_acc_sg: applyLikeLemma(`${st}α`),
      n_acc_pl: applyLikeLemma(`${st}ες`),
      n_gen_sg: applyLikeLemma(`${st}α`),
      n_gen_pl: genPl,
    }
  }

  // masc -ης,-ες
  if (type === 'noun_masc_-ης_last' || type === 'noun_masc_-ης_penult') {
    if (!endsWith('ης')) return null
    const st = stem(-2)
    const genPlPlain = `${st}ων`
    const genPl = type === 'noun_masc_-ης_penult' ? addTonosOnLastVowel(genPlPlain) : applyLikeLemma(genPlPlain)
    return {
      n_nom_sg: applyLikeLemma(`${st}ης`),
      n_nom_pl: applyLikeLemma(`${st}ες`),
      n_acc_sg: applyLikeLemma(`${st}η`),
      n_acc_pl: applyLikeLemma(`${st}ες`),
      n_gen_sg: applyLikeLemma(`${st}η`),
      n_gen_pl: genPl,
    }
  }

  // masc -ης,-εις
  if (type === 'noun_masc_-ης_-εις_last' || type === 'noun_masc_-ης_-εις_penult') {
    if (!endsWith('ης')) return null
    const st = stem(-2)
    return {
      n_nom_sg: applyLikeLemma(`${st}ης`),
      n_nom_pl: applyLikeLemma(`${st}εις`),
      n_acc_sg: applyLikeLemma(`${st}η`),
      n_acc_pl: applyLikeLemma(`${st}εις`),
      n_gen_sg: applyLikeLemma(`${st}η`),
      n_gen_pl: applyLikeLemma(`${st}εων`),
    }
  }

  // existing minimal neut/fem patterns used by app
  if (type === 'noun_2nd_neut_-ο') {
    if (!endsWith('ο')) return null
    const st = stem(-1)
    return {
      n_nom_sg: applyLikeLemma(`${st}ο`),
      n_nom_pl: applyLikeLemma(`${st}α`),
      n_acc_sg: applyLikeLemma(`${st}ο`),
      n_acc_pl: applyLikeLemma(`${st}α`),
      n_gen_sg: applyLikeLemma(`${st}ου`),
      n_gen_pl: applyLikeLemma(`${st}ων`),
    }
  }
  if (type === 'noun_2nd_neut_-ος') {
    if (!endsWith('ος')) return null
    const st = stem(-2)
    const genPlPlain = `${st}ων`
    const genPlLast = addTonosOnLastVowel(genPlPlain)
    return {
      n_nom_sg: applyLikeLemma(`${st}ος`),
      n_nom_pl: applyLikeLemma(`${st}η`),
      n_acc_sg: applyLikeLemma(`${st}ος`),
      n_acc_pl: applyLikeLemma(`${st}η`),
      n_gen_sg: applyLikeLemma(`${st}ους`),
      // 表示は代表形（語末トノス）を採用。照合は別ロジックで複数候補を扱う。
      n_gen_pl: genPlLast,
    }
  }
  if (type === 'noun_fem_-η') {
    if (!endsWith('η')) return null
    const st = stem(-1)
    return {
      n_nom_sg: applyLikeLemma(`${st}η`),
      n_nom_pl: applyLikeLemma(`${st}ες`),
      n_acc_sg: applyLikeLemma(`${st}η`),
      n_acc_pl: applyLikeLemma(`${st}ες`),
      n_gen_sg: applyLikeLemma(`${st}ης`),
      n_gen_pl: applyLikeLemma(`${st}ων`),
    }
  }
  if (type === 'noun_fem_-α' || type === 'noun_fem_-ά') {
    if (!endsWith('α')) return null
    const st = stem(-1)
    return {
      n_nom_sg: applyLikeLemma(`${st}α`),
      n_nom_pl: applyLikeLemma(`${st}ες`),
      n_acc_sg: applyLikeLemma(`${st}α`),
      n_acc_pl: applyLikeLemma(`${st}ες`),
      n_gen_sg: applyLikeLemma(`${st}ας`),
      n_gen_pl: applyLikeLemma(`${st}ων`),
    }
  }
  if (type === 'noun_neut_-ι') {
    if (!endsWith('ι')) return null
    const st = stem(-1)
    const stNo = stripGreekTonos(st)
    return {
      n_nom_sg: applyLikeLemma(`${st}ι`),
      n_nom_pl: applyLikeLemma(`${st}ια`),
      n_acc_sg: applyLikeLemma(`${st}ι`),
      n_acc_pl: applyLikeLemma(`${st}ια`),
      // 例: σπίτι -> σπιτιού / σπιτιών（語幹側のトノスは外し、語尾にトノス）
      n_gen_sg: addTonosOnLastVowel(`${stNo}ιου`),
      n_gen_pl: addTonosOnLastVowel(`${stNo}ιων`),
    }
  }
  if (type === 'noun_neut_-ί') {
    if (!endsWith('ι')) return null
    const st = stripGreekTonos(lemmaNorm).slice(0, -1)
    return {
      n_nom_sg: addTonosOnLastVowel(`${st}ι`),
      n_nom_pl: addTonosOnLastVowel(`${st}ια`),
      n_acc_sg: addTonosOnLastVowel(`${st}ι`),
      n_acc_pl: addTonosOnLastVowel(`${st}ια`),
      n_gen_sg: addTonosOnLastVowel(`${st}ιου`),
      n_gen_pl: addTonosOnLastVowel(`${st}ιων`),
    }
  }
  if (type === 'noun_neut_-υ_-ια' || type === 'noun_neut_-υ_-υα') {
    if (!endsWith('υ')) return null
    const st = stripGreekTonos(lemmaNorm).slice(0, -1)
    const iStem = `${st}ι`
    return {
      n_nom_sg: applyLikeLemma(`${st}υ`),
      n_nom_pl: applyLikeLemma(type === 'noun_neut_-υ_-υα' ? `${st}υα` : `${st}ια`),
      n_acc_sg: applyLikeLemma(`${st}υ`),
      n_acc_pl: applyLikeLemma(type === 'noun_neut_-υ_-υα' ? `${st}υα` : `${st}ια`),
      n_gen_sg: addTonosOnLastVowel(`${iStem}ου`),
      n_gen_pl: addTonosOnLastVowel(`${iStem}ων`),
    }
  }
  if (type === 'noun_neut_-μα_2syll' || type === 'noun_neut_-μα_3plus') {
    if (!endsWith('μα')) return null
    const st = stripGreekTonos(lemmaNorm).slice(0, -2)
    const nomAccPl =
      type === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${st}ματα`) : addTonosOnAntepenultVowel(`${st}ματα`)
    return {
      n_nom_sg: applyLikeLemma(`${st}μα`),
      n_nom_pl: nomAccPl,
      n_acc_sg: applyLikeLemma(`${st}μα`),
      n_acc_pl: nomAccPl,
      n_gen_sg:
        type === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${st}ματος`) : addTonosOnAntepenultVowel(`${st}ματος`),
      // 2音節は属格複数のみ移動することが多いので、代表は penult
      n_gen_pl: addTonosOnNthFromEndVowel(`${st}ματων`, 2),
    }
  }
  if (type === 'noun_neut_-μο') {
    if (!endsWith('μο')) return null
    const st = stripGreekTonos(lemmaNorm).slice(0, -2)
    return {
      n_nom_sg: applyLikeLemma(`${st}μο`),
      n_nom_pl: addTonosOnNthFromEndVowel(`${st}ματα`, 2),
      n_acc_sg: applyLikeLemma(`${st}μο`),
      n_acc_pl: addTonosOnNthFromEndVowel(`${st}ματα`, 2),
      n_gen_sg: addTonosOnNthFromEndVowel(`${st}ματος`, 2),
      n_gen_pl: addTonosOnNthFromEndVowel(`${st}ματων`, 2),
    }
  }

  return null
}

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

export function nounMatrix(lemmaNorm: string, t?: InflectionType) {
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  const applyLikeLemma = (w: string) => applyAccentFrom(w, lemmaNorm)

  if (t === 'noun_masc_-ος_last' || t === 'noun_masc_-ος_penult' || t === 'noun_masc_-ος_antepenult') {
    if (!lemmaPlain.endsWith('ος')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    const nomSg = applyLikeLemma(`${stem}ος`)
    const genSg = applyLikeLemma(`${stem}ου`)
    const accSg = applyLikeLemma(`${stem}ο`)
    const nomPl = applyLikeLemma(`${stem}οι`)
    const genPl = applyLikeLemma(`${stem}ων`)
    const accPl = applyLikeLemma(`${stem}ους`)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`ο ${nomSg}`, `του ${genSg}`, `τον ${accSg}`] },
        { label: '複数', cells: [`οι ${nomPl}`, `των ${genPl}`, `τους ${accPl}`] },
      ],
    }
  }
  if (t === 'noun_2nd_neut_-ο') {
    if (!lemmaPlain.endsWith('ο')) return null
    const stem = lemmaNorm.slice(0, -1)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`το ${stem}ο`, `του ${stem}ου`, `το ${stem}ο`] },
        { label: '複数', cells: [`τα ${stem}α`, `των ${stem}ων`, `τα ${stem}α`] },
      ],
    }
  }
  if (t === 'noun_2nd_neut_-ος') {
    if (!lemmaPlain.endsWith('ος')) return null
    const stem = lemmaNorm.slice(0, -2)
    const genPlPlain = `${stem}ων`
    const genPlLast = addTonosOnLastVowel(genPlPlain)
    const genPlAnte = addTonosOnAntepenultVowel(genPlPlain)
    const genPlCell =
      genPlAnte !== genPlPlain && genPlAnte !== genPlLast
        ? `των ${genPlLast} · ${genPlAnte}`
        : genPlLast !== genPlPlain
          ? `των ${genPlLast}`
          : `των ${genPlPlain}`
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        {
          label: '単数',
          cells: [`το ${stem}ος`, `του ${stem}ους`, `το ${stem}ος`],
        },
        {
          label: '複数',
          cells: [`τα ${stem}η`, genPlCell, `τα ${stem}η`],
        },
      ],
    }
  }
  if (t === 'noun_fem_-η') {
    if (!lemmaPlain.endsWith('η')) return null
    const stemPlain = lemmaPlain.slice(0, -1)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        {
          label: '単数',
          cells: [
            `η ${applyLikeLemma(`${stemPlain}η`)}`,
            `της ${applyLikeLemma(`${stemPlain}ης`)}`,
            `την ${applyLikeLemma(`${stemPlain}η`)}`,
          ],
        },
        {
          label: '複数',
          cells: [
            `οι ${applyLikeLemma(`${stemPlain}ες`)}`,
            `των ${applyLikeLemma(`${stemPlain}ων`)}`,
            `τις ${applyLikeLemma(`${stemPlain}ες`)}`,
          ],
        },
      ],
    }
  }
  if (t === 'noun_fem_-α' || t === 'noun_fem_-ά') {
    if (!lemmaPlain.endsWith('α')) return null
    const stemPlain = lemmaPlain.slice(0, -1)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        {
          label: '単数',
          cells: [
            `η ${applyLikeLemma(`${stemPlain}α`)}`,
            `της ${applyLikeLemma(`${stemPlain}ας`)}`,
            `την ${applyLikeLemma(`${stemPlain}α`)}`,
          ],
        },
        {
          label: '複数',
          cells: [
            `οι ${applyLikeLemma(`${stemPlain}ες`)}`,
            `των ${applyLikeLemma(`${stemPlain}ων`)}`,
            `τις ${applyLikeLemma(`${stemPlain}ες`)}`,
          ],
        },
      ],
    }
  }

  if (t === 'noun_fem_-ος') {
    if (!lemmaPlain.endsWith('ος')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    const nomSg = applyLikeLemma(`${stem}ος`)
    const genSg = applyLikeLemma(`${stem}ου`)
    const accSg = applyLikeLemma(`${stem}ο`)
    const nomPl = applyLikeLemma(`${stem}οι`)
    const genPl = applyLikeLemma(`${stem}ων`)
    const accPl = applyLikeLemma(`${stem}ους`)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`η ${nomSg}`, `της ${genSg}`, `την ${accSg}`] },
        { label: '複数', cells: [`οι ${nomPl}`, `των ${genPl}`, `τις ${accPl}`] },
      ],
    }
  }

  if (t === 'noun_fem_-ού') {
    if (!lemmaPlain.endsWith('ου')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    const nomSg = applyLikeLemma(`${stem}ου`)
    const genSg = applyLikeLemma(`${stem}ους`)
    const accSg = applyLikeLemma(`${stem}ου`)
    const nomPl = applyLikeLemma(`${stem}ουδες`)
    const genPl = applyLikeLemma(`${stem}ουδων`)
    const accPl = applyLikeLemma(`${stem}ουδες`)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`η ${nomSg}`, `της ${genSg}`, `την ${accSg}`] },
        { label: '複数', cells: [`οι ${nomPl}`, `των ${genPl}`, `τις ${accPl}`] },
      ],
    }
  }

  if (
    t === 'noun_masc_-ας_penult' ||
    t === 'noun_masc_-ας_antepenult' ||
    t === 'noun_masc_-ας_disyllabic' ||
    t === 'noun_masc_-ας_istas_ias'
  ) {
    if (!lemmaPlain.endsWith('ας')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    const genPlPlain = `${stem}ων`
    const genPl =
      t === 'noun_masc_-ας_disyllabic' || t === 'noun_masc_-ας_istas_ias'
        ? addTonosOnLastVowel(genPlPlain)
        : t === 'noun_masc_-ας_antepenult'
          ? addTonosOnNthFromEndVowel(genPlPlain, 2)
          : applyLikeLemma(genPlPlain)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        {
          label: '単数',
          cells: [
            `ο ${applyLikeLemma(`${stem}ας`)}`,
            `του ${applyLikeLemma(`${stem}α`)}`,
            `τον ${applyLikeLemma(`${stem}α`)}`,
          ],
        },
        { label: '複数', cells: [`οι ${applyLikeLemma(`${stem}ες`)}`, `των ${genPl}`, `τους ${applyLikeLemma(`${stem}ες`)}`] },
      ],
    }
  }

  if (t === 'noun_masc_-ης_last' || t === 'noun_masc_-ης_penult') {
    if (!lemmaPlain.endsWith('ης')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    const genPlPlain = `${stem}ων`
    const genPl = t === 'noun_masc_-ης_penult' ? addTonosOnLastVowel(genPlPlain) : applyLikeLemma(genPlPlain)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        {
          label: '単数',
          cells: [
            `ο ${applyLikeLemma(`${stem}ης`)}`,
            `του ${applyLikeLemma(`${stem}η`)}`,
            `τον ${applyLikeLemma(`${stem}η`)}`,
          ],
        },
        { label: '複数', cells: [`οι ${applyLikeLemma(`${stem}ες`)}`, `των ${genPl}`, `τους ${applyLikeLemma(`${stem}ες`)}`] },
      ],
    }
  }

  if (t === 'noun_masc_-ης_-εις_last' || t === 'noun_masc_-ης_-εις_penult') {
    if (!lemmaPlain.endsWith('ης')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        {
          label: '単数',
          cells: [
            `ο ${applyLikeLemma(`${stem}ης`)}`,
            `του ${applyLikeLemma(`${stem}η`)}`,
            `τον ${applyLikeLemma(`${stem}η`)}`,
          ],
        },
        {
          label: '複数',
          cells: [
            `οι ${applyLikeLemma(`${stem}εις`)}`,
            `των ${applyLikeLemma(`${stem}εων`)}`,
            `τους ${applyLikeLemma(`${stem}εις`)}`,
          ],
        },
      ],
    }
  }
  if (t === 'noun_neut_-ι') {
    if (!lemmaPlain.endsWith('ι')) return null
    const stem = lemmaNorm.slice(0, -1)
    const stemNoTonos = stripGreekTonos(stem)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        // -ι 名詞の属格はアクセント位置が変わるため、語幹側のトノスは外す（例: σπίτιού → σπιτιού）
        { label: '単数', cells: [`το ${stem}ι`, `του ${stemNoTonos}ιού`, `το ${stem}ι`] },
        { label: '複数', cells: [`τα ${stem}ια`, `των ${stemNoTonos}ιών`, `τα ${stem}ια`] },
      ],
    }
  }
  if (t === 'noun_neut_-ί') {
    if (!lemmaPlain.endsWith('ι')) return null
    const stem = stripGreekTonos(lemmaNorm).slice(0, -1)
    const nomSg = addTonosOnLastVowel(`${stem}ι`)
    const genSg = addTonosOnLastVowel(`${stem}ιου`)
    const nomPl = addTonosOnLastVowel(`${stem}ια`)
    const genPl = addTonosOnLastVowel(`${stem}ιων`)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`το ${nomSg}`, `του ${genSg}`, `το ${nomSg}`] },
        { label: '複数', cells: [`τα ${nomPl}`, `των ${genPl}`, `τα ${nomPl}`] },
      ],
    }
  }
  if (t === 'noun_neut_-υ_-ια' || t === 'noun_neut_-υ_-υα') {
    if (!lemmaPlain.endsWith('υ')) return null
    const stem = stripGreekTonos(lemmaNorm).slice(0, -1)
    const iStem = `${stem}ι`
    const nomSg = applyLikeLemma(`${stem}υ`)
    const genSg = addTonosOnLastVowel(`${iStem}ου`)
    const nomPl = applyLikeLemma(t === 'noun_neut_-υ_-υα' ? `${stem}υα` : `${stem}ια`)
    const genPl = addTonosOnLastVowel(`${iStem}ων`)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`το ${nomSg}`, `του ${genSg}`, `το ${nomSg}`] },
        { label: '複数', cells: [`τα ${nomPl}`, `των ${genPl}`, `τα ${nomPl}`] },
      ],
    }
  }
  if (t === 'noun_neut_-μα_2syll' || t === 'noun_neut_-μα_3plus') {
    if (!lemmaPlain.endsWith('μα')) return null
    const stem = lemmaPlain.slice(0, -2)
    const nomSg = lemmaNorm
    const genSg =
      t === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${stem}ματος`) : addTonosOnAntepenultVowel(`${stem}ματος`)
    const nomPl =
      t === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${stem}ματα`) : addTonosOnAntepenultVowel(`${stem}ματα`)
    const genPl = addTonosOnNthFromEndVowel(`${stem}ματων`, 2)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`το ${nomSg}`, `του ${genSg}`, `το ${nomSg}`] },
        { label: '複数', cells: [`τα ${nomPl}`, `των ${genPl}`, `τα ${nomPl}`] },
      ],
    }
  }
  if (t === 'noun_neut_-μο') {
    if (!lemmaPlain.endsWith('μο')) return null
    const stem = lemmaPlain.slice(0, -2)
    const nomSg = lemmaNorm
    const genSg = addTonosOnNthFromEndVowel(`${stem}ματος`, 2)
    const nomPl = addTonosOnNthFromEndVowel(`${stem}ματα`, 2)
    const genPl = addTonosOnNthFromEndVowel(`${stem}ματων`, 2)
    return {
      headers: ['～は', '～の', '～を'],
      rows: [
        { label: '単数', cells: [`το ${nomSg}`, `του ${genSg}`, `το ${nomSg}`] },
        { label: '複数', cells: [`τα ${nomPl}`, `των ${genPl}`, `τα ${nomPl}`] },
      ],
    }
  }
  return null
}

export const endingsByCell: Record<
  string,
  { nomSg: string; genSg: string; accSg: string; nomPl: string; genPl: string; accPl: string }
> = {
  'noun_masc_-ος_last': { nomSg: 'ος', genSg: 'ου', accSg: 'ο', nomPl: 'οι', genPl: 'ων', accPl: 'ους' },
  'noun_masc_-ος_penult': { nomSg: 'ος', genSg: 'ου', accSg: 'ο', nomPl: 'οι', genPl: 'ων', accPl: 'ους' },
  'noun_masc_-ος_antepenult': { nomSg: 'ος', genSg: 'ου', accSg: 'ο', nomPl: 'οι', genPl: 'ων', accPl: 'ους' },
  'noun_2nd_neut_-ο': { nomSg: 'ο', genSg: 'ου', accSg: 'ο', nomPl: 'α', genPl: 'ων', accPl: 'α' },
  'noun_2nd_neut_-ος': { nomSg: 'ος', genSg: 'ους', accSg: 'ος', nomPl: 'η', genPl: 'ων', accPl: 'η' },
  'noun_fem_-η': { nomSg: 'η', genSg: 'ης', accSg: 'η', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_fem_-α': { nomSg: 'α', genSg: 'ας', accSg: 'α', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_fem_-ά': { nomSg: 'α', genSg: 'ας', accSg: 'α', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_fem_-ος': { nomSg: 'ος', genSg: 'ου', accSg: 'ο', nomPl: 'οι', genPl: 'ων', accPl: 'ους' },
  'noun_fem_-ού': { nomSg: 'ου', genSg: 'ους', accSg: 'ου', nomPl: 'ουδες', genPl: 'ουδων', accPl: 'ουδες' },
  'noun_masc_-ας_penult': { nomSg: 'ας', genSg: 'α', accSg: 'α', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_masc_-ας_antepenult': { nomSg: 'ας', genSg: 'α', accSg: 'α', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_masc_-ας_disyllabic': { nomSg: 'ας', genSg: 'α', accSg: 'α', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_masc_-ας_istas_ias': { nomSg: 'ας', genSg: 'α', accSg: 'α', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_masc_-ης_last': { nomSg: 'ης', genSg: 'η', accSg: 'η', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_masc_-ης_penult': { nomSg: 'ης', genSg: 'η', accSg: 'η', nomPl: 'ες', genPl: 'ων', accPl: 'ες' },
  'noun_masc_-ης_-εις_last': { nomSg: 'ης', genSg: 'η', accSg: 'η', nomPl: 'εις', genPl: 'εων', accPl: 'εις' },
  'noun_masc_-ης_-εις_penult': { nomSg: 'ης', genSg: 'η', accSg: 'η', nomPl: 'εις', genPl: 'εων', accPl: 'εις' },
  // トノス有無を strip して比較するので、ここは「トノス無しの語尾」で指定する
  // 例: σπιτιού は lastPlain=σπιτιου なので genSg=ιου でマッチさせる
  'noun_neut_-ι': { nomSg: 'ι', genSg: 'ιου', accSg: 'ι', nomPl: 'ια', genPl: 'ιων', accPl: 'ια' },
  'noun_neut_-ί': { nomSg: 'ι', genSg: 'ιου', accSg: 'ι', nomPl: 'ια', genPl: 'ιων', accPl: 'ια' },
  'noun_neut_-υ_-ια': { nomSg: 'υ', genSg: 'ιου', accSg: 'υ', nomPl: 'ια', genPl: 'ιων', accPl: 'ια' },
  'noun_neut_-υ_-υα': { nomSg: 'υ', genSg: 'ιου', accSg: 'υ', nomPl: 'υα', genPl: 'ιων', accPl: 'υα' },
  'noun_neut_-μα_2syll': { nomSg: 'μα', genSg: 'ματος', accSg: 'μα', nomPl: 'ματα', genPl: 'ματων', accPl: 'ματα' },
  'noun_neut_-μα_3plus': { nomSg: 'μα', genSg: 'ματος', accSg: 'μα', nomPl: 'ματα', genPl: 'ματων', accPl: 'ματα' },
  'noun_neut_-μο': { nomSg: 'μο', genSg: 'ματος', accSg: 'μο', nomPl: 'ματα', genPl: 'ματων', accPl: 'ματα' },
}

export function resolveNounTypeForMatrix(selected: Entry, lemmaNorm: string) {
  return resolveNounInflectionType(selected, lemmaNorm)
}

