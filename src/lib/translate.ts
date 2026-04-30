import { db } from '../db/db'
import { normalizeToken } from './normalize'
import { levenshtein } from './levenshtein'
import type { Entry, InflectionType, NounGender } from '../db/types'
import { resolveNounInflectionType } from '../grammar/infer'
import {
  addTonosOnAntepenultVowel,
  addTonosOnLastVowel,
  addTonosOnNthFromEndVowel,
  addTonosOnPenultVowel,
  applyAccentFrom,
  stripGreekTonos,
} from '../grammar/accent'

export type TranslateDirection = 'ja_to_foreign' | 'foreign_to_ja'

export type TokenPiece =
  | { kind: 'word'; raw: string; norm: string }
  | { kind: 'sep'; raw: string }

export type UnknownSpan = {
  token: string
  index: number
  suggestions: Array<{ entryId: number; label: string; score: number }>
}

export type TranslateResult = {
  pieces: Array<
    | { kind: 'known'; raw: string; out: string; entryId: number }
    | { kind: 'unknown'; raw: string }
    | { kind: 'sep'; raw: string }
  >
  unknowns: UnknownSpan[]
}

// 英字/ギリシャ文字/数字に加え、日本語（ひらがな/カタカナ/漢字）も「単語」として扱う
const wordRegex =
  /[A-Za-zÀ-ÖØ-öø-ÿ\u0370-\u03FF\u1F00-\u1FFF\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF]+|[0-9]+/g

export function tokenize(input: string): TokenPiece[] {
  const pieces: TokenPiece[] = []
  let last = 0
  for (const match of input.matchAll(wordRegex)) {
    const idx = match.index ?? 0
    if (idx > last) pieces.push({ kind: 'sep', raw: input.slice(last, idx) })
    const raw = match[0]
    pieces.push({ kind: 'word', raw, norm: normalizeToken(raw) })
    last = idx + raw.length
  }
  if (last < input.length) pieces.push({ kind: 'sep', raw: input.slice(last) })
  return pieces
}

async function findByForeignForm(norm: string): Promise<Entry | undefined> {
  return db.entries.where('foreignForms').equals(norm).first()
}

async function findByForeignLemma(norm: string): Promise<Entry | undefined> {
  return db.entries.where('foreignLemma').equals(norm).first()
}

