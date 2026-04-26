import { db } from '../db/db'
import { normalizeToken } from '../lib/normalize'
import { tokenize } from '../lib/translate'
import type { Entry, InflectionType } from '../db/types'
import { resolveNounInflectionType } from './infer'
import {
  addTonosOnAntepenultVowel,
  addTonosOnLastVowel,
  addTonosOnNthFromEndVowel,
  addTonosOnPenultVowel,
  applyAccentFrom,
  stripGreekTonos,
} from './accent'

type Person = '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl' | 'unknown'
type NounCase = 'nom' | 'acc' | 'gen' | 'unknown'

export type SentenceAnalysis = {
  verb?: { token: string; entryId: number; lemma: string; person: Person }
  nouns: Array<{ token: string; entryId: number; lemma: string; case: NounCase }>
}

export type SentenceResult = {
  analysis: SentenceAnalysis
  ja: string
  unknownTokens: string[]
}

function stripPunct(s: string) {
  return s.replace(/[.··;,:!?]/g, '')
}

function subjectFromPerson(p: Person): string {
  switch (p) {
    case '1sg':
      return '私は'
    case '2sg':
      return 'あなたは'
    case '3sg':
      return '彼/彼女は'
    case '1pl':
      return '私たちは'
    case '2pl':
      return 'あなたたちは'
    case '3pl':
      return '彼ら/彼女らは'
    default:
      return ''
  }
}

function particleFromCase(c: NounCase): string {
  switch (c) {
    case 'acc':
      return 'を'
    case 'nom':
      return 'が'
    case 'gen':
      return 'の'
    default:
      return ''
  }
}

function verbStem(lemma: string, type?: InflectionType): string | null {
  if (
    type !== 'verb_pres_act_-ω' &&
    type !== 'verb_pres_act_-γω_-χω_-χνω' &&
    type !== 'verb_pres_act_-πω_-φω_-βω_-εύω'
  )
    return null
  if (!lemma.endsWith('ω')) return null
  return lemma.slice(0, -1)
}

