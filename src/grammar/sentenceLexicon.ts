import type { InflectionType, NounGender } from '../db/types'

export type InflectionOverridesLike = Partial<Record<string, string>>

export type VerbLike = {
  id: number
  lemma: string
  meaningJaPrimary: string
  inflectionType?: InflectionType
  inflectionOverrides?: InflectionOverridesLike
}

export type NounLike = {
  id: number
  lemma: string
  meaningJaPrimary: string
  nounGender?: NounGender
  inflectionType?: InflectionType
  inflectionOverrides?: InflectionOverridesLike
}

