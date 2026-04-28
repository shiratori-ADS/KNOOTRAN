import type { Entry, InflectionType, NounGender } from '../db/types'
import {
  addTonosOnAntepenultVowel,
  addTonosOnLastVowel,
  addTonosOnNthFromEndVowel,
  applyAccentFromByVowelUnit,
  stripGreekTonos,
} from './accent'
import { inferNounInflectionTypeFromLemma, resolveNounInflectionType } from './infer'

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

export function resolveNounTypeForMatrix(
  selected: Pick<Entry, 'pos' | 'inflectionType' | 'nounGender' | 'inflectionOverrides'>,
  lemmaNorm: string,
): InflectionType {
  return resolveNounInflectionType(selected, lemmaNorm)
}

export type NounAutoForms = {
  n_nom_sg: string
  n_nom_pl: string
  n_acc_sg: string
  n_acc_pl: string
  n_gen_sg: string
  n_gen_pl: string
}

export type NounMatrix = {
  rows: Array<{
    number: 'sg' | 'pl'
    forms: { nom: string; gen: string; acc: string }
  }>
}

export function nounAutoForms(lemmaNorm: string, gender: NounGender, t?: InflectionType): NounAutoForms | null {
  const type = t && t !== 'none' ? t : inferNounInflectionTypeFromLemma(lemmaNorm, gender)
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  const applyLikeLemma = (w: string) => applyAccentFromByVowelUnit(w, lemmaNorm)

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
    const nomAccPl = addTonosOnAntepenultVowel(`${st}ματα`)
    return {
      n_nom_sg: applyLikeLemma(`${st}μα`),
      n_nom_pl: nomAccPl,
      n_acc_sg: applyLikeLemma(`${st}μα`),
      n_acc_pl: nomAccPl,
      n_gen_sg: addTonosOnAntepenultVowel(`${st}ματος`),
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

export function nounMatrix(lemmaNorm: string, t?: InflectionType): NounMatrix | null {
  const lemmaPlain = stripGreekTonos(lemmaNorm)
  const applyLikeLemma = (w: string) => applyAccentFromByVowelUnit(w, lemmaNorm)

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
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: accSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: accPl } },
      ],
    }
  }
  if (t === 'noun_2nd_neut_-ο') {
    if (!lemmaPlain.endsWith('ο')) return null
    const stem = lemmaNorm.slice(0, -1)
    return {
      rows: [
        { number: 'sg', forms: { nom: `${stem}ο`, gen: `${stem}ου`, acc: `${stem}ο` } },
        { number: 'pl', forms: { nom: `${stem}α`, gen: `${stem}ων`, acc: `${stem}α` } },
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
        ? `${genPlLast} · ${genPlAnte}`
        : genPlLast !== genPlPlain
          ? genPlLast
          : genPlPlain
    return {
      rows: [
        {
          number: 'sg',
          forms: { nom: `${stem}ος`, gen: `${stem}ους`, acc: `${stem}ος` },
        },
        {
          number: 'pl',
          forms: { nom: `${stem}η`, gen: genPlCell, acc: `${stem}η` },
        },
      ],
    }
  }
  if (t === 'noun_fem_-η') {
    if (!lemmaPlain.endsWith('η')) return null
    const stemPlain = lemmaPlain.slice(0, -1)
    return {
      rows: [
        {
          number: 'sg',
          forms: {
            nom: applyLikeLemma(`${stemPlain}η`),
            gen: applyLikeLemma(`${stemPlain}ης`),
            acc: applyLikeLemma(`${stemPlain}η`),
          },
        },
        {
          number: 'pl',
          forms: {
            nom: applyLikeLemma(`${stemPlain}ες`),
            gen: applyLikeLemma(`${stemPlain}ων`),
            acc: applyLikeLemma(`${stemPlain}ες`),
          },
        },
      ],
    }
  }
  if (t === 'noun_fem_-α' || t === 'noun_fem_-ά') {
    if (!lemmaPlain.endsWith('α')) return null
    const stemPlain = lemmaPlain.slice(0, -1)
    return {
      rows: [
        {
          number: 'sg',
          forms: {
            nom: applyLikeLemma(`${stemPlain}α`),
            gen: applyLikeLemma(`${stemPlain}ας`),
            acc: applyLikeLemma(`${stemPlain}α`),
          },
        },
        {
          number: 'pl',
          forms: {
            nom: applyLikeLemma(`${stemPlain}ες`),
            gen: applyLikeLemma(`${stemPlain}ων`),
            acc: applyLikeLemma(`${stemPlain}ες`),
          },
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
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: accSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: accPl } },
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
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: accSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: accPl } },
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
      rows: [
        {
          number: 'sg',
          forms: {
            nom: applyLikeLemma(`${stem}ας`),
            gen: applyLikeLemma(`${stem}α`),
            acc: applyLikeLemma(`${stem}α`),
          },
        },
        {
          number: 'pl',
          forms: {
            nom: applyLikeLemma(`${stem}ες`),
            gen: genPl,
            acc: applyLikeLemma(`${stem}ες`),
          },
        },
      ],
    }
  }

  if (t === 'noun_masc_-ης_last' || t === 'noun_masc_-ης_penult') {
    if (!lemmaPlain.endsWith('ης')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    const genPlPlain = `${stem}ων`
    const genPl = t === 'noun_masc_-ης_penult' ? addTonosOnLastVowel(genPlPlain) : applyLikeLemma(genPlPlain)
    return {
      rows: [
        {
          number: 'sg',
          forms: {
            nom: applyLikeLemma(`${stem}ης`),
            gen: applyLikeLemma(`${stem}η`),
            acc: applyLikeLemma(`${stem}η`),
          },
        },
        {
          number: 'pl',
          forms: {
            nom: applyLikeLemma(`${stem}ες`),
            gen: genPl,
            acc: applyLikeLemma(`${stem}ες`),
          },
        },
      ],
    }
  }

  if (t === 'noun_masc_-ης_-εις_last' || t === 'noun_masc_-ης_-εις_penult') {
    if (!lemmaPlain.endsWith('ης')) return null
    const stem = stripGreekTonos(lemmaNorm.slice(0, -2))
    return {
      rows: [
        {
          number: 'sg',
          forms: {
            nom: applyLikeLemma(`${stem}ης`),
            gen: applyLikeLemma(`${stem}η`),
            acc: applyLikeLemma(`${stem}η`),
          },
        },
        {
          number: 'pl',
          forms: {
            nom: applyLikeLemma(`${stem}εις`),
            gen: applyLikeLemma(`${stem}εων`),
            acc: applyLikeLemma(`${stem}εις`),
          },
        },
      ],
    }
  }
  if (t === 'noun_neut_-ι') {
    if (!lemmaPlain.endsWith('ι')) return null
    const stem = lemmaNorm.slice(0, -1)
    const stemNoTonos = stripGreekTonos(stem)
    return {
      rows: [
        // -ι 名詞の属格はアクセント位置が変わるため、語幹側のトノスは外す（例: σπίτιού → σπιτιού）
        { number: 'sg', forms: { nom: `${stem}ι`, gen: `${stemNoTonos}ιού`, acc: `${stem}ι` } },
        { number: 'pl', forms: { nom: `${stem}ια`, gen: `${stemNoTonos}ιών`, acc: `${stem}ια` } },
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
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: nomSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: nomPl } },
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
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: nomSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: nomPl } },
      ],
    }
  }
  if (t === 'noun_neut_-μα_2syll' || t === 'noun_neut_-μα_3plus') {
    if (!lemmaPlain.endsWith('μα')) return null
    const stem = lemmaPlain.slice(0, -2)
    const nomSg = lemmaNorm
    const genSg = addTonosOnAntepenultVowel(`${stem}ματος`)
    const nomPl = addTonosOnAntepenultVowel(`${stem}ματα`)
    const genPl = addTonosOnNthFromEndVowel(`${stem}ματων`, 2)
    return {
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: nomSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: nomPl } },
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
      rows: [
        { number: 'sg', forms: { nom: nomSg, gen: genSg, acc: nomSg } },
        { number: 'pl', forms: { nom: nomPl, gen: genPl, acc: nomPl } },
      ],
    }
  }
  return null
}