function detectVerbPerson(tokenNorm: string, entry: Entry, lemmaNorm: string, type?: InflectionType): Person {
  const o = entry.inflectionOverrides
  if (o?.v_1sg && tokenNorm === normalizeToken(o.v_1sg)) return '1sg'
  if (o?.v_2sg && tokenNorm === normalizeToken(o.v_2sg)) return '2sg'
  if (o?.v_3sg && tokenNorm === normalizeToken(o.v_3sg)) return '3sg'
  if (o?.v_1pl && tokenNorm === normalizeToken(o.v_1pl)) return '1pl'
  if (o?.v_2pl && tokenNorm === normalizeToken(o.v_2pl)) return '2pl'
  if (o?.v_3pl && tokenNorm === normalizeToken(o.v_3pl)) return '3pl'
  if ((o as any)?.v_past_1sg && tokenNorm === normalizeToken((o as any).v_past_1sg)) return '1sg'
  if ((o as any)?.v_past_2sg && tokenNorm === normalizeToken((o as any).v_past_2sg)) return '2sg'
  if ((o as any)?.v_past_3sg && tokenNorm === normalizeToken((o as any).v_past_3sg)) return '3sg'
  if ((o as any)?.v_past_1pl && tokenNorm === normalizeToken((o as any).v_past_1pl)) return '1pl'
  if ((o as any)?.v_past_2pl && tokenNorm === normalizeToken((o as any).v_past_2pl)) return '2pl'
  if ((o as any)?.v_past_3pl && tokenNorm === normalizeToken((o as any).v_past_3pl)) return '3pl'
  if ((o as any)?.v_fut_1sg && tokenNorm === normalizeToken((o as any).v_fut_1sg)) return '1sg'
  if ((o as any)?.v_fut_2sg && tokenNorm === normalizeToken((o as any).v_fut_2sg)) return '2sg'
  if ((o as any)?.v_fut_3sg && tokenNorm === normalizeToken((o as any).v_fut_3sg)) return '3sg'
  if ((o as any)?.v_fut_1pl && tokenNorm === normalizeToken((o as any).v_fut_1pl)) return '1pl'
  if ((o as any)?.v_fut_2pl && tokenNorm === normalizeToken((o as any).v_fut_2pl)) return '2pl'
  if ((o as any)?.v_fut_3pl && tokenNorm === normalizeToken((o as any).v_fut_3pl)) return '3pl'
  if ((o as any)?.v_na_1sg && tokenNorm === normalizeToken((o as any).v_na_1sg)) return '1sg'
  if ((o as any)?.v_na_2sg && tokenNorm === normalizeToken((o as any).v_na_2sg)) return '2sg'
  if ((o as any)?.v_na_3sg && tokenNorm === normalizeToken((o as any).v_na_3sg)) return '3sg'
  if ((o as any)?.v_na_1pl && tokenNorm === normalizeToken((o as any).v_na_1pl)) return '1pl'
  if ((o as any)?.v_na_2pl && tokenNorm === normalizeToken((o as any).v_na_2pl)) return '2pl'
  if ((o as any)?.v_na_3pl && tokenNorm === normalizeToken((o as any).v_na_3pl)) return '3pl'
  if ((o as any)?.v_aor_past_1sg && tokenNorm === normalizeToken((o as any).v_aor_past_1sg)) return '1sg'
  if ((o as any)?.v_aor_past_2sg && tokenNorm === normalizeToken((o as any).v_aor_past_2sg)) return '2sg'
  if ((o as any)?.v_aor_past_3sg && tokenNorm === normalizeToken((o as any).v_aor_past_3sg)) return '3sg'
  if ((o as any)?.v_aor_past_1pl && tokenNorm === normalizeToken((o as any).v_aor_past_1pl)) return '1pl'
  if ((o as any)?.v_aor_past_2pl && tokenNorm === normalizeToken((o as any).v_aor_past_2pl)) return '2pl'
  if ((o as any)?.v_aor_past_3pl && tokenNorm === normalizeToken((o as any).v_aor_past_3pl)) return '3pl'
  if ((o as any)?.v_aor_fut_1sg && tokenNorm === normalizeToken((o as any).v_aor_fut_1sg)) return '1sg'
  if ((o as any)?.v_aor_fut_2sg && tokenNorm === normalizeToken((o as any).v_aor_fut_2sg)) return '2sg'
  if ((o as any)?.v_aor_fut_3sg && tokenNorm === normalizeToken((o as any).v_aor_fut_3sg)) return '3sg'
  if ((o as any)?.v_aor_fut_1pl && tokenNorm === normalizeToken((o as any).v_aor_fut_1pl)) return '1pl'
  if ((o as any)?.v_aor_fut_2pl && tokenNorm === normalizeToken((o as any).v_aor_fut_2pl)) return '2pl'
  if ((o as any)?.v_aor_fut_3pl && tokenNorm === normalizeToken((o as any).v_aor_fut_3pl)) return '3pl'
  if ((o as any)?.v_aor_na_1sg && tokenNorm === normalizeToken((o as any).v_aor_na_1sg)) return '1sg'
  if ((o as any)?.v_aor_na_2sg && tokenNorm === normalizeToken((o as any).v_aor_na_2sg)) return '2sg'
  if ((o as any)?.v_aor_na_3sg && tokenNorm === normalizeToken((o as any).v_aor_na_3sg)) return '3sg'
  if ((o as any)?.v_aor_na_1pl && tokenNorm === normalizeToken((o as any).v_aor_na_1pl)) return '1pl'
  if ((o as any)?.v_aor_na_2pl && tokenNorm === normalizeToken((o as any).v_aor_na_2pl)) return '2pl'
  if ((o as any)?.v_aor_na_3pl && tokenNorm === normalizeToken((o as any).v_aor_na_3pl)) return '3pl'
  const stem = verbStem(lemmaNorm, type)
  if (!stem) return 'unknown'
  if (tokenNorm === `${stem}ω`) return '1sg'
  if (tokenNorm === `${stem}εις`) return '2sg'
  if (tokenNorm === `${stem}ει`) return '3sg'
  if (tokenNorm === `${stem}ουμε`) return '1pl'
  if (tokenNorm === `${stem}ετε`) return '2pl'
  if (tokenNorm === `${stem}ουν` || tokenNorm === `${stem}ουνε`) return '3pl'
  return 'unknown'
}

