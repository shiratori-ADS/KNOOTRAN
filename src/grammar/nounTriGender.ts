import type { Entry } from '../db/types'
import { normalizeToken } from '../lib/normalize'

/** 名詞（男・女・中）の手動上書きキー（形容詞の a_m_* 相当） */
export const NOUN_TRI_GENDER_KEYS = [
  'n_m_nom_sg',
  'n_m_gen_sg',
  'n_m_acc_sg',
  'n_f_nom_sg',
  'n_f_gen_sg',
  'n_f_acc_sg',
  'n_n_nom_sg',
  'n_n_gen_sg',
  'n_n_acc_sg',
  'n_m_nom_pl',
  'n_m_gen_pl',
  'n_m_acc_pl',
  'n_f_nom_pl',
  'n_f_gen_pl',
  'n_f_acc_pl',
  'n_n_nom_pl',
  'n_n_gen_pl',
  'n_n_acc_pl',
] as const

export type NounTriGenderKey = (typeof NOUN_TRI_GENDER_KEYS)[number]

export function hasNounTriGenderOverrides(overrides: Entry['inflectionOverrides'] | undefined): boolean {
  const o = overrides ?? {}
  return NOUN_TRI_GENDER_KEYS.some((k) => {
    const v = (o as Record<string, string>)[k]
    return typeof v === 'string' && v.trim()
  })
}

export function collectNounTriGenderForms(overrides: Entry['inflectionOverrides'] | undefined): string[] {
  const o = overrides ?? {}
  return Array.from(
    new Set(NOUN_TRI_GENDER_KEYS.map((k) => normalizeToken((o as Record<string, string>)[k] ?? '')).filter(Boolean)),
  )
}
