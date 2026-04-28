import type { InflectionType } from '../db/types'
import {
  addTonosOnNthFromEndVowelUnit,
  addTonosOnLastVowel,
  addTonosOnPenultVowel,
  stripGreekTonos,
} from './accent'

// =========================
// Verb conjugation (minimal)
// =========================

const GREEK_VOWELS = new Set(['α', 'ε', 'η', 'ι', 'ο', 'υ', 'ω'])
const GREEK_DIGRAPHS = new Set(['αι', 'ει', 'οι', 'ου', 'αυ', 'ευ', 'ηυ'])

export type VerbPerson = '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl'

export type VerbRow = {
  person: VerbPerson
  pres: string
  past: string
  fut: string
  na: string
}

export type VerbAorRow = {
  person: VerbPerson
  pres: string
  aorPast: string
  aorFut: string
  aorNa: string
}

export type VerbImperatives = {
  pres2sg: string
  pres2pl: string
  aor2sg: string
  aor2pl: string
}

function isSupportedVerbType(t?: InflectionType): t is
  | 'verb_pres_act_-ω'
  | 'verb_pres_act_-γω_-χω_-χνω'
  | 'verb_pres_act_-πω_-φω_-βω_-εύω'
  | 'verb_pres_act_B1_-άω_-ησα'
  | 'verb_pres_act_B1_-άω_-ασα' {
  return (
    t === 'verb_pres_act_-ω' ||
    t === 'verb_pres_act_-γω_-χω_-χνω' ||
    t === 'verb_pres_act_-πω_-φω_-βω_-εύω' ||
    t === 'verb_pres_act_B1_-άω_-ησα' ||
    t === 'verb_pres_act_B1_-άω_-ασα'
  )
}

function countGreekVowelUnits(input: string): number {
  const plain = stripGreekTonos(input)
  let c = 0
  for (let i = 0; i < plain.length; i++) {
    const two = plain.slice(i, i + 2)
    if (two.length === 2 && GREEK_DIGRAPHS.has(two)) {
      c++
      i++
      continue
    }
    if (GREEK_VOWELS.has(plain[i] ?? '')) c++
  }
  return c
}

function presFormsFromStem(stem: string) {
  return {
    '1sg': `${stem}ω`,
    '2sg': `${stem}εις`,
    '3sg': `${stem}ει`,
    '1pl': `${stem}ουμε`,
    '2pl': `${stem}ετε`,
    '3pl': `${stem}ουν`,
  } as const
}

function presFormsB1FromLemma(lemmaNorm: string) {
  // -άω: ζητάω/ζητάς/ζητά/ζητάμε/ζητάτε/ζητάνε（最小）
  if (!lemmaNorm.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)
  return {
    '1sg': lemmaNorm,
    '2sg': `${stem}ς`,
    // 3単は「-ε」表記を採用（例: απαντάω → απαντάε）。短い形（απαντά）も一般的。
    '3sg': `${stem}ε`,
    '1pl': `${stem}με`,
    '2pl': `${stem}τε`,
    '3pl': `${stem}νε`,
  } as const
}

function shouldSuppressAugmentForStem(stem: string): boolean {
  // -εύω（χορεύω/δουλεύω など）は現代標準では増音なしが一般的なので付けない
  return stripGreekTonos(stem).endsWith('ευ')
}

function withAugment(stem: string, lemmaForSyllableCount: string): string {
  // 最小ヒューリスティック：
  // - 語頭が母音なら増音しない
  // - それ以外でも、音節（母音ユニット）数が多い（>=3）場合は増音しない（例: διαλέγω → διάλεξα）
  // - -εύω（χορεύω/δουλεύω など）は現代標準では増音なしが一般的なので付けない
  const head = stripGreekTonos(stem)[0] ?? ''
  if (GREEK_VOWELS.has(head)) return stem
  if (shouldSuppressAugmentForStem(stem)) return stem
  // 語幹だけだと末尾 -ω の1音節が落ちて誤判定しやすい（例: γνωρίζω）。
  // なので見出し語ベースで母音ユニット数を数える。
  if (countGreekVowelUnits(lemmaForSyllableCount) >= 3) return stem
  return `έ${stem}`
}

function accentAntepenultByUnits(word: string): string {
  return addTonosOnNthFromEndVowelUnit(word, 3)
}