function nounStem(lemma: string, type?: InflectionType): string | null {
  const lemmaPlain = stripGreekTonos(lemma)
  if (
    type === 'noun_2nd_neut_-ος' ||
    type === 'noun_masc_-ος_last' ||
    type === 'noun_masc_-ος_penult' ||
    type === 'noun_masc_-ος_antepenult'
  ) {
    if (!lemmaPlain.endsWith('ος')) return null
    return lemma.slice(0, -2)
  }
  if (
    type === 'noun_masc_-ας_penult' ||
    type === 'noun_masc_-ας_antepenult' ||
    type === 'noun_masc_-ας_disyllabic' ||
    type === 'noun_masc_-ας_istas_ias'
  ) {
    if (!lemmaPlain.endsWith('ας')) return null
    return lemma.slice(0, -2)
  }
  if (
    type === 'noun_masc_-ης_last' ||
    type === 'noun_masc_-ης_penult' ||
    type === 'noun_masc_-ης_-εις_last' ||
    type === 'noun_masc_-ης_-εις_penult'
  ) {
    if (!lemmaPlain.endsWith('ης')) return null
    return lemma.slice(0, -2)
  }
  if (type === 'noun_2nd_neut_-ο') {
    if (!lemmaPlain.endsWith('ο')) return null
    return lemma.slice(0, -1)
  }
  if (type === 'noun_neut_-ι') {
    if (!lemmaPlain.endsWith('ι')) return null
    return lemma.slice(0, -1)
  }
  if (type === 'noun_neut_-ί') {
    if (!lemmaPlain.endsWith('ι')) return null
    return lemma.slice(0, -1)
  }
  if (type === 'noun_neut_-υ_-ια' || type === 'noun_neut_-υ_-υα') {
    if (!lemmaPlain.endsWith('υ')) return null
    return lemma.slice(0, -1)
  }
  if (type === 'noun_neut_-μα_2syll' || type === 'noun_neut_-μα_3plus') {
    if (!lemmaPlain.endsWith('μα')) return null
    return lemma.slice(0, -2)
  }
  if (type === 'noun_neut_-μο') {
    if (!lemmaPlain.endsWith('μο')) return null
    return lemma.slice(0, -2)
  }
  if (type === 'noun_fem_-η') {
    if (!lemmaPlain.endsWith('η')) return null
    return lemma.slice(0, -1)
  }
  if (type === 'noun_fem_-α' || type === 'noun_fem_-ά') {
    if (!lemmaPlain.endsWith('α')) return null
    return lemma.slice(0, -1)
  }
  if (type === 'noun_fem_-ος') {
    if (!lemmaPlain.endsWith('ος')) return null
    return lemma.slice(0, -2)
  }
  if (type === 'noun_fem_-ού') {
    if (!lemmaPlain.endsWith('ου')) return null
    return lemma.slice(0, -2)
  }
  return null
}

