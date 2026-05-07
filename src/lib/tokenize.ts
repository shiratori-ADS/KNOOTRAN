import { normalizeToken } from './normalize'

export type TokenPiece =
  | { kind: 'word'; raw: string; norm: string }
  | { kind: 'sep'; raw: string }

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

