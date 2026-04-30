import type { ExamplePair } from '../db/types'
import { normalizeToken } from './normalize'

export function normalizeExamplePairs(raw: unknown): ExamplePair[] {
  if (!Array.isArray(raw)) return []
  const out: ExamplePair[] = []
  for (const x of raw) {
    if (typeof x === 'string') {
      const foreign = x.normalize('NFC').trim()
      if (foreign) out.push({ foreign, ja: '' })
      continue
    }
    if (x && typeof x === 'object') {
      const rec = x as Record<string, unknown>
      const foreign = typeof rec.foreign === 'string' ? rec.foreign.normalize('NFC').trim() : ''
      const ja = typeof rec.ja === 'string' ? rec.ja.trim() : ''
      if (foreign || ja) out.push({ foreign, ja })
    }
  }
  return out
}

// 1行 = 「原文[TAB]訳」または「原文 → 訳」/「原文 => 訳」
export function parseExamplePairsText(text: string): ExamplePair[] {
  const lines = (text ?? '')
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean)

  const out: ExamplePair[] = []
  for (const line of lines) {
    const tab = line.split('\t')
    if (tab.length >= 2) {
      const foreign = tab[0]!.trim()
      const ja = tab.slice(1).join('\t').trim()
      if (foreign || ja) out.push({ foreign: foreign.normalize('NFC'), ja })
      continue
    }

    const arrowMatch = line.match(/^(.*?)(?:\s*(?:→|=>|=>>|->)\s*)(.*)$/)
    if (arrowMatch) {
      const foreign = (arrowMatch[1] ?? '').trim()
      const ja = (arrowMatch[2] ?? '').trim()
      if (foreign || ja) out.push({ foreign: foreign.normalize('NFC'), ja })
      continue
    }

    // fallback: 原文のみ
    out.push({ foreign: line.normalize('NFC'), ja: '' })
  }

  // foreign が空の行は落とす（訳だけの行は保存しない）
  const cleaned = out
    .map((x) => ({ foreign: x.foreign.trim(), ja: x.ja.trim() }))
    .filter((x) => x.foreign)

  // 同じ原文の重複を潰す（後勝ち）
  const map = new Map<string, ExamplePair>()
  for (const x of cleaned) map.set(normalizeToken(x.foreign), x)
  return Array.from(map.values())
}

export function formatExamplePairsText(examples: unknown): string {
  const pairs = normalizeExamplePairs(examples)
  return pairs
    .map((x) => (x.ja?.trim() ? `${x.foreign}\t${x.ja}` : x.foreign))
    .join('\n')
}