function nounForms(entry: Entry, lemmaNorm: string, type?: InflectionType): {
  nom: string[]
  acc: string[]
  gen: string[]
} | null {
  const o = entry.inflectionOverrides
  if (
    o?.n_nom_sg ||
    o?.n_acc_sg ||
    o?.n_gen_sg ||
    o?.n_nom_pl ||
    o?.n_acc_pl ||
    o?.n_gen_pl
  ) {
    return {
      nom: [o?.n_nom_sg, o?.n_nom_pl].map((x) => normalizeToken(x ?? '')).filter(Boolean),
      acc: [o?.n_acc_sg, o?.n_acc_pl].map((x) => normalizeToken(x ?? '')).filter(Boolean),
      gen: [o?.n_gen_sg, o?.n_gen_pl].map((x) => normalizeToken(x ?? '')).filter(Boolean),
    }
  }
  const stem = nounStem(lemmaNorm, type)
  if (!stem) return null

  const stemPlain = stripGreekTonos(stem)
  const applyLikeLemma = (w: string) => applyAccentFrom(w, lemmaNorm)

  // 男性名詞 -ος, -οι（(1)/(2)は区別せず、トノス移動なし扱い）
  if (type === 'noun_masc_-ος_last' || type === 'noun_masc_-ος_penult' || type === 'noun_masc_-ος_antepenult')
    return {
      nom: [applyLikeLemma(`${stemPlain}ος`), applyLikeLemma(`${stemPlain}οι`)],
      gen: [applyLikeLemma(`${stemPlain}ου`), applyLikeLemma(`${stemPlain}ων`)],
      acc: [applyLikeLemma(`${stemPlain}ο`), applyLikeLemma(`${stemPlain}ους`)],
    }

  if (type === 'noun_2nd_neut_-ο')
    return (() => {
      // -ο, -α は属格でアクセント移動する/しないの両方があるため、候補を広めに許容する
      const nomAcc = [`${stem}ο`, `${stem}α`]
      const genSgPlain = `${stemPlain}ου`
      const genPlPlain = `${stemPlain}ων`
      const gen = Array.from(
        new Set([
          `${stem}ου`,
          `${stem}ων`,
          applyLikeLemma(genSgPlain),
          applyLikeLemma(genPlPlain),
          addTonosOnPenultVowel(genSgPlain),
          addTonosOnPenultVowel(genPlPlain),
          addTonosOnLastVowel(genPlPlain),
        ]),
      )
      return { nom: nomAcc, gen, acc: nomAcc }
    })()
  if (type === 'noun_2nd_neut_-ος') {
    const nomAccSg = [`${stem}ος`]
    const genSg = [`${stem}ους`]
    const nomAccPl = [`${stem}η`]
    const genPl = Array.from(
      new Set([
        `${stem}ων`,
        addTonosOnLastVowel(`${stem}ων`),
        addTonosOnAntepenultVowel(`${stem}ων`),
      ]),
    )
    return {
      nom: [...nomAccSg, ...nomAccPl],
      gen: [...genSg, ...genPl],
      acc: [...nomAccSg, ...nomAccPl],
    }
  }
  // 女性名詞（主格単数の語尾で5パターン）
  if (type === 'noun_fem_-α' || type === 'noun_fem_-ά') {
    const nomAccSg = applyLikeLemma(`${stemPlain}α`)
    const nomAccPl = applyLikeLemma(`${stemPlain}ες`)
    const genSg = applyLikeLemma(`${stemPlain}ας`)
    const genPlPlain = `${stemPlain}ων`
    // -ων / -ών の区別ができないので両方を許容
    const genPl = Array.from(new Set([applyLikeLemma(genPlPlain), addTonosOnLastVowel(genPlPlain)]))
    return {
      nom: [nomAccSg, nomAccPl],
      gen: [genSg, ...genPl],
      acc: [nomAccSg, nomAccPl],
    }
  }
  if (type === 'noun_fem_-η') {
    const nomAccSg = applyLikeLemma(`${stemPlain}η`)
    const nomAccPl = applyLikeLemma(`${stemPlain}ες`)
    const genSg = applyLikeLemma(`${stemPlain}ης`)
    const genPlPlain = `${stemPlain}ων`
    const genPl = Array.from(new Set([applyLikeLemma(genPlPlain), addTonosOnLastVowel(genPlPlain)]))
    return {
      nom: [nomAccSg, nomAccPl],
      gen: [genSg, ...genPl],
      acc: [nomAccSg, nomAccPl],
    }
  }
  if (type === 'noun_fem_-ος') {
    return {
      nom: [applyLikeLemma(`${stemPlain}ος`), applyLikeLemma(`${stemPlain}οι`)],
      gen: [applyLikeLemma(`${stemPlain}ου`), applyLikeLemma(`${stemPlain}ων`)],
      acc: [applyLikeLemma(`${stemPlain}ο`), applyLikeLemma(`${stemPlain}ους`)],
    }
  }
  if (type === 'noun_fem_-ού') {
    return {
      nom: [applyLikeLemma(`${stemPlain}ου`), applyLikeLemma(`${stemPlain}ουδες`)],
      gen: [applyLikeLemma(`${stemPlain}ους`), applyLikeLemma(`${stemPlain}ουδων`)],
      acc: [applyLikeLemma(`${stemPlain}ου`), applyLikeLemma(`${stemPlain}ουδες`)],
    }
  }

  // 男性名詞 -ας, -ες（4パターン）
  if (
    type === 'noun_masc_-ας_penult' ||
    type === 'noun_masc_-ας_antepenult' ||
    type === 'noun_masc_-ας_disyllabic' ||
    type === 'noun_masc_-ας_istas_ias'
  ) {
    const nomSg = applyLikeLemma(`${stemPlain}ας`)
    const accSg = applyLikeLemma(`${stemPlain}α`)
    const nomAccPl = applyLikeLemma(`${stemPlain}ες`)
    const genSg = applyLikeLemma(`${stemPlain}α`)
    // 属格複数だけトノス移動が出る型がある
    const genPlPlain = `${stemPlain}ων`
    const genPl =
      type === 'noun_masc_-ας_disyllabic' || type === 'noun_masc_-ας_istas_ias'
        ? addTonosOnLastVowel(genPlPlain)
        : type === 'noun_masc_-ας_antepenult'
          ? addTonosOnNthFromEndVowel(genPlPlain, 2)
          : applyLikeLemma(genPlPlain)
    return {
      nom: [nomSg, nomAccPl],
      gen: [genSg, genPl],
      acc: [accSg, nomAccPl],
    }
  }

  // 男性名詞 -ης, -ες（2パターン）
  if (type === 'noun_masc_-ης_last' || type === 'noun_masc_-ης_penult') {
    const nomSg = applyLikeLemma(`${stemPlain}ης`)
    const accSg = applyLikeLemma(`${stemPlain}η`)
    const nomAccPl = applyLikeLemma(`${stemPlain}ες`)
    const genSg = applyLikeLemma(`${stemPlain}η`)
    const genPlPlain = `${stemPlain}ων`
    const genPl =
      type === 'noun_masc_-ης_penult'
        ? addTonosOnLastVowel(genPlPlain) // κλέφτης → κλεφτών
        : applyLikeLemma(genPlPlain)
    return {
      nom: [nomSg, nomAccPl],
      gen: [genSg, genPl],
      acc: [accSg, nomAccPl],
    }
  }

  // 男性名詞 -ης, -εις（2パターン。-ηδες は判別困難なのでここへ寄せる）
  if (type === 'noun_masc_-ης_-εις_last' || type === 'noun_masc_-ης_-εις_penult') {
    const nomSg = applyLikeLemma(`${stemPlain}ης`)
    const accSg = applyLikeLemma(`${stemPlain}η`)
    const genSg = applyLikeLemma(`${stemPlain}η`)
    const nomAccPl = applyLikeLemma(`${stemPlain}εις`)
    const genPl = applyLikeLemma(`${stemPlain}εων`)
    return {
      nom: [nomSg, nomAccPl],
      gen: [genSg, genPl],
      acc: [accSg, nomAccPl],
    }
  }

  if (type === 'noun_neut_-ι')
    return {
      nom: [`${stem}ι`, `${stem}ια`],
      // トノスあり/なし両方を許容（例: σπιτιού / σπιτιου）
      gen: [
        `${stem}ιου`,
        `${stem}ιού`,
        `${stem}ιων`,
        `${stem}ιών`,
        `${stripGreekTonos(stem)}ιου`,
        `${stripGreekTonos(stem)}ιού`,
        `${stripGreekTonos(stem)}ιων`,
        `${stripGreekTonos(stem)}ιών`,
      ],
      acc: [`${stem}ι`, `${stem}ια`],
    }
  if (type === 'noun_neut_-ί') {
    // παιδί → παιδιού / παιδιά / παιδιών（語末アクセント固定）
    const base = stripGreekTonos(lemmaNorm).slice(0, -1) // παιδ
    const nomAccSg = addTonosOnLastVowel(`${base}ι`)
    const nomAccPl = addTonosOnLastVowel(`${base}ια`)
    const genSg = addTonosOnLastVowel(`${base}ιου`)
    const genPl = addTonosOnLastVowel(`${base}ιων`)
    return { nom: [nomAccSg, nomAccPl], gen: [genSg, genPl], acc: [nomAccSg, nomAccPl] }
  }
  if (type === 'noun_neut_-υ_-ια' || type === 'noun_neut_-υ_-υα') {
    // βράδυ → βραδιού / βράδια / βραδιών（属格は -ιου/-ιων）
    const base = stripGreekTonos(lemmaNorm).slice(0, -1)
    const iStem = `${base}ι`
    const nomAccSg = applyLikeLemma(`${base}υ`)
    const nomAccPl = applyLikeLemma(type === 'noun_neut_-υ_-υα' ? `${base}υα` : `${base}ια`)
    const genSg = addTonosOnLastVowel(`${iStem}ου`)
    const genPl = addTonosOnLastVowel(`${iStem}ων`)
    return { nom: [nomAccSg, nomAccPl], gen: [genSg, genPl], acc: [nomAccSg, nomAccPl] }
  }
  if (type === 'noun_neut_-μα_2syll' || type === 'noun_neut_-μα_3plus') {
    const base = stripGreekTonos(lemmaNorm).slice(0, -2)
    const nomAccSg = applyLikeLemma(`${base}μα`)
    const nomAccPl =
      type === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${base}ματα`) : addTonosOnAntepenultVowel(`${base}ματα`)
    const genSg =
      type === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${base}ματος`) : addTonosOnAntepenultVowel(`${base}ματος`)
    const genPl =
      type === 'noun_neut_-μα_3plus' ? addTonosOnPenultVowel(`${base}ματων`) : addTonosOnPenultVowel(`${base}ματων`)
    // 2音節は「属格複数だけ移動」が多いので、属格複数は penult を代表にしつつ antepenult も許容
    const genPlCandidates =
      type === 'noun_neut_-μα_2syll'
        ? Array.from(new Set([genPl, addTonosOnAntepenultVowel(`${base}ματων`)]))
        : [genPl]
    return {
      nom: [nomAccSg, nomAccPl],
      gen: [genSg, ...genPlCandidates],
      acc: [nomAccSg, nomAccPl],
    }
  }
  if (type === 'noun_neut_-μο') {
    // πλέξιμο → πλεξίματος / πλεξίματα / πλεξιμάτων
    const base = stripGreekTonos(lemmaNorm).slice(0, -2) // ...ι
    const nomAccSg = applyLikeLemma(`${base}μο`)
    const nomAccPl = addTonosOnPenultVowel(`${base}ματα`)
    const genSg = addTonosOnPenultVowel(`${base}ματος`)
    const genPl = addTonosOnPenultVowel(`${base}ματων`)
    return { nom: [nomAccSg, nomAccPl], gen: [genSg, genPl], acc: [nomAccSg, nomAccPl] }
  }
  return null
}