function aoristStemFromLemmaStem(lemmaStem: string, t: InflectionType): string {
  // アオリスト用の語幹（最小ルール）
  // - ...ζω の場合: ζ が σ に変化（= ζ を落として σ 系語尾を付ける）
  // - ...νω の場合も同様に ν を落として σ 系語尾を付ける（ユーザー要望：-ζω と同じ扱い）
  if (t === 'verb_pres_act_-γω_-χω_-χνω') {
    // 最小: -γω/-χω/-χνω は ξ アオリスト扱い（例: τρέχω→έτρεξα, δείχνω→έδειξα）
    if (lemmaStem.endsWith('χν')) return `${lemmaStem.slice(0, -2)}ξ`
    if (lemmaStem.endsWith('χ') || lemmaStem.endsWith('γ')) return `${lemmaStem.slice(0, -1)}ξ`
    return lemmaStem
  }
  if (t === 'verb_pres_act_-πω_-φω_-βω_-εύω') {
    // 最小: π/β/φ は ψ アオリスト扱い（例: γράφω→έγραψα）
    // -εύω は「…ευ」→「…εψ」扱い（例: χορεύω→χόρεψα）
    const plainStem = stripGreekTonos(lemmaStem)
    if (plainStem.endsWith('ευ')) return `${lemmaStem.slice(0, -2)}εψ`
    if (plainStem.endsWith('π') || plainStem.endsWith('β') || plainStem.endsWith('φ'))
      return `${lemmaStem.slice(0, -1)}ψ`
    return lemmaStem
  }
  if (t === 'verb_pres_act_B1_-άω_-ησα') {
    // 最小: -άω の Β1（-ησα）
    // 例: ζητάω/βοηθάω/απαντάω → ζήτησα/βοήθησα/απάντησα
    const plain = stripGreekTonos(lemmaStem)
    if (plain.endsWith('α')) return `${plain.slice(0, -1)}η`
    return plain
  }
  if (t === 'verb_pres_act_B1_-άω_-ασα') {
    // 最小: -άω の Β1（-ασα）
    // 例: γελάω/πεινάω/χαλάω → γέλασα/πείνασα/χάλασα
    return stripGreekTonos(lemmaStem)
  }
  return lemmaStem.endsWith('ζ') || lemmaStem.endsWith('ν') ? lemmaStem.slice(0, -1) : lemmaStem
}

export function verbMatrix(lemmaNorm: string, t?: InflectionType): VerbRow[] | null {
  if (!isSupportedVerbType(t)) return null
  if (!lemmaNorm.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)

  const pres =
    t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα'
      ? presFormsB1FromLemma(lemmaNorm)
      : presFormsFromStem(stem)
  if (!pres) return null

  const past = (() => {
    // Β1（-άω）の未完了過去は最小で -ούσα 系に寄せる（例: ζητούσα）
    if (t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα') {
      const stemPlain = stripGreekTonos(stem)
      const base = stemPlain.endsWith('α') ? `${stemPlain.slice(0, -1)}ούσ` : `${stemPlain}ούσ`
      return {
        '1sg': `${base}α`,
        '2sg': `${base}ες`,
        '3sg': `${base}ε`,
        '1pl': `${base}αμε`,
        '2pl': `${base}ατε`,
        '3pl': `${base}αν`,
      } as const
    }
    const pastStem = withAugment(stem, lemmaNorm)
    const pastStemPlural = stem
    return {
      // 過去(未完了)は「母音ユニット（ου/ευ 等を1つ）」で数えて antepenult にトノスを置く
      '1sg': accentAntepenultByUnits(`${pastStem}α`),
      '2sg': accentAntepenultByUnits(`${pastStem}ες`),
      '3sg': accentAntepenultByUnits(`${pastStem}ε`),
      '1pl': accentAntepenultByUnits(`${pastStemPlural}αμε`),
      '2pl': accentAntepenultByUnits(`${pastStemPlural}ατε`),
      '3pl': accentAntepenultByUnits(`${pastStemPlural}αν`),
    } as const
  })()

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
    { person: '1sg', pres: pres['1sg'], past: past['1sg'], fut: fut['1sg'], na: na['1sg'] },
    { person: '2sg', pres: pres['2sg'], past: past['2sg'], fut: fut['2sg'], na: na['2sg'] },
    { person: '3sg', pres: pres['3sg'], past: past['3sg'], fut: fut['3sg'], na: na['3sg'] },
    { person: '1pl', pres: pres['1pl'], past: past['1pl'], fut: fut['1pl'], na: na['1pl'] },
    { person: '2pl', pres: pres['2pl'], past: past['2pl'], fut: fut['2pl'], na: na['2pl'] },
    { person: '3pl', pres: pres['3pl'], past: past['3pl'], fut: fut['3pl'], na: na['3pl'] },
  ]
}

