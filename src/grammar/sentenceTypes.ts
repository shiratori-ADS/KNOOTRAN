export type SentencePerson = '1sg' | '2sg' | '3sg' | '1pl' | '2pl' | '3pl' | 'unknown'
export type SentenceNounCase = 'nom' | 'acc' | 'gen' | 'unknown'

export type SentenceAnalysis = {
  verb?: { token: string; entryId: number; lemma: string; person: SentencePerson }
  nouns: Array<{ token: string; entryId: number; lemma: string; case: SentenceNounCase }>
}

export type SentenceResult = {
  analysis: SentenceAnalysis
  ja: string
  unknownTokens: string[]
}