function detectNounCaseByForm(tokenNorm: string, entry: Entry, lemmaNorm: string, type?: InflectionType): NounCase {
  const f = nounForms(entry, lemmaNorm, type)
  if (!f) return 'unknown'
  const inNom = f.nom.includes(tokenNorm)
  const inAcc = f.acc.includes(tokenNorm)
  const inGen = f.gen.includes(tokenNorm)
  if (inNom && inAcc && !inGen) return 'unknown' // 同形は形だけで決めない
  if (inGen) return 'gen'
  if (inAcc) return 'acc'
  if (inNom) return 'nom'
  return 'unknown'
}

async function findCandidateVerb(tokenNorm: string): Promise<Entry | undefined> {
  // 1) 見出し語一致
  const byLemma = await db.entries.where('foreignLemma').equals(tokenNorm).first()
  if (byLemma?.pos === 'verb') return byLemma

  // 2) -ωタイプの簡易活用一致（全件なめるのは重いので上限）
  const verbs = await db.entries.where('pos').equals('verb').limit(300).toArray()
  for (const v of verbs) {
    const lemma = normalizeToken(v.foreignLemma ?? '')
    if (!lemma) continue
    const p = detectVerbPerson(tokenNorm, v, lemma, v.inflectionType)
    if (p !== 'unknown') return v
  }
  return undefined
}

