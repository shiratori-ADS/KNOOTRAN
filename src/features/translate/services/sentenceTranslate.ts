import { db } from '../../../db/db'
import { normalizeToken } from '../../../lib/normalize'
import { normalizeExamplePairs } from '../../../lib/examples'
import { tokenize } from '../../../lib/tokenize'
import type { Entry } from '../../../db/types'
import { stripGreekTonos } from '../../../grammar/accent'
import { translateSentenceForeignToJaCore } from '../../../grammar/engine'
import type { SentenceResult } from '../../../grammar/sentenceTypes'
import type { NounLike, VerbLike } from '../../../grammar/sentenceLexicon'

function stripPunct(s: string) {
  return s.replace(/[.··;,:!?]/g, '')
}

export async function translateSentenceForeignToJa(input: string): Promise<SentenceResult> {
  // 例文が完全一致する場合は、その訳を最優先（「参考」用の最小実装）
  const inputNorm = normalizeToken(stripPunct(input))
  if (inputNorm) {
    const entriesWithExamples = await db.entries.where('pos').equals('verb').limit(300).toArray()
    // verbs 以外も例文は持てるので、追加で少し見る（全件は重いので上限）
    const others = await db.entries.where('pos').notEqual('verb').limit(400).toArray()
    const pool = [...entriesWithExamples, ...others]
    for (const e of pool) {
      const pairs = normalizeExamplePairs(e.examples)
      const hit = pairs.find((p) => normalizeToken(stripPunct(p.foreign)) === inputNorm && p.ja.trim())
      if (hit) {
        return { analysis: { nouns: [] }, ja: hit.ja.trim(), unknownTokens: [] }
      }
    }
  }

  const toks = tokenize(input)
    .filter((t) => t.kind === 'word')
    .map((t) => normalizeToken(stripPunct(t.raw)))
    .filter(Boolean)

  // 文モードは当面「動詞/名詞だけ」見ればよいので、必要分だけ読む
  const verbs: Entry[] = await db.entries.where('pos').equals('verb').limit(300).toArray()
  const nouns: Entry[] = await db.entries.where('pos').equals('noun').limit(500).toArray()

  // 解析は grammar 側の純ロジックへ委譲
  return translateSentenceForeignToJaCore({
    tokens: toks.map((t) => normalizeToken(stripGreekTonos(t))),
    verbs: verbs
      .filter((v): v is Entry & { id: number } => typeof v.id === 'number')
      .map(
        (v): VerbLike => ({
          id: v.id,
          lemma: v.foreignLemma ?? '',
          meaningJaPrimary: v.meaningJaPrimary,
          inflectionType: v.inflectionType,
          inflectionOverrides: v.inflectionOverrides,
        }),
      ),
    nouns: nouns
      .filter((n): n is Entry & { id: number } => typeof n.id === 'number')
      .map(
        (n): NounLike => ({
          id: n.id,
          lemma: n.foreignLemma ?? '',
          meaningJaPrimary: n.meaningJaPrimary,
          nounGender: n.nounGender,
          inflectionType: n.inflectionType,
          inflectionOverrides: n.inflectionOverrides,
        }),
      ),
  })
}