function verbMatchesToken(tokenNorm: string, entry: Entry): boolean {
  const lemma = normalizeToken(entry.foreignLemma ?? '')
  if (!lemma) return false

  const o = entry.inflectionOverrides
  if (o?.v_1sg && tokenNorm === normalizeToken(o.v_1sg)) return true
  if (o?.v_2sg && tokenNorm === normalizeToken(o.v_2sg)) return true
  if (o?.v_3sg && tokenNorm === normalizeToken(o.v_3sg)) return true
  if (o?.v_1pl && tokenNorm === normalizeToken(o.v_1pl)) return true
  if (o?.v_2pl && tokenNorm === normalizeToken(o.v_2pl)) return true
  if (o?.v_3pl && tokenNorm === normalizeToken(o.v_3pl)) return true
  if ((o as any)?.v_past_1sg && tokenNorm === normalizeToken((o as any).v_past_1sg)) return true
  if ((o as any)?.v_past_2sg && tokenNorm === normalizeToken((o as any).v_past_2sg)) return true
  if ((o as any)?.v_past_3sg && tokenNorm === normalizeToken((o as any).v_past_3sg)) return true
  if ((o as any)?.v_past_1pl && tokenNorm === normalizeToken((o as any).v_past_1pl)) return true
  if ((o as any)?.v_past_2pl && tokenNorm === normalizeToken((o as any).v_past_2pl)) return true
  if ((o as any)?.v_past_3pl && tokenNorm === normalizeToken((o as any).v_past_3pl)) return true
  if ((o as any)?.v_fut_1sg && tokenNorm === normalizeToken((o as any).v_fut_1sg)) return true
  if ((o as any)?.v_fut_2sg && tokenNorm === normalizeToken((o as any).v_fut_2sg)) return true
  if ((o as any)?.v_fut_3sg && tokenNorm === normalizeToken((o as any).v_fut_3sg)) return true
  if ((o as any)?.v_fut_1pl && tokenNorm === normalizeToken((o as any).v_fut_1pl)) return true
  if ((o as any)?.v_fut_2pl && tokenNorm === normalizeToken((o as any).v_fut_2pl)) return true
  if ((o as any)?.v_fut_3pl && tokenNorm === normalizeToken((o as any).v_fut_3pl)) return true
  if ((o as any)?.v_na_1sg && tokenNorm === normalizeToken((o as any).v_na_1sg)) return true
  if ((o as any)?.v_na_2sg && tokenNorm === normalizeToken((o as any).v_na_2sg)) return true
  if ((o as any)?.v_na_3sg && tokenNorm === normalizeToken((o as any).v_na_3sg)) return true
  if ((o as any)?.v_na_1pl && tokenNorm === normalizeToken((o as any).v_na_1pl)) return true
  if ((o as any)?.v_na_2pl && tokenNorm === normalizeToken((o as any).v_na_2pl)) return true
  if ((o as any)?.v_na_3pl && tokenNorm === normalizeToken((o as any).v_na_3pl)) return true
  if ((o as any)?.v_aor_past_1sg && tokenNorm === normalizeToken((o as any).v_aor_past_1sg)) return true
  if ((o as any)?.v_aor_past_2sg && tokenNorm === normalizeToken((o as any).v_aor_past_2sg)) return true
  if ((o as any)?.v_aor_past_3sg && tokenNorm === normalizeToken((o as any).v_aor_past_3sg)) return true
  if ((o as any)?.v_aor_past_1pl && tokenNorm === normalizeToken((o as any).v_aor_past_1pl)) return true
  if ((o as any)?.v_aor_past_2pl && tokenNorm === normalizeToken((o as any).v_aor_past_2pl)) return true
  if ((o as any)?.v_aor_past_3pl && tokenNorm === normalizeToken((o as any).v_aor_past_3pl)) return true
  if ((o as any)?.v_aor_fut_1sg && tokenNorm === normalizeToken((o as any).v_aor_fut_1sg)) return true
  if ((o as any)?.v_aor_fut_2sg && tokenNorm === normalizeToken((o as any).v_aor_fut_2sg)) return true
  if ((o as any)?.v_aor_fut_3sg && tokenNorm === normalizeToken((o as any).v_aor_fut_3sg)) return true
  if ((o as any)?.v_aor_fut_1pl && tokenNorm === normalizeToken((o as any).v_aor_fut_1pl)) return true
  if ((o as any)?.v_aor_fut_2pl && tokenNorm === normalizeToken((o as any).v_aor_fut_2pl)) return true
  if ((o as any)?.v_aor_fut_3pl && tokenNorm === normalizeToken((o as any).v_aor_fut_3pl)) return true
  if ((o as any)?.v_aor_na_1sg && tokenNorm === normalizeToken((o as any).v_aor_na_1sg)) return true
  if ((o as any)?.v_aor_na_2sg && tokenNorm === normalizeToken((o as any).v_aor_na_2sg)) return true
  if ((o as any)?.v_aor_na_3sg && tokenNorm === normalizeToken((o as any).v_aor_na_3sg)) return true
  if ((o as any)?.v_aor_na_1pl && tokenNorm === normalizeToken((o as any).v_aor_na_1pl)) return true
  if ((o as any)?.v_aor_na_2pl && tokenNorm === normalizeToken((o as any).v_aor_na_2pl)) return true
  if ((o as any)?.v_aor_na_3pl && tokenNorm === normalizeToken((o as any).v_aor_na_3pl)) return true

  if (!stripGreekTonos(lemma).endsWith('ω')) return false
  const stem = lemma.slice(0, -1)

  // Β2: -ώ（現在形は -είς/-εί/-ούμε/-είτε/-ούν）
  if (
    entry.inflectionType === 'verb_pres_act_B2_-ώ_-ησα' ||
    entry.inflectionType === 'verb_pres_act_B2_-ώ_-ασα' ||
    entry.inflectionType === 'verb_pres_act_B2_-ώ_-εσα'
  ) {
    const forms = [
      `${stem}ώ`,
      `${stem}είς`,
      `${stem}εί`,
      `${stem}ούμε`,
      `${stem}είτε`,
      `${stem}ούν`,
    ]
    return forms.some((f) => tokenNorm === normalizeToken(f) || tokenNorm === stripGreekTonos(normalizeToken(f)))
  }

  // A系: -ω
  if (
    entry.inflectionType === 'verb_pres_act_-ω' ||
    entry.inflectionType === 'verb_pres_act_-γω_-χω_-χνω' ||
    entry.inflectionType === 'verb_pres_act_-πω_-φω_-βω_-εύω'
  ) {
    return (
      tokenNorm === `${stem}ω` ||
      tokenNorm === `${stem}εις` ||
      tokenNorm === `${stem}ει` ||
      tokenNorm === `${stem}ουμε` ||
      tokenNorm === `${stem}ετε` ||
      tokenNorm === `${stem}ουν` ||
      tokenNorm === `${stem}ουνε`
    )
  }

  // Β1: -άω（現在形は特殊）
  if (
    entry.inflectionType === 'verb_pres_act_B1_-άω_-ησα' ||
    entry.inflectionType === 'verb_pres_act_B1_-άω_-εσα' ||
    entry.inflectionType === 'verb_pres_act_B1_-άω_-ασα'
  ) {
    return (
      tokenNorm === `${stem}ω` ||
      tokenNorm === `${stem}ς` ||
      tokenNorm === `${stem}` ||
      tokenNorm === `${stem}ει` ||
      tokenNorm === `${stem}με` ||
      tokenNorm === `${stem}τε` ||
      tokenNorm === `${stem}νε`
    )
  }

  return false
}