async function findCandidateNoun(tokenNorm: string): Promise<Entry | undefined> {
  const byLemma = await db.entries.where('foreignLemma').equals(tokenNorm).first()
  if (byLemma?.pos === 'noun') return byLemma

  const nouns = await db.entries.where('pos').equals('noun').limit(500).toArray()
  for (const n of nouns) {
    const lemma = normalizeToken(n.foreignLemma ?? '')
    if (!lemma) continue
    const t = resolveNounInflectionType(n, lemma)
    const f = nounForms(n, lemma, t)
    if (!f) continue
    if (f.nom.includes(tokenNorm) || f.acc.includes(tokenNorm) || f.gen.includes(tokenNorm)) return n
  }
  return undefined
}

export async function translateSentenceForeignToJa(input: string): Promise<SentenceResult> {
  const toks = tokenize(input)
    .filter((t) => t.kind === 'word')
    .map((t) => normalizeToken(stripPunct(t.raw)))
    .filter(Boolean)

  const unknownTokens: string[] = []

  // 動詞を1つ探す（最初にヒットしたもの）
  let verb:
    | {
        token: string
        entry: Entry
        person: Person
        tokenIndex: number
      }
    | undefined

  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i]
    const e = await findCandidateVerb(tok)
    if (!e?.id) continue
    const lemma = normalizeToken(e.foreignLemma ?? tok)
    const person = detectVerbPerson(tok, e, lemma, e.inflectionType)
    verb = { token: tok, entry: e, person, tokenIndex: i }
    break
  }

  // 名詞を拾う（とりあえず複数OK）
  const nouns: Array<{ token: string; entry: Entry; case: NounCase; tokenIndex: number }> = []
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i]
    if (verb && i === verb.tokenIndex) continue
    const e = await findCandidateNoun(tok)
    if (!e?.id) continue

    const lemma = normalizeToken(e.foreignLemma ?? tok)
    const t = resolveNounInflectionType(e, lemma)
    const byForm = detectNounCaseByForm(tok, e, lemma, t)

    // 同形や不明はヒューリスティック：動詞の後に出た名詞は目的語(対格)扱い
    const c: NounCase =
      byForm !== 'unknown'
        ? byForm
        : verb && i > verb.tokenIndex
          ? 'acc'
          : 'nom'

    nouns.push({ token: tok, entry: e, case: c, tokenIndex: i })
  }

  // 未知の単語を収集（解析に使ったtoken以外）
  const used = new Set<string>()
  if (verb) used.add(`${verb.tokenIndex}:${verb.token}`)
  for (const n of nouns) used.add(`${n.tokenIndex}:${n.token}`)
  toks.forEach((t, i) => {
    if (!used.has(`${i}:${t}`)) unknownTokens.push(t)
  })

  const analysis: SentenceAnalysis = {
    verb: verb
      ? {
          token: verb.token,
          entryId: verb.entry.id!,
          lemma: normalizeToken(verb.entry.foreignLemma ?? verb.token),
          person: verb.person,
        }
      : undefined,
    nouns: nouns.map((n) => ({
      token: n.token,
      entryId: n.entry.id!,
      lemma: normalizeToken(n.entry.foreignLemma ?? n.token),
      case: n.case,
    })),
  }

  const subject = verb ? subjectFromPerson(verb.person) : ''
  const object = nouns
    .filter((n) => n.case === 'acc')
    .sort((a, b) => a.tokenIndex - b.tokenIndex)[0]
  const subjectNoun = nouns
    .filter((n) => n.case === 'nom')
    .sort((a, b) => a.tokenIndex - b.tokenIndex)[0]

  const parts: string[] = []
  if (subject) parts.push(subject)

  if (object) {
    parts.push(`${object.entry.meaningJaPrimary}${particleFromCase('acc')}`)
  } else if (subjectNoun && !subject) {
    // 主語が補えない場合は名詞を主語扱いで置く
    parts.push(`${subjectNoun.entry.meaningJaPrimary}${particleFromCase('nom')}`)
  }

  if (verb) {
    parts.push(verb.entry.meaningJaPrimary)
  }

  const ja = parts.length > 0 ? `${parts.join(' ')}。` : ''

  return { analysis, ja, unknownTokens }
}