export function verbAoristMatrix(lemmaNorm: string, t?: InflectionType): VerbAorRow[] | null {
  if (!isSupportedVerbType(t)) return null
  if (!lemmaNorm.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)
  const aorStem = aoristStemFromLemmaStem(stem, t)

  const pres =
    t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα'
      ? presFormsB1FromLemma(lemmaNorm)
      : presFormsFromStem(stem)
  if (!pres) return null

  const aorPastStem = (() => {
    // -εύω（...ευ-）は現代標準では増音なしが一般的なので、語幹が変化（...εψ-）しても付けない
    if (shouldSuppressAugmentForStem(stem)) return aorStem
    if (t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα') return aorStem
    return withAugment(aorStem, lemmaNorm)
  })()
  const aorPastStemPlural = aorStem

  const isXiOrPsiStem =
    (t === 'verb_pres_act_-γω_-χω_-χνω' && aorStem.endsWith('ξ')) ||
    (t === 'verb_pres_act_-πω_-φω_-βω_-εύω' && aorStem.endsWith('ψ'))

  const aorPast = isXiOrPsiStem
    ? ({
        '1sg': accentAntepenultByUnits(`${aorPastStem}α`),
        '2sg': accentAntepenultByUnits(`${aorPastStem}ες`),
        '3sg': accentAntepenultByUnits(`${aorPastStem}ε`),
        '1pl': accentAntepenultByUnits(`${aorPastStemPlural}αμε`),
        '2pl': accentAntepenultByUnits(`${aorPastStemPlural}ατε`),
        // 3複は増音あり/なし両方が見えるので、ここでは増音あり寄りにする
        '3pl': accentAntepenultByUnits(`${aorPastStem}αν`),
      } as const)
    : t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα'
      ? ({
          '1sg': accentAntepenultByUnits(`${aorPastStem}σα`),
          '2sg': accentAntepenultByUnits(`${aorPastStem}σες`),
          '3sg': accentAntepenultByUnits(`${aorPastStem}σε`),
          '1pl': accentAntepenultByUnits(`${aorPastStemPlural}σαμε`),
          '2pl': accentAntepenultByUnits(`${aorPastStemPlural}σατε`),
          '3pl': accentAntepenultByUnits(`${aorPastStem}σαν`),
        } as const)
      : ({
          '1sg': accentAntepenultByUnits(`${aorPastStem}σα`),
          '2sg': accentAntepenultByUnits(`${aorPastStem}σες`),
          '3sg': accentAntepenultByUnits(`${aorPastStem}σε`),
          '1pl': accentAntepenultByUnits(`${aorPastStemPlural}σαμε`),
          '2pl': accentAntepenultByUnits(`${aorPastStemPlural}σατε`),
          '3pl': accentAntepenultByUnits(`${aorPastStem}σαν`),
        } as const)

  const aorFutVerb = {
    // 最小: アオリスト未来（=単純未来）の語幹 + σω 系（厳密ではない）
    // Β1（-άω）の future は語幹末尾 η にトノス（例: απαντήσω/απαντήσουμε/απαντήσουν）
    ...(t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα'
      ? (() => {
          const aorStemAcc = addTonosOnLastVowel(stripGreekTonos(aorStem))
          return {
            '1sg': `${aorStemAcc}σω`,
            '2sg': `${aorStemAcc}σεις`,
            '3sg': `${aorStemAcc}σει`,
            '1pl': `${aorStemAcc}σουμε`,
            '2pl': `${aorStemAcc}σετε`,
            '3pl': `${aorStemAcc}σουν`,
          } as const
        })()
      : ({
          '1sg': isXiOrPsiStem ? `${aorStem}ω` : `${aorStem}σω`,
          '2sg': isXiOrPsiStem ? `${aorStem}εις` : `${aorStem}σεις`,
          '3sg': isXiOrPsiStem ? `${aorStem}ει` : `${aorStem}σει`,
          '1pl': isXiOrPsiStem ? `${aorStem}ουμε` : `${aorStem}σουμε`,
          '2pl': isXiOrPsiStem ? `${aorStem}ετε` : `${aorStem}σετε`,
          '3pl': isXiOrPsiStem ? `${aorStem}ουν` : `${aorStem}σουν`,
        } as const)),
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
    { person: '1sg', pres: pres['1sg'], aorPast: aorPast['1sg'], aorFut: aorFut['1sg'], aorNa: aorNa['1sg'] },
    { person: '2sg', pres: pres['2sg'], aorPast: aorPast['2sg'], aorFut: aorFut['2sg'], aorNa: aorNa['2sg'] },
    { person: '3sg', pres: pres['3sg'], aorPast: aorPast['3sg'], aorFut: aorFut['3sg'], aorNa: aorNa['3sg'] },
    { person: '1pl', pres: pres['1pl'], aorPast: aorPast['1pl'], aorFut: aorFut['1pl'], aorNa: aorNa['1pl'] },
    { person: '2pl', pres: pres['2pl'], aorPast: aorPast['2pl'], aorFut: aorFut['2pl'], aorNa: aorNa['2pl'] },
    { person: '3pl', pres: pres['3pl'], aorPast: aorPast['3pl'], aorFut: aorFut['3pl'], aorNa: aorNa['3pl'] },
  ]
}

export function verbImperativeForms(lemmaNorm: string, t?: InflectionType): VerbImperatives | null {
  if (!isSupportedVerbType(t)) return null
  if (!lemmaNorm.endsWith('ω')) return null

  if (t === 'verb_pres_act_B1_-άω_-ησα' || t === 'verb_pres_act_B1_-άω_-ασα') {
    // Β1（-άω）命令形（ユーザー指定ルール）
    // - Imperfective: 2sg: -α（語幹 = 見出し語から -ω）、2pl: -τε（= 現在2複と同形）
    // - Perfective: 2sg: -ησε、2pl: -ήστε
    //
    // 例:
    // απαντάω → απάντα / απαντάτε / απάντησε / απαντήστε
    // βοηθάω → βοήθα / βοηθάτε / βοήθησε / βοηθήστε
    // ζητάω   → ζήτα  / ζητάτε  / ζήτησε  / ζητήστε

    const stemPlainNoOmega = stripGreekTonos(lemmaNorm).slice(0, -1) // ...α
    const stemNoOmega = lemmaNorm.slice(0, -1) // ...ά (トノス保持)

    // Imperfective (present imperative)
    const pres2sgPlain = stemPlainNoOmega
    const pres2pl = `${stemNoOmega}τε`
    // Β1の2sg（-α）はユーザー指定で penult に統一（例: απάντα / βοήθα / ζήτα）
    const pres2sg = addTonosOnNthFromEndVowelUnit(pres2sgPlain, countGreekVowelUnits(pres2sgPlain) >= 2 ? 2 : 1)

    // Perfective (aorist imperative)
    const aorStemPlainNoTonos = stripGreekTonos(aoristStemFromLemmaStem(stripGreekTonos(lemmaNorm).slice(0, -1), t))
    const aor2sgPlain = `${aorStemPlainNoTonos}σε` // ...ησε
    const aor2plPlain = `${aorStemPlainNoTonos}στε` // ...ήστε（penultにトノス）
    const accentNthFor2sg = (plainForm: string) => (countGreekVowelUnits(plainForm) <= 2 ? 2 : 3)
    const aor2sg = addTonosOnNthFromEndVowelUnit(aor2sgPlain, accentNthFor2sg(aor2sgPlain))
    const aor2pl = addTonosOnNthFromEndVowelUnit(aor2plPlain, 2)

    return { pres2sg, pres2pl, aor2sg, aor2pl }
  }

  const stemPlain = stripGreekTonos(lemmaNorm).slice(0, -1)
  const accentNthForImp2sg = (plainForm: string) => (countGreekVowelUnits(plainForm) <= 2 ? 2 : 3)

  const pres2sgPlain = `${stemPlain}ε`
  const pres2plPlain = `${stemPlain}ετε`

  const pres2sg = addTonosOnNthFromEndVowelUnit(pres2sgPlain, accentNthForImp2sg(pres2sgPlain))
  const pres2pl = addTonosOnNthFromEndVowelUnit(pres2plPlain, 2)

  const aorStemPlain = stripGreekTonos(aoristStemFromLemmaStem(stripGreekTonos(lemmaNorm).slice(0, -1), t))
  const aor2sgPlain = aorStemPlain.endsWith('ξ') || aorStemPlain.endsWith('ψ') ? `${aorStemPlain}ε` : `${aorStemPlain}σε`
  const aor2plPlain = aorStemPlain.endsWith('ξ') || aorStemPlain.endsWith('ψ') ? `${aorStemPlain}τε` : `${aorStemPlain}στε`

  const aor2sg = addTonosOnNthFromEndVowelUnit(aor2sgPlain, accentNthForImp2sg(aor2sgPlain))
  const aor2pl = addTonosOnNthFromEndVowelUnit(aor2plPlain, 2)

  return { pres2sg, pres2pl, aor2sg, aor2pl }
}