function nounStem(lemmaNorm: string, type: InflectionType): string | null {
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  if (
    type === 'noun_2nd_neut_-ος' ||
    type === 'noun_masc_-ος_last' ||
    type === 'noun_masc_-ος_penult' ||
    type === 'noun_masc_-ος_antepenult'
  )
    return lemmaPlain.endsWith('ος') ? lemmaNorm.slice(0, -2) : null
  if (
    type === 'noun_masc_-ας_penult' ||
    type === 'noun_masc_-ας_antepenult' ||
    type === 'noun_masc_-ας_disyllabic' ||
    type === 'noun_masc_-ας_istas_ias'
  )
    return lemmaPlain.endsWith('ας') ? lemmaNorm.slice(0, -2) : null
  if (
    type === 'noun_masc_-ης_last' ||
    type === 'noun_masc_-ης_penult' ||
    type === 'noun_masc_-ης_-εις_last' ||
    type === 'noun_masc_-ης_-εις_penult'
  )
    return lemmaPlain.endsWith('ης') ? lemmaNorm.slice(0, -2) : null
  if (type === 'noun_2nd_neut_-ο') return lemmaPlain.endsWith('ο') ? lemmaNorm.slice(0, -1) : null
  if (type === 'noun_neut_-ι') return lemmaPlain.endsWith('ι') ? lemmaNorm.slice(0, -1) : null
  if (type === 'noun_neut_-ί') return lemmaPlain.endsWith('ι') ? lemmaNorm.slice(0, -1) : null
  if (type === 'noun_neut_-υ_-ια' || type === 'noun_neut_-υ_-υα') return lemmaPlain.endsWith('υ') ? lemmaNorm.slice(0, -1) : null
  if (type === 'noun_neut_-μα_2syll' || type === 'noun_neut_-μα_3plus') return lemmaPlain.endsWith('μα') ? lemmaNorm.slice(0, -2) : null
  if (type === 'noun_neut_-μο') return lemmaPlain.endsWith('μο') ? lemmaNorm.slice(0, -2) : null
  if (type === 'noun_fem_-η') return lemmaPlain.endsWith('η') ? lemmaNorm.slice(0, -1) : null
  if (type === 'noun_fem_-α' || type === 'noun_fem_-ά') return lemmaPlain.endsWith('α') ? lemmaNorm.slice(0, -1) : null
  if (type === 'noun_fem_-ος') return lemmaPlain.endsWith('ος') ? lemmaNorm.slice(0, -2) : null
  if (type === 'noun_fem_-ού') return lemmaPlain.endsWith('ου') ? lemmaNorm.slice(0, -2) : null
  return null
}

