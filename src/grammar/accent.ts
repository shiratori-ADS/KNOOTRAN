const VOWEL_MAP: Record<string, string> = {
  α: 'ά',
  ε: 'έ',
  η: 'ή',
  ι: 'ί',
  ο: 'ό',
  υ: 'ύ',
  ω: 'ώ',
  Α: 'Ά',
  Ε: 'Έ',
  Η: 'Ή',
  Ι: 'Ί',
  Ο: 'Ό',
  Υ: 'Ύ',
  Ω: 'Ώ',
}

const ACCENTED_VOWELS = new Set([
  'ά',
  'έ',
  'ή',
  'ί',
  'ό',
  'ύ',
  'ώ',
  'Ά',
  'Έ',
  'Ή',
  'Ί',
  'Ό',
  'Ύ',
  'Ώ',
])

const DEACCENT_MAP: Record<string, string> = {
  ά: 'α',
  έ: 'ε',
  ή: 'η',
  ί: 'ι',
  ό: 'ο',
  ύ: 'υ',
  ώ: 'ω',
  Ά: 'Α',
  Έ: 'Ε',
  Ή: 'Η',
  Ί: 'Ι',
  Ό: 'Ο',
  Ύ: 'Υ',
  Ώ: 'Ω',
}

function isVowel(ch: string): boolean {
  return ch in VOWEL_MAP || ACCENTED_VOWELS.has(ch)
}

export function stripGreekTonos(input: string): string {
  if (!input) return input
  // NFCで合成しつつ、結合トノスも除去（例: α\u0301）
  const nfc = input.normalize('NFC').replace(/\u0301/g, '')
  return [...nfc].map((c) => (DEACCENT_MAP[c] ? DEACCENT_MAP[c] : c)).join('')
}

export type AccentPositionFromEnd = 'last' | 'penult' | 'antepenult' | 'none'

// 母音ユニットとして扱う2文字（最小セット + よく出る ia/ie/io）
const VOWEL_UNITS_2 = new Set([
  'αι',
  'ει',
  'οι',
  'ου',
  'αυ',
  'ευ',
  'ηυ',
  // 「ια/ιε/ιο」は厳密には常に1音節ではないが、
  // 本ツールの「最小ヒューリスティック」では母音ユニットとして扱う。
  'ια',
  'ιε',
  'ιο',
])

export function accentPositionFromEnd(word: string): AccentPositionFromEnd {
  if (!word) return 'none'
  const chars = [...word]
  const vowelIdx: number[] = []
  let accentedVowelIdx = -1
  for (let i = 0; i < chars.length; i++) {
    if (isVowel(chars[i])) vowelIdx.push(i)
    if (ACCENTED_VOWELS.has(chars[i])) accentedVowelIdx = i
  }
  if (accentedVowelIdx === -1) return 'none'
  const vPos = vowelIdx.indexOf(accentedVowelIdx)
  if (vPos === -1) return 'none'
  const fromEnd = vowelIdx.length - vPos
  if (fromEnd === 1) return 'last'
  if (fromEnd === 2) return 'penult'
  if (fromEnd === 3) return 'antepenult'
  return 'none'
}

/**
 * 母音ユニット（例: ου/ευ/αι など）として数えた場合の、
 * アクセント位置（後ろから last/penult/antepenult）を返す。
 *
 * NOTE:
 * - 二重母音は後ろ側の母音にトノスが乗る前提で index を数える
 */
export function accentPositionFromEndByVowelUnit(word: string): AccentPositionFromEnd {
  if (!word) return 'none'
  const plain = stripGreekTonos(word)
  if (!plain) return 'none'

  const targets: number[] = []
  let accentedTargetIdx = -1

  for (let i = 0; i < plain.length; i++) {
    const two = plain.slice(i, i + 2)
    if (two.length === 2 && VOWEL_UNITS_2.has(two)) {
      const idx = i + 1
      targets.push(idx)
      if (ACCENTED_VOWELS.has([...word][idx] ?? '')) accentedTargetIdx = targets.length - 1
      i++
      continue
    }
    if (isVowel(plain[i] ?? '')) {
      targets.push(i)
      if (ACCENTED_VOWELS.has([...word][i] ?? '')) accentedTargetIdx = targets.length - 1
    }
  }

  if (accentedTargetIdx === -1) return 'none'
  const fromEnd = targets.length - accentedTargetIdx
  if (fromEnd === 1) return 'last'
  if (fromEnd === 2) return 'penult'
  if (fromEnd === 3) return 'antepenult'
  return 'none'
}

