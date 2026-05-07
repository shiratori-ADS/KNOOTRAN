import type { InflectionType } from '../db/types'
import {
  addTonosOnNthFromEndVowelUnit,
  addTonosOnLastVowel,
  addTonosOnPenultVowel,
  applyAccentFrom,
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
  | 'verb_pres_act_AB'
  | 'verb_pres_act_B1_-άω_-ησα'
  | 'verb_pres_act_B1_-άω_-εσα'
  | 'verb_pres_act_B1_-άω_-ασα'
  | 'verb_pres_act_B2_-ώ_-ησα'
  | 'verb_pres_act_B2_-ώ_-ασα'
  | 'verb_pres_act_B2_-ώ_-εσα'
  | 'verb_pres_mid_Γ1_-ομαι'
  | 'verb_pres_mid_Γ2_-άμαι' {
  return (
    t === 'verb_pres_act_-ω' ||
    t === 'verb_pres_act_-γω_-χω_-χνω' ||
    t === 'verb_pres_act_-πω_-φω_-βω_-εύω' ||
    t === 'verb_pres_act_AB' ||
    t === 'verb_pres_act_B1_-άω_-ησα' ||
    t === 'verb_pres_act_B1_-άω_-εσα' ||
    t === 'verb_pres_act_B1_-άω_-ασα' ||
    t === 'verb_pres_act_B2_-ώ_-ησα' ||
    t === 'verb_pres_act_B2_-ώ_-ασα' ||
    t === 'verb_pres_act_B2_-ώ_-εσα' ||
    t === 'verb_pres_mid_Γ1_-ομαι' ||
    t === 'verb_pres_mid_Γ2_-άμαι'
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

function accentGamma3(word: string) {
  return addTonosOnNthFromEndVowelUnit(word, 3)
}

function presFormsMidG1FromLemma(lemmaNorm: string) {
  // -ομαι: λέγομαι/λέγεσαι/λέγεται/λεγόμαστε/λέγεστε/λέγονται（最小）
  const plain = stripGreekTonos(lemmaNorm)
  if (!plain.endsWith('ομαι')) return null
  const stemPlain = plain.slice(0, -4)
  return {
    '1sg': accentGamma3(`${stemPlain}ομαι`),
    '2sg': accentGamma3(`${stemPlain}εσαι`),
    '3sg': accentGamma3(`${stemPlain}εται`),
    '1pl': accentGamma3(`${stemPlain}ομαστε`),
    '2pl': accentGamma3(`${stemPlain}εστε`),
    '3pl': accentGamma3(`${stemPlain}ονται`),
  } as const
}

function presFormsMidG2FromLemma(lemmaNorm: string) {
  // -άμαι: φοβάμαι/φοβάσαι/φοβάται/φοβόμαστε/φοβάστε/φοβούνται などは不規則も多いので最小の規則形に寄せる
  const plain = stripGreekTonos(lemmaNorm)
  if (!plain.endsWith('αμαι')) return null
  const stemPlain = plain.slice(0, -4)
  return {
    // Γ2 の語尾は -άμαι（語尾の α にトノス）
    '1sg': `${stemPlain}άμαι`,
    '2sg': `${stemPlain}άσαι`,
    '3sg': `${stemPlain}άται`,
    '1pl': accentGamma3(`${stemPlain}ομαστε`),
    '2pl': `${stemPlain}άστε`,
    // 3複は語尾側にトノス（例: κοιμούνται）
    '3pl': `${stemPlain}όνται`,
  } as const
}

function pastFormsMidImperfFromLemma(lemmaNorm: string) {
  // 直説法・未完了過去（最小）
  // 例: λέγομαι -> λεγόμουν / λεγόσουν / λεγόταν / λεγόμασταν / λεγόσασταν / λεγόνταν
  const plain = stripGreekTonos(lemmaNorm)
  if (!plain.endsWith('ομαι') && !plain.endsWith('αμαι')) return null
  const stemPlain = plain.slice(0, -4)
  return {
    '1sg': `${stemPlain}όμουν`,
    '2sg': `${stemPlain}όσουν`,
    '3sg': `${stemPlain}όταν`,
    '1pl': `${stemPlain}όμασταν`,
    '2pl': `${stemPlain}όσασταν`,
    '3pl': `${stemPlain}όνταν`,
  } as const
}

function aoristFormsMidG1FromLemma(lemmaNorm: string) {
  // Γ1（-ομαι）: -στηκα 系（例: εργάζομαι → εργάστηκα）
  const plain = stripGreekTonos(lemmaNorm)
  if (!plain.endsWith('ομαι')) return null
  const stemPlain = plain.slice(0, -4)

  // Aorist past (最小):
  // 例: εργαζ- なら ζ → σ にして「εργασ- + τηκα...」へ（εργάστηκα）
  const baseSigmaPlain = stemPlain.endsWith('ζ') ? `${stemPlain.slice(0, -1)}σ` : `${stemPlain}σ`
  const aorPastPlain = {
    '1sg': `${baseSigmaPlain}τηκα`,
    '2sg': `${baseSigmaPlain}τηκες`,
    '3sg': `${baseSigmaPlain}τηκε`,
    '1pl': `${baseSigmaPlain}τηκαμε`,
    '2pl': `${baseSigmaPlain}τηκατε`,
    '3pl': `${baseSigmaPlain}τηκαν`,
  } as const

  const aorPast = {
    '1sg': accentGamma3(aorPastPlain['1sg']),
    '2sg': accentGamma3(aorPastPlain['2sg']),
    '3sg': accentGamma3(aorPastPlain['3sg']),
    '1pl': accentGamma3(aorPastPlain['1pl']),
    '2pl': accentGamma3(aorPastPlain['2pl']),
    '3pl': accentGamma3(aorPastPlain['3pl']),
  } as const

  // Aorist future verb (最小): baseSt + ώ / είς / ...
  const baseStPlain = stemPlain.endsWith('ζ') ? `${stemPlain.slice(0, -1)}στ` : `${stemPlain}στ`
  const aorFutVerb = {
    '1sg': `${baseStPlain}ώ`,
    '2sg': `${baseStPlain}είς`,
    '3sg': `${baseStPlain}εί`,
    '1pl': `${baseStPlain}ούμε`,
    '2pl': `${baseStPlain}είτε`,
    '3pl': `${baseStPlain}ούν`,
  } as const

  return { stemPlain, aorPast, aorFutVerb } as const
}

function aoristFormsMidG2FromLemma(lemmaNorm: string) {
  // Γ2（-άμαι）: -ήθηκα 系（例: κοιμάμαι → κοιμήθηκα）
  const plain = stripGreekTonos(lemmaNorm)
  if (!plain.endsWith('αμαι')) return null
  const stemPlain = plain.slice(0, -4)

  const aorPastPlain = {
    '1sg': `${stemPlain}ηθηκα`,
    '2sg': `${stemPlain}ηθηκες`,
    '3sg': `${stemPlain}ηθηκε`,
    '1pl': `${stemPlain}ηθηκαμε`,
    '2pl': `${stemPlain}ηθηκατε`,
    '3pl': `${stemPlain}ηθηκαν`,
  } as const
  const aorPast = {
    '1sg': accentGamma3(aorPastPlain['1sg']),
    '2sg': accentGamma3(aorPastPlain['2sg']),
    '3sg': accentGamma3(aorPastPlain['3sg']),
    '1pl': accentGamma3(aorPastPlain['1pl']),
    '2pl': accentGamma3(aorPastPlain['2pl']),
    '3pl': accentGamma3(aorPastPlain['3pl']),
  } as const

  const aorFutVerb = {
    '1sg': `${stemPlain}ηθώ`,
    '2sg': `${stemPlain}ηθείς`,
    '3sg': `${stemPlain}ηθεί`,
    '1pl': `${stemPlain}ηθούμε`,
    '2pl': `${stemPlain}ηθείτε`,
    '3pl': `${stemPlain}ηθούν`,
  } as const

  return { stemPlain, aorPast, aorFutVerb } as const
}

function aoristImperativesMidFromLemma(lemmaNorm: string, t: 'verb_pres_mid_Γ1_-ομαι' | 'verb_pres_mid_Γ2_-άμαι') {
  const plain = stripGreekTonos(lemmaNorm)
  if (t === 'verb_pres_mid_Γ1_-ομαι') {
    if (!plain.endsWith('ομαι')) return null
    const stemPlain = plain.slice(0, -4)

    // 最小ヒューリスティック:
    // - ...ζομαι（εργάζομαι など）→ ...σου / ...στείτε 系に寄せる
    const baseSigmaPlain = stemPlain.endsWith('ζ') ? `${stemPlain.slice(0, -1)}σ` : `${stemPlain}σ`
    const aor2sg = applyAccentFrom(`${baseSigmaPlain}ου`, lemmaNorm) // 例: εργάσου

    // 2pl は ...στείτε（stem + στ + είτε）を代表にする
    const baseStPlain = stemPlain.endsWith('ζ') ? `${stemPlain.slice(0, -1)}στ` : `${stemPlain}στ`
    const aor2pl = `${baseStPlain}είτε` // 例: εργαστείτε

    // 継続・繰返し（現在）命令は 2pl だけ（2sg は空）
    const pres2pl = applyAccentFrom(`${stemPlain}εστε`, lemmaNorm)
    return { pres2sg: '', pres2pl, aor2sg, aor2pl } as const
  }

  // Γ2
  if (!plain.endsWith('αμαι')) return null
  const stemPlain = plain.slice(0, -4)
  const aor2sg = `${stemPlain}ήσου` // 例: κοιμήσου
  const aor2pl = `${stemPlain}ηθείτε` // 例: κοιμηθείτε
  // Γ2 継続・繰返し命令2複は後ろから2番目（例: κοιμάστε）
  const pres2pl = addTonosOnNthFromEndVowelUnit(`${stemPlain}αστε`, 2)
  return { pres2sg: '', pres2pl, aor2sg, aor2pl } as const
}

function verbFormsAB(lemmaNorm: string) {
  // ΑΒタイプ（旧 -γω → 現 -ω などの経年変化で不規則が混ざる最小セット）
  // NOTE: ここでは代表的な3語（ακούω/τρώω/καίω）に絞って手で埋める。
  const plain = stripGreekTonos(lemmaNorm)
  if (plain === 'ακουω') {
    return {
      pres: {
        '1sg': 'ακούω',
        '2sg': 'ακούς',
        '3sg': 'ακούει',
        '1pl': 'ακούμε',
        '2pl': 'ακούτε',
        '3pl': 'ακούν',
      } as const,
      past: {
        '1sg': 'άκουγα',
        '2sg': 'άκουγες',
        '3sg': 'άκουγε',
        '1pl': 'ακούγαμε',
        '2pl': 'ακούγατε',
        '3pl': 'άκουγαν',
      } as const,
      aorPast: {
        '1sg': 'άκουσα',
        '2sg': 'άκουσες',
        '3sg': 'άκουσε',
        '1pl': 'ακούσαμε',
        '2pl': 'ακούσατε',
        '3pl': 'άκουσαν',
      } as const,
      aorFutVerb: {
        '1sg': 'ακούσω',
        '2sg': 'ακούσεις',
        '3sg': 'ακούσει',
        '1pl': 'ακούσουμε',
        '2pl': 'ακούσετε',
        '3pl': 'ακούσουν',
      } as const,
      imp: {
        pres2sg: 'άκου',
        pres2pl: 'ακούτε',
        aor2sg: 'άκουσε',
        aor2pl: 'ακούστε',
      } as const,
    } as const
  }
  if (plain === 'τρωω') {
    return {
      pres: {
        '1sg': 'τρώω',
        '2sg': 'τρως',
        '3sg': 'τρώει',
        '1pl': 'τρώμε',
        '2pl': 'τρώτε',
        '3pl': 'τρώνε',
      } as const,
      past: {
        '1sg': 'έτρωγα',
        '2sg': 'έτρωγες',
        '3sg': 'έτρωγε',
        '1pl': 'τρώγαμε',
        '2pl': 'τρώγατε',
        '3pl': 'έτρωγαν',
      } as const,
      aorPast: {
        '1sg': 'έφαγα',
        '2sg': 'έφαγες',
        '3sg': 'έφαγε',
        '1pl': 'φάγαμε',
        '2pl': 'φάγατε',
        '3pl': 'έφαγαν',
      } as const,
      aorFutVerb: {
        '1sg': 'φάω',
        '2sg': 'φας',
        '3sg': 'φάει',
        '1pl': 'φάμε',
        '2pl': 'φάτε',
        '3pl': 'φάνε',
      } as const,
      imp: {
        pres2sg: 'τρώγε',
        pres2pl: 'τρώτε',
        aor2sg: 'φάε',
        aor2pl: 'φάτε',
      } as const,
    } as const
  }
  if (plain === 'καιω') {
    return {
      pres: {
        '1sg': 'καίω',
        '2sg': 'καίς',
        '3sg': 'καίει',
        '1pl': 'καίμε',
        '2pl': 'καίτε',
        '3pl': 'καίνε',
      } as const,
      past: {
        '1sg': 'έκαιγα',
        '2sg': 'έκαιγες',
        '3sg': 'έκαιγε',
        '1pl': 'καίγαμε',
        '2pl': 'καίγατε',
        '3pl': 'έκαιγαν',
      } as const,
      aorPast: {
        '1sg': 'έκαψα',
        '2sg': 'έκαψες',
        '3sg': 'έκαψε',
        '1pl': 'κάψαμε',
        '2pl': 'κάψατε',
        '3pl': 'έκαψαν',
      } as const,
      aorFutVerb: {
        '1sg': 'κάψω',
        '2sg': 'κάψεις',
        '3sg': 'κάψει',
        '1pl': 'κάψουμε',
        '2pl': 'κάψετε',
        '3pl': 'κάψουν',
      } as const,
      imp: {
        pres2sg: 'καίγε',
        pres2pl: 'καίτε',
        aor2sg: 'κάψε',
        aor2pl: 'κάψτε',
      } as const,
    } as const
  }
  if (plain === 'κλαιω') {
    return {
      pres: {
        '1sg': 'κλαίω',
        '2sg': 'κλαίς',
        '3sg': 'κλαίει',
        '1pl': 'κλαίμε',
        '2pl': 'κλαίτε',
        '3pl': 'κλαίνε',
      } as const,
      past: {
        '1sg': 'έκλαιγα',
        '2sg': 'έκλαιγες',
        '3sg': 'έκλαιγε',
        '1pl': 'κλαίγαμε',
        '2pl': 'κλαίγατε',
        '3pl': 'έκλαιγαν',
      } as const,
      aorPast: {
        '1sg': 'έκλαψα',
        '2sg': 'έκλαψες',
        '3sg': 'έκλαψε',
        '1pl': 'κλάψαμε',
        '2pl': 'κλάψατε',
        '3pl': 'έκλαψαν',
      } as const,
      aorFutVerb: {
        '1sg': 'κλάψω',
        '2sg': 'κλάψεις',
        '3sg': 'κλάψει',
        '1pl': 'κλάψουμε',
        '2pl': 'κλάψετε',
        '3pl': 'κλάψουν',
      } as const,
      imp: {
        pres2sg: 'κλαίγε',
        pres2pl: 'κλαίτε',
        aor2sg: 'κλάψε',
        aor2pl: 'κλάψτε',
      } as const,
    } as const
  }

  // AB（kaíō 型）
  // 「手動定義に当たらないなら、-αιωに関係なくκαίωと同じ型」＝このパターンに強制フォールバックする。
  if (plain.endsWith('ω')) {
    // 例: κλαίω -> stemNoOmega = κλαί, stemPlainNoOmega = κλαι
    const stemNoOmega = lemmaNorm.slice(0, -1)
    const stemPlainNoOmega = stripGreekTonos(stemNoOmega)

    // Present
    const pres = {
      '1sg': lemmaNorm,
      '2sg': `${stemNoOmega}ς`,
      '3sg': `${stemNoOmega}ει`,
      '1pl': `${stemNoOmega}με`,
      '2pl': `${stemNoOmega}τε`,
      '3pl': `${stemNoOmega}νε`,
    } as const

    // Imperfect (…αιγ-)
    const impStem = `${stemPlainNoOmega}γ`
    const pastStem = withAugment(impStem, lemmaNorm)
    const pastStemPlural = impStem
    const past = {
      '1sg': accentAntepenultByUnits(`${pastStem}α`),
      '2sg': accentAntepenultByUnits(`${pastStem}ες`),
      '3sg': accentAntepenultByUnits(`${pastStem}ε`),
      '1pl': accentAntepenultByUnits(`${pastStemPlural}αμε`),
      '2pl': accentAntepenultByUnits(`${pastStemPlural}ατε`),
      '3pl': accentAntepenultByUnits(`${pastStem}αν`),
    } as const

    // Aorist (…αψ- / …ψ-)
    // - καίω/κλαίω は ...αι -> ...αψ
    // - それ以外は「kaíō型に寄せて」語幹 + ψ（最小）
    const aorStemPlain = stemPlainNoOmega.endsWith('αι') ? `${stemPlainNoOmega.slice(0, -2)}αψ` : `${stemPlainNoOmega}ψ`
    const aorPastStem = withAugment(aorStemPlain, lemmaNorm)
    const aorPastStemPlural = aorStemPlain
    const aorPast = {
      '1sg': accentAntepenultByUnits(`${aorPastStem}α`),
      '2sg': accentAntepenultByUnits(`${aorPastStem}ες`),
      '3sg': accentAntepenultByUnits(`${aorPastStem}ε`),
      '1pl': accentAntepenultByUnits(`${aorPastStemPlural}αμε`),
      '2pl': accentAntepenultByUnits(`${aorPastStemPlural}ατε`),
      '3pl': accentAntepenultByUnits(`${aorPastStem}αν`),
    } as const

    // Aorist future verb (ψ-stem behaves like ψ future: ...ψω / ...ψεις / ...)
    const aorFutVerbPlain = {
      '1sg': `${aorStemPlain}ω`,
      '2sg': `${aorStemPlain}εις`,
      '3sg': `${aorStemPlain}ει`,
      '1pl': `${aorStemPlain}ουμε`,
      '2pl': `${aorStemPlain}ετε`,
      '3pl': `${aorStemPlain}ουν`,
    } as const
    const aorFutVerb = {
      '1sg': addTonosOnPenultVowel(aorFutVerbPlain['1sg']),
      '2sg': addTonosOnPenultVowel(aorFutVerbPlain['2sg']),
      '3sg': addTonosOnPenultVowel(aorFutVerbPlain['3sg']),
      '1pl': addTonosOnPenultVowel(aorFutVerbPlain['1pl']),
      '2pl': addTonosOnPenultVowel(aorFutVerbPlain['2pl']),
      '3pl': addTonosOnPenultVowel(aorFutVerbPlain['3pl']),
    } as const

    // Imperatives
    const accentNthForImp2sg = (plainForm: string) => (countGreekVowelUnits(plainForm) <= 2 ? 2 : 3)
    const aor2sgPlain = `${aorStemPlain}ε`
    const aor2plPlain = `${aorStemPlain}τε`
    const imp = {
      pres2sg: `${stemNoOmega}γε`,
      pres2pl: `${stemNoOmega}τε`,
      aor2sg: addTonosOnNthFromEndVowelUnit(aor2sgPlain, accentNthForImp2sg(aor2sgPlain)),
      aor2pl: addTonosOnNthFromEndVowelUnit(aor2plPlain, 2),
    } as const

    return { pres, past, aorPast, aorFutVerb, imp } as const
  }
  return null
}

function presFormsB1FromLemma(lemmaNorm: string) {
  // -άω: ζητάω/ζητάς/ζητά/ζητάμε/ζητάτε/ζητάνε（最小）
  if (!lemmaNorm.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)
  return {
    '1sg': lemmaNorm,
    '2sg': `${stem}ς`,
    // 3単は「-ει」表記を採用（例: απαντάω → απαντάει）。短い形（απαντά）も一般的。
    '3sg': `${stem}ει`,
    '1pl': `${stem}με`,
    '2pl': `${stem}τε`,
    '3pl': `${stem}νε`,
  } as const
}

function presFormsB2FromLemma(lemmaNorm: string) {
  // -ώ: δημιουργώ/δημιουργείς/δημιουργεί/δημιουργούμε/δημιουργείτε/δημιουργούν（最小）
  if (!lemmaNorm.endsWith('ώ')) return null
  const stem = lemmaNorm.slice(0, -1)
  return {
    '1sg': lemmaNorm,
    '2sg': `${stem}είς`,
    '3sg': `${stem}εί`,
    '1pl': `${stem}ούμε`,
    '2pl': `${stem}είτε`,
    '3pl': `${stem}ούν`,
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
  if (t === 'verb_pres_act_B1_-άω_-εσα') {
    // 最小: -άω の Β1（-εσα）
    // 例: πονάω/φοράω → πόνεσα/φόρεσα
    const plain = stripGreekTonos(lemmaStem)
    if (plain.endsWith('α')) return `${plain.slice(0, -1)}ε`
    return plain
  }
  if (t === 'verb_pres_act_B1_-άω_-ασα') {
    // 最小: -άω の Β1（-ασα）
    // 例: γελάω/πεινάω/χαλάω → γέλασα/πείνασα/χάλασα
    return stripGreekTonos(lemmaStem)
  }
  if (t === 'verb_pres_act_B2_-ώ_-ησα') {
    // 最小: -ώ の Β2（-ησα）
    // 例: δημιουργώ/εξηγώ → δημιούργησα/εξήγησα
    const plain = stripGreekTonos(lemmaStem)
    return plain.endsWith('η') ? plain : `${plain}η`
  }
  if (t === 'verb_pres_act_B2_-ώ_-ασα') {
    // 最小: -ώ の Β2（-ασα）
    // 例: （最小ルール）語幹 + α + σα
    const plain = stripGreekTonos(lemmaStem)
    return plain.endsWith('α') ? plain : `${plain}α`
  }
  if (t === 'verb_pres_act_B2_-ώ_-εσα') {
    // 最小: -ώ の Β2（-εσα）
    // 例: （最小ルール）語幹 + ε + σα
    const plain = stripGreekTonos(lemmaStem)
    return plain.endsWith('ε') ? plain : `${plain}ε`
  }
  return lemmaStem.endsWith('ζ') || lemmaStem.endsWith('ν') ? lemmaStem.slice(0, -1) : lemmaStem
}

export function verbMatrix(lemmaNorm: string, t?: InflectionType): VerbRow[] | null {
  if (!isSupportedVerbType(t)) return null
  const lemmaPlain = stripGreekTonos(lemmaNorm)

  if (t === 'verb_pres_mid_Γ1_-ομαι' || t === 'verb_pres_mid_Γ2_-άμαι') {
    const pres =
      t === 'verb_pres_mid_Γ1_-ομαι' ? presFormsMidG1FromLemma(lemmaNorm) : presFormsMidG2FromLemma(lemmaNorm)
    if (!pres) return null
    const past = pastFormsMidImperfFromLemma(lemmaNorm)
    if (!past) return null
    const fut = {
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

  if (!lemmaPlain.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)

  if (t === 'verb_pres_act_AB') {
    const ab = verbFormsAB(lemmaNorm)
    if (!ab) return null
    const fut = {
      '1sg': `θα ${ab.pres['1sg']}`,
      '2sg': `θα ${ab.pres['2sg']}`,
      '3sg': `θα ${ab.pres['3sg']}`,
      '1pl': `θα ${ab.pres['1pl']}`,
      '2pl': `θα ${ab.pres['2pl']}`,
      '3pl': `θα ${ab.pres['3pl']}`,
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
      { person: '1sg', pres: ab.pres['1sg'], past: ab.past['1sg'], fut: fut['1sg'], na: na['1sg'] },
      { person: '2sg', pres: ab.pres['2sg'], past: ab.past['2sg'], fut: fut['2sg'], na: na['2sg'] },
      { person: '3sg', pres: ab.pres['3sg'], past: ab.past['3sg'], fut: fut['3sg'], na: na['3sg'] },
      { person: '1pl', pres: ab.pres['1pl'], past: ab.past['1pl'], fut: fut['1pl'], na: na['1pl'] },
      { person: '2pl', pres: ab.pres['2pl'], past: ab.past['2pl'], fut: fut['2pl'], na: na['2pl'] },
      { person: '3pl', pres: ab.pres['3pl'], past: ab.past['3pl'], fut: fut['3pl'], na: na['3pl'] },
    ]
  }

  const pres =
    t === 'verb_pres_act_B1_-άω_-ησα' ||
    t === 'verb_pres_act_B1_-άω_-εσα' ||
    t === 'verb_pres_act_B1_-άω_-ασα'
      ? presFormsB1FromLemma(lemmaNorm)
      : t === 'verb_pres_act_B2_-ώ_-ησα' ||
          t === 'verb_pres_act_B2_-ώ_-ασα' ||
          t === 'verb_pres_act_B2_-ώ_-εσα'
        ? presFormsB2FromLemma(lemmaNorm)
      : presFormsFromStem(stem)
  if (!pres) return null

  const past = (() => {
    // Β（-άω / -ώ）の未完了過去は最小で -ούσα 系に寄せる（例: ζητούσα / δημιουργούσα）
    if (
      t === 'verb_pres_act_B1_-άω_-ησα' ||
      t === 'verb_pres_act_B1_-άω_-εσα' ||
      t === 'verb_pres_act_B1_-άω_-ασα' ||
      t === 'verb_pres_act_B2_-ώ_-ησα' ||
      t === 'verb_pres_act_B2_-ώ_-ασα' ||
      t === 'verb_pres_act_B2_-ώ_-εσα'
    ) {
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
  if (t === 'verb_pres_mid_Γ1_-ομαι' || t === 'verb_pres_mid_Γ2_-άμαι') {
    const pres =
      t === 'verb_pres_mid_Γ1_-ομαι' ? presFormsMidG1FromLemma(lemmaNorm) : presFormsMidG2FromLemma(lemmaNorm)
    if (!pres) return null
    const aor =
      t === 'verb_pres_mid_Γ1_-ομαι' ? aoristFormsMidG1FromLemma(lemmaNorm) : aoristFormsMidG2FromLemma(lemmaNorm)
    if (!aor) return null
    const aorFut = {
      '1sg': `θα ${aor.aorFutVerb['1sg']}`,
      '2sg': `θα ${aor.aorFutVerb['2sg']}`,
      '3sg': `θα ${aor.aorFutVerb['3sg']}`,
      '1pl': `θα ${aor.aorFutVerb['1pl']}`,
      '2pl': `θα ${aor.aorFutVerb['2pl']}`,
      '3pl': `θα ${aor.aorFutVerb['3pl']}`,
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
      { person: '1sg', pres: pres['1sg'], aorPast: aor.aorPast['1sg'], aorFut: aorFut['1sg'], aorNa: aorNa['1sg'] },
      { person: '2sg', pres: pres['2sg'], aorPast: aor.aorPast['2sg'], aorFut: aorFut['2sg'], aorNa: aorNa['2sg'] },
      { person: '3sg', pres: pres['3sg'], aorPast: aor.aorPast['3sg'], aorFut: aorFut['3sg'], aorNa: aorNa['3sg'] },
      { person: '1pl', pres: pres['1pl'], aorPast: aor.aorPast['1pl'], aorFut: aorFut['1pl'], aorNa: aorNa['1pl'] },
      { person: '2pl', pres: pres['2pl'], aorPast: aor.aorPast['2pl'], aorFut: aorFut['2pl'], aorNa: aorNa['2pl'] },
      { person: '3pl', pres: pres['3pl'], aorPast: aor.aorPast['3pl'], aorFut: aorFut['3pl'], aorNa: aorNa['3pl'] },
    ]
  }
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  if (!lemmaPlain.endsWith('ω')) return null
  const stem = lemmaNorm.slice(0, -1)

  if (t === 'verb_pres_act_AB') {
    const ab = verbFormsAB(lemmaNorm)
    if (!ab) return null
    const aorFut = {
      '1sg': `θα ${ab.aorFutVerb['1sg']}`,
      '2sg': `θα ${ab.aorFutVerb['2sg']}`,
      '3sg': `θα ${ab.aorFutVerb['3sg']}`,
      '1pl': `θα ${ab.aorFutVerb['1pl']}`,
      '2pl': `θα ${ab.aorFutVerb['2pl']}`,
      '3pl': `θα ${ab.aorFutVerb['3pl']}`,
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
      { person: '1sg', pres: ab.pres['1sg'], aorPast: ab.aorPast['1sg'], aorFut: aorFut['1sg'], aorNa: aorNa['1sg'] },
      { person: '2sg', pres: ab.pres['2sg'], aorPast: ab.aorPast['2sg'], aorFut: aorFut['2sg'], aorNa: aorNa['2sg'] },
      { person: '3sg', pres: ab.pres['3sg'], aorPast: ab.aorPast['3sg'], aorFut: aorFut['3sg'], aorNa: aorNa['3sg'] },
      { person: '1pl', pres: ab.pres['1pl'], aorPast: ab.aorPast['1pl'], aorFut: aorFut['1pl'], aorNa: aorNa['1pl'] },
      { person: '2pl', pres: ab.pres['2pl'], aorPast: ab.aorPast['2pl'], aorFut: aorFut['2pl'], aorNa: aorNa['2pl'] },
      { person: '3pl', pres: ab.pres['3pl'], aorPast: ab.aorPast['3pl'], aorFut: aorFut['3pl'], aorNa: aorNa['3pl'] },
    ]
  }
  const aorStem = aoristStemFromLemmaStem(stem, t)

  const pres =
    t === 'verb_pres_act_B1_-άω_-ησα' ||
    t === 'verb_pres_act_B1_-άω_-εσα' ||
    t === 'verb_pres_act_B1_-άω_-ασα'
      ? presFormsB1FromLemma(lemmaNorm)
      : t === 'verb_pres_act_B2_-ώ_-ησα' ||
          t === 'verb_pres_act_B2_-ώ_-ασα' ||
          t === 'verb_pres_act_B2_-ώ_-εσα'
        ? presFormsB2FromLemma(lemmaNorm)
      : presFormsFromStem(stem)
  if (!pres) return null

  const aorPastStem = (() => {
    // -εύω（...ευ-）は現代標準では増音なしが一般的なので、語幹が変化（...εψ-）しても付けない
    if (shouldSuppressAugmentForStem(stem)) return aorStem
    if (
      t === 'verb_pres_act_B1_-άω_-ησα' ||
      t === 'verb_pres_act_B1_-άω_-εσα' ||
      t === 'verb_pres_act_B1_-άω_-ασα' ||
      t === 'verb_pres_act_B2_-ώ_-ησα' ||
      t === 'verb_pres_act_B2_-ώ_-ασα' ||
      t === 'verb_pres_act_B2_-ώ_-εσα'
    )
      return aorStem
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
    : t === 'verb_pres_act_B1_-άω_-ησα' ||
        t === 'verb_pres_act_B1_-άω_-εσα' ||
        t === 'verb_pres_act_B1_-άω_-ασα' ||
        t === 'verb_pres_act_B2_-ώ_-ησα' ||
        t === 'verb_pres_act_B2_-ώ_-ασα' ||
        t === 'verb_pres_act_B2_-ώ_-εσα'
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
    ...(t === 'verb_pres_act_B1_-άω_-ησα' ||
    t === 'verb_pres_act_B1_-άω_-εσα' ||
    t === 'verb_pres_act_B1_-άω_-ασα' ||
    t === 'verb_pres_act_B2_-ώ_-ησα' ||
    t === 'verb_pres_act_B2_-ώ_-ασα' ||
    t === 'verb_pres_act_B2_-ώ_-εσα'
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
  if (t === 'verb_pres_mid_Γ1_-ομαι' || t === 'verb_pres_mid_Γ2_-άμαι') {
    const imp = aoristImperativesMidFromLemma(lemmaNorm, t)
    return imp ?? null
  }
  if (!stripGreekTonos(lemmaNorm).endsWith('ω')) return null

  if (t === 'verb_pres_act_AB') {
    const ab = verbFormsAB(lemmaNorm)
    return ab?.imp ?? null
  }

  if (
    t === 'verb_pres_act_B1_-άω_-ησα' ||
    t === 'verb_pres_act_B1_-άω_-εσα' ||
    t === 'verb_pres_act_B1_-άω_-ασα'
  ) {
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

  if (
    t === 'verb_pres_act_B2_-ώ_-ησα' ||
    t === 'verb_pres_act_B2_-ώ_-ασα' ||
    t === 'verb_pres_act_B2_-ώ_-εσα'
  ) {
    // Β2（-ώ）命令形（最小）
    // - Imperfective: 2sg: -εί, 2pl: -είτε
    // 例: δημιουργώ → δημιουργεί / δημιουργείτε
    const stemPlain = stripGreekTonos(lemmaNorm).slice(0, -1)
    const accentNthForImp2sg = (plainForm: string) => (countGreekVowelUnits(plainForm) <= 2 ? 2 : 3)

    const pres2sgPlain = `${stemPlain}ει`
    const pres2plPlain = `${stemPlain}ειτε` // -είτε（penultユニット=ει にトノス）
    const pres2sg = addTonosOnNthFromEndVowelUnit(pres2sgPlain, 1)
    const pres2pl = addTonosOnNthFromEndVowelUnit(pres2plPlain, 2)

    const aorStemPlain = stripGreekTonos(aoristStemFromLemmaStem(stripGreekTonos(lemmaNorm).slice(0, -1), t))
    const aor2sgPlain = `${aorStemPlain}σε`
    const aor2plPlain = `${aorStemPlain}στε`
    const aor2sg = addTonosOnNthFromEndVowelUnit(aor2sgPlain, accentNthForImp2sg(aor2sgPlain))
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