function nounFormsForMatch(entry: Entry, lemmaNorm: string) {
  const o = entry.inflectionOverrides
  if (
    o?.n_nom_sg ||
    o?.n_acc_sg ||
    o?.n_gen_sg ||
    o?.n_nom_pl ||
    o?.n_acc_pl ||
    o?.n_gen_pl
  ) {
    const all = [o?.n_nom_sg, o?.n_acc_sg, o?.n_gen_sg, o?.n_nom_pl, o?.n_acc_pl, o?.n_gen_pl]
      .map((x) => normalizeToken(x ?? ''))
      .filter(Boolean)
    return Array.from(new Set(all))
  }

  const genders: NounGender[] =
    entry.pos === 'noun' && entry.nounGender === 'common_mf'
      ? (['masc', 'fem'] as const)
      : entry.nounGender
        ? [entry.nounGender]
        : []

  const types: InflectionType[] = Array.from(
    new Set(
      (genders.length ? genders : [undefined]).map((g) =>
        resolveNounInflectionType(entry.pos === 'noun' ? ({ ...entry, nounGender: g } as Entry) : entry, lemmaNorm),
      ),
    ),
  )

  const out: string[] = []
  for (const type of types) {
    const stem = nounStem(lemmaNorm, type)
    if (!stem) continue

    const stemPlain = stripGreekTonos(stem)
    const applyLikeLemma = (w: string) => applyAccentFrom(w, lemmaNorm)
    const withPlain = (forms: string[]) => Array.from(new Set(forms.flatMap((f) => [f, stripGreekTonos(f)])))

    if (type === 'noun_masc_-ος_last' || type === 'noun_masc_-ος_penult' || type === 'noun_masc_-ος_antepenult') {
      out.push(
        ...withPlain([
          applyLikeLemma(`${stemPlain}ος`),
          applyLikeLemma(`${stemPlain}οι`),
          applyLikeLemma(`${stemPlain}ου`),
          applyLikeLemma(`${stemPlain}ων`),
          applyLikeLemma(`${stemPlain}ο`),
          applyLikeLemma(`${stemPlain}ους`),
        ]),
      )
      continue
    }
    if (type === 'noun_2nd_neut_-ο') {
      out.push(`${stem}ο`, `${stem}α`, `${stem}ου`, `${stem}ων`)
      continue
    }
    if (type === 'noun_2nd_neut_-ος') {
      const nomAccSg = [`${stem}ος`]
      const genSg = [`${stem}ους`]
      const nomAccPl = [`${stem}η`]
      const genPl = Array.from(new Set([`${stem}ων`, addTonosOnLastVowel(`${stem}ων`), addTonosOnAntepenultVowel(`${stem}ων`)]))
      out.push(...Array.from(new Set([...nomAccSg, ...genSg, ...nomAccPl, ...genPl])))
      continue
    }
    if (type === 'noun_fem_-α' || type === 'noun_fem_-ά') {
      const genPlPlain = `${stemPlain}ων`
      out.push(
        ...withPlain([
          applyLikeLemma(`${stemPlain}α`),
          applyLikeLemma(`${stemPlain}ες`),
          applyLikeLemma(`${stemPlain}ας`),
          applyLikeLemma(genPlPlain),
          addTonosOnLastVowel(genPlPlain),
        ]),
      )
      continue
    }
    if (type === 'noun_fem_-η') {
      const genPlPlain = `${stemPlain}ων`
      out.push(
        ...withPlain([
          applyLikeLemma(`${stemPlain}η`),
          applyLikeLemma(`${stemPlain}ες`),
          applyLikeLemma(`${stemPlain}ης`),
          applyLikeLemma(genPlPlain),
          addTonosOnLastVowel(genPlPlain),
        ]),
      )
      continue
    }
    if (type === 'noun_fem_-ος') {
      out.push(
        ...withPlain([
          applyLikeLemma(`${stemPlain}ος`),
          applyLikeLemma(`${stemPlain}οι`),
          applyLikeLemma(`${stemPlain}ου`),
          applyLikeLemma(`${stemPlain}ων`),
          applyLikeLemma(`${stemPlain}ο`),
          applyLikeLemma(`${stemPlain}ους`),
        ]),
      )
      continue
    }
    if (type === 'noun_fem_-ού') {
      out.push(
        ...withPlain([
          applyLikeLemma(`${stemPlain}ου`),
          applyLikeLemma(`${stemPlain}ουδες`),
          applyLikeLemma(`${stemPlain}ους`),
          applyLikeLemma(`${stemPlain}ουδων`),
        ]),
      )
      continue
    }
    if (
      type === 'noun_masc_-ας_penult' ||
      type === 'noun_masc_-ας_antepenult' ||
      type === 'noun_masc_-ας_disyllabic' ||
      type === 'noun_masc_-ας_istas_ias'
    ) {
      const genPlPlain = `${stemPlain}ων`
      const genPl =
        type === 'noun_masc_-ας_disyllabic' || type === 'noun_masc_-ας_istas_ias'
          ? addTonosOnLastVowel(genPlPlain)
          : type === 'noun_masc_-ας_antepenult'
            ? addTonosOnNthFromEndVowel(genPlPlain, 2)
            : applyLikeLemma(genPlPlain)
      out.push(...withPlain([applyLikeLemma(`${stemPlain}ας`), applyLikeLemma(`${stemPlain}α`), applyLikeLemma(`${stemPlain}ες`), genPl]))
      continue
    }

    // ここ以降（-ης, 中性など）は従来ロジックをそのまま流用するため、
    // 既存の分岐を抜けた場合は後続の if 群に任せたいが、構造上 return しているので、
    // 通性対応は -ος 系中心で十分なためここでは追加しない。
  }

  if (out.length) return Array.from(new Set(out))

  // フォールバック（従来どおり）
  const type = resolveNounInflectionType(entry, lemmaNorm)
  const stem = nounStem(lemmaNorm, type)
  if (!stem) return []

  const stemPlain = stripGreekTonos(stem)
  const applyLikeLemma = (w: string) => applyAccentFrom(w, lemmaNorm)
  const withPlain = (forms: string[]) => Array.from(new Set(forms.flatMap((f) => [f, stripGreekTonos(f)])))

  if (type === 'noun_masc_-ος_last' || type === 'noun_masc_-ος_penult' || type === 'noun_masc_-ος_antepenult')
    return withPlain([
      applyLikeLemma(`${stemPlain}ος`),
      applyLikeLemma(`${stemPlain}οι`),
      applyLikeLemma(`${stemPlain}ου`),
      applyLikeLemma(`${stemPlain}ων`),
      applyLikeLemma(`${stemPlain}ο`),
      applyLikeLemma(`${stemPlain}ους`),
    ])
  if (type === 'noun_2nd_neut_-ο') return [`${stem}ο`, `${stem}α`, `${stem}ου`, `${stem}ων`]
  if (type === 'noun_2nd_neut_-ος') {
    const nomAccSg = [`${stem}ος`]
    const genSg = [`${stem}ους`]
    const nomAccPl = [`${stem}η`]
    const genPl = Array.from(new Set([`${stem}ων`, addTonosOnLastVowel(`${stem}ων`), addTonosOnAntepenultVowel(`${stem}ων`)]))
    return Array.from(new Set([...nomAccSg, ...genSg, ...nomAccPl, ...genPl]))
  }
  if (type === 'noun_fem_-α' || type === 'noun_fem_-ά') {
    const genPlPlain = `${stemPlain}ων`
    return withPlain([
      applyLikeLemma(`${stemPlain}α`),
      applyLikeLemma(`${stemPlain}ες`),
      applyLikeLemma(`${stemPlain}ας`),
      applyLikeLemma(genPlPlain),
      addTonosOnLastVowel(genPlPlain),
    ])
  }
  if (type === 'noun_fem_-η') {
    const genPlPlain = `${stemPlain}ων`
    return withPlain([
      applyLikeLemma(`${stemPlain}η`),
      applyLikeLemma(`${stemPlain}ες`),
      applyLikeLemma(`${stemPlain}ης`),
      applyLikeLemma(genPlPlain),
      addTonosOnLastVowel(genPlPlain),
    ])
  }
  if (type === 'noun_fem_-ος')
    return withPlain([
      applyLikeLemma(`${stemPlain}ος`),
      applyLikeLemma(`${stemPlain}οι`),
      applyLikeLemma(`${stemPlain}ου`),
      applyLikeLemma(`${stemPlain}ων`),
      applyLikeLemma(`${stemPlain}ο`),
      applyLikeLemma(`${stemPlain}ους`),
    ])
  if (type === 'noun_fem_-ού')
    return withPlain([
      applyLikeLemma(`${stemPlain}ου`),
      applyLikeLemma(`${stemPlain}ουδες`),
      applyLikeLemma(`${stemPlain}ους`),
      applyLikeLemma(`${stemPlain}ουδων`),
    ])
  if (
    type === 'noun_masc_-ας_penult' ||
    type === 'noun_masc_-ας_antepenult' ||
    type === 'noun_masc_-ας_disyllabic' ||
    type === 'noun_masc_-ας_istas_ias'
  ) {
    const genPlPlain = `${stemPlain}ων`
    const genPl =
      type === 'noun_masc_-ας_disyllabic' || type === 'noun_masc_-ας_istas_ias'
        ? addTonosOnLastVowel(genPlPlain)
        : type === 'noun_masc_-ας_antepenult'
          ? addTonosOnNthFromEndVowel(genPlPlain, 2)
          : applyLikeLemma(genPlPlain)
    return withPlain([applyLikeLemma(`${stemPlain}ας`), applyLikeLemma(`${stemPlain}α`), applyLikeLemma(`${stemPlain}ες`), genPl])
  }

  if (type === 'noun_masc_-ης_last' || type === 'noun_masc_-ης_penult') {
    const genPlPlain = `${stemPlain}ων`
    const genPl = type === 'noun_masc_-ης_penult' ? addTonosOnLastVowel(genPlPlain) : applyLikeLemma(genPlPlain)
    return withPlain([applyLikeLemma(`${stemPlain}ης`), applyLikeLemma(`${stemPlain}η`), applyLikeLemma(`${stemPlain}ες`), genPl])
  }

  if (type === 'noun_masc_-ης_-εις_last' || type === 'noun_masc_-ης_-εις_penult')
    return withPlain([
      applyLikeLemma(`${stemPlain}ης`),
      applyLikeLemma(`${stemPlain}η`),
      applyLikeLemma(`${stemPlain}εις`),
      applyLikeLemma(`${stemPlain}εων`),
    ])
  if (type === 'noun_neut_-ι')
    return [
      `${stem}ι`,
      `${stem}ια`,
      `${stem}ιου`,
      `${stem}ιού`,
      `${stem}ιων`,
      `${stem}ιών`,
      `${stripGreekTonos(stem)}ιου`,
      `${stripGreekTonos(stem)}ιού`,
      `${stripGreekTonos(stem)}ιων`,
      `${stripGreekTonos(stem)}ιών`,
    ]
  if (type === 'noun_neut_-ί') {
    const base = stripGreekTonos(lemmaNorm).slice(0, -1)
    return Array.from(
      new Set([
        addTonosOnLastVowel(`${base}ι`),
        addTonosOnLastVowel(`${base}ια`),
        addTonosOnLastVowel(`${base}ιου`),
        addTonosOnLastVowel(`${base}ιων`),
      ]),
    )
  }
  if (type === 'noun_neut_-υ_-ια' || type === 'noun_neut_-υ_-υα') {
    const base = stripGreekTonos(lemmaNorm).slice(0, -1)
    const iStem = `${base}ι`
    const pl = type === 'noun_neut_-υ_-υα' ? `${base}υα` : `${base}ια`
    return Array.from(
      new Set([
        applyLikeLemma(`${base}υ`),
        applyLikeLemma(pl),
        addTonosOnLastVowel(`${iStem}ου`),
        addTonosOnLastVowel(`${iStem}ων`),
      ]),
    )
  }
  if (type === 'noun_neut_-μα_2syll' || type === 'noun_neut_-μα_3plus') {
    const base = stripGreekTonos(lemmaNorm).slice(0, -2)
    const nomAccPl =
      type === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${base}ματα`) : addTonosOnAntepenultVowel(`${base}ματα`)
    const genSg =
      type === 'noun_neut_-μα_3plus' ? addTonosOnAntepenultVowel(`${base}ματος`) : addTonosOnAntepenultVowel(`${base}ματος`)
    const genPlPen = addTonosOnPenultVowel(`${base}ματων`)
    const genPl = type === 'noun_neut_-μα_2syll' ? Array.from(new Set([genPlPen, addTonosOnAntepenultVowel(`${base}ματων`)])) : [genPlPen]
    return Array.from(new Set([applyLikeLemma(`${base}μα`), nomAccPl, genSg, ...genPl]))
  }
  if (type === 'noun_neut_-μο') {
    const base = stripGreekTonos(lemmaNorm).slice(0, -2)
    return Array.from(
      new Set([
        applyLikeLemma(`${base}μο`),
        addTonosOnPenultVowel(`${base}ματα`),
        addTonosOnPenultVowel(`${base}ματος`),
        addTonosOnPenultVowel(`${base}ματων`),
      ]),
    )
  }

  return []
}

function nounMatchesToken(tokenNorm: string, entry: Entry): boolean {
  const lemmaNorm = normalizeToken(entry.foreignLemma ?? '')
  if (!lemmaNorm) return false
  const forms = nounFormsForMatch(entry, lemmaNorm)
  return forms.includes(tokenNorm)
}

async function findByForeignTokenWithInflection(norm: string): Promise<Entry | undefined> {
  const byForm = await findByForeignForm(norm)
  if (byForm) return byForm

  const byLemma = await findByForeignLemma(norm)
  if (byLemma) return byLemma

  // 動詞: まずは -ω 現在能動の最小ルール
  const verbs = await db.entries.where('pos').equals('verb').limit(300).toArray()
  for (const v of verbs) {
    if (verbMatchesToken(norm, v)) return v
  }

  // 名詞: 活用タイプを見出し語から推定して照合
  const nouns = await db.entries.where('pos').equals('noun').limit(500).toArray()
  for (const n of nouns) {
    if (nounMatchesToken(norm, n)) return n
  }

  return undefined
}

async function findByMeaningJa(norm: string): Promise<Entry | undefined> {
  // 日本語側は形態素が難しいので、プロトタイプは「スペース区切りの単語一致」前提
  // meaningJaVariants（別名・複数意味）を完全一致で引く（複数語に拡張するのは後段）
  return db.entries.where('meaningJaVariants').equals(norm).first()
}

async function suggestForUnknownForeign(norm: string): Promise<UnknownSpan['suggestions']> {
  const candidates = await db.entries.limit(200).toArray()
  const scored: Array<{ entryId: number; label: string; score: number }> = []
  for (const e of candidates) {
    const forms = e.foreignForms.map(normalizeToken)
    const best = Math.min(
      ...forms.map((f) => levenshtein(norm, f)),
      levenshtein(norm, normalizeToken(e.foreignLemma ?? '')),
    )
    const label = `${e.foreignLemma ?? e.foreignForms[0] ?? '(no form)'} → ${e.meaningJaPrimary}`
    scored.push({ entryId: e.id ?? -1, label, score: best })
  }
  return scored
    .filter((x) => x.entryId !== -1)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
}

export async function translateKnownOnly(
  input: string,
  direction: TranslateDirection,
): Promise<TranslateResult> {
  const toks = tokenize(input)
  const pieces: TranslateResult['pieces'] = []
  const unknowns: UnknownSpan[] = []

  let wordIndex = 0
  for (const t of toks) {
    if (t.kind === 'sep') {
      pieces.push({ kind: 'sep', raw: t.raw })
      continue
    }

    if (direction === 'foreign_to_ja') {
      const entry = await findByForeignTokenWithInflection(t.norm)
      if (entry?.id != null) {
        pieces.push({ kind: 'known', raw: t.raw, out: entry.meaningJaPrimary, entryId: entry.id })
      } else {
        pieces.push({ kind: 'unknown', raw: t.raw })
        unknowns.push({
          token: t.raw,
          index: wordIndex,
          suggestions: await suggestForUnknownForeign(t.norm),
        })
      }
    } else {
      const entry = await findByMeaningJa(t.norm)
      if (entry?.id != null) {
        const out = entry.foreignLemma ?? entry.foreignForms[0] ?? ''
        pieces.push({ kind: 'known', raw: t.raw, out, entryId: entry.id })
      } else {
        pieces.push({ kind: 'unknown', raw: t.raw })
        unknowns.push({ token: t.raw, index: wordIndex, suggestions: [] })
      }
    }
    wordIndex++
  }

  return { pieces, unknowns }
}