export function vowelCount(word: string): number {
  if (!word) return 0
  const chars = [...stripGreekTonos(word)]
  let n = 0
  for (const c of chars) if (isVowel(c)) n++
  return n
}

export function addTonosOnNthFromEndVowel(word: string, n: 1 | 2 | 3): string {
  if (!word) return word
  const chars = [...stripGreekTonos(word)]
  const vowelIdx: number[] = []
  for (let i = 0; i < chars.length; i++) {
    if (isVowel(chars[i])) vowelIdx.push(i)
  }
  if (vowelIdx.length < n) return word
  const target = vowelIdx[vowelIdx.length - n]
  const ch = chars[target]
  const accented = VOWEL_MAP[ch]
  if (!accented) return word
  chars[target] = accented
  return chars.join('')
}

/**
 * 母音ユニット（αι/ει/οι/ου/αυ/ευ/ηυ を1つ）として数え、
 * 後ろから n 個目の母音ユニットにトノスを付与する。
 *
 * NOTE:
 * - 既存トノスは stripGreekTonos で除去して付け直す
 * - 二重母音は後ろ側の母音にトノス（例: ου→ού, ευ→εύ）
 */
export function addTonosOnNthFromEndVowelUnit(word: string, n: 1 | 2 | 3): string {
  const plain = stripGreekTonos(word)
  if (!plain) return word

  const targets: number[] = []
  for (let i = 0; i < plain.length; i++) {
    const two = plain.slice(i, i + 2)
    if (two.length === 2 && VOWEL_UNITS_2.has(two)) {
      targets.push(i + 1)
      i++
      continue
    }
    if (isVowel(plain[i] ?? '')) targets.push(i)
  }
  if (targets.length < n) return word

  const idx = targets[targets.length - n]!
  const chars = [...plain]
  const ch = chars[idx] ?? ''
  const accented = VOWEL_MAP[ch]
  if (!accented) return word
  chars[idx] = accented
  return chars.join('')
}

/**
 * 最後の母音にトノスを付与（既存トノスは一旦外して付け直す）
 * 例: μαθητης -> μαθητής, μαθητη -> μαθητή
 */
export function addTonosOnLastVowel(word: string): string {
  return addTonosOnNthFromEndVowel(word, 1)
}

export function hasEndingTonos(word: string): boolean {
  if (!word) return false
  const chars = [...word]
  // 語尾付近にトノス付き母音があれば「語尾にトノス」扱い
  for (let i = Math.max(0, chars.length - 4); i < chars.length; i++) {
    if (ACCENTED_VOWELS.has(chars[i])) return true
  }
  return false
}

/**
 * 後ろから3つ目の母音にトノスを付与。
 * すでにトノスが別位置にある場合は「移動」する（例: πρόβληματα -> προβλήματα）。
 *
 * 例:
 * - ονοματος -> ονόματος
 * - ονοματα -> ονόματα
 * - πρόβληματα -> προβλήματα
 */
export function addTonosOnAntepenultVowel(word: string): string {
  return addTonosOnNthFromEndVowel(word, 3)
}

export function addTonosOnPenultVowel(word: string): string {
  return addTonosOnNthFromEndVowel(word, 2)
}

export function applyAccentFrom(word: string, source: string): string {
  const pos = accentPositionFromEnd(source)
  if (pos === 'none') return word
  if (pos === 'last') return addTonosOnLastVowel(word)
  if (pos === 'penult') return addTonosOnPenultVowel(word)
  return addTonosOnAntepenultVowel(word)
}

export function applyAccentFromByVowelUnit(word: string, source: string): string {
  const pos = accentPositionFromEndByVowelUnit(source)
  if (pos === 'none') return word
  if (pos === 'last') return addTonosOnNthFromEndVowelUnit(word, 1)
  if (pos === 'penult') return addTonosOnNthFromEndVowelUnit(word, 2)
  return addTonosOnNthFromEndVowelUnit(word, 3)
}

