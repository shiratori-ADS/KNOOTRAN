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
 * - 二重母音は通常後ろ側の母音にトノス（ου 等）。ια/ιε/ιο は前側にもあり得る（例: τραπεζαρία）
 * - -ίας の ια は分離し、属格のアクセント（-άς）に対応
 */
/** 母音ユニット1つ分（語幹上の開始位置と、トノスを載せる文字 index） */
type VowelUnitSpan = { start: number; accentAt: number }

/** ια/ιε/ιο を1ユニットにまとめるか（-ίας は分離して属格のアクセントに対応） */
function mergeAsVowelUnit(two: string, plain: string, i: number): boolean {
  if (!VOWEL_UNITS_2.has(two)) return false
  if (two === 'ιε') return true
  if (two === 'ια' || two === 'ιο') {
    const next = plain[i + 2] ?? ''
    return next !== 'ς' && next !== 'σ'
  }
  return true
}

function collectVowelUnitSpans(plain: string, accentedWord: string): VowelUnitSpan[] {
  const chars = [...accentedWord]
  const units: VowelUnitSpan[] = []

  for (let i = 0; i < plain.length; i++) {
    const two = plain.slice(i, i + 2)
    if (two.length === 2 && mergeAsVowelUnit(two, plain, i)) {
      const accentedOnFirst = ACCENTED_VOWELS.has(chars[i] ?? '')
      const accentedOnSecond = ACCENTED_VOWELS.has(chars[i + 1] ?? '')
      // 検出時: どちらかにトノスがあればその位置。なければ後ろ母音（ου 等の既定）
      const accentAt = accentedOnFirst ? i : accentedOnSecond ? i + 1 : i + 1
      units.push({ start: i, accentAt })
      i++
      continue
    }
    if (isVowel(plain[i] ?? '')) {
      units.push({ start: i, accentAt: i })
    }
  }
  return units
}

function accentedVowelUnitIndex(units: VowelUnitSpan[], accentedWord: string): number {
  const chars = [...accentedWord]
  const plain = stripGreekTonos(accentedWord)
  for (let u = 0; u < units.length; u++) {
    const { start } = units[u]!
    const two = plain.slice(start, start + 2)
    if (two.length === 2 && mergeAsVowelUnit(two, plain, start)) {
      if (ACCENTED_VOWELS.has(chars[start] ?? '') || ACCENTED_VOWELS.has(chars[start + 1] ?? '')) return u
      continue
    }
    if (ACCENTED_VOWELS.has(chars[start] ?? '')) return u
  }
  return -1
}

export function accentPositionFromEndByVowelUnit(word: string): AccentPositionFromEnd {
  if (!word) return 'none'
  const plain = stripGreekTonos(word)
  if (!plain) return 'none'

  const units = collectVowelUnitSpans(plain, word)
  const accentedUnitIdx = accentedVowelUnitIndex(units, word)
  if (accentedUnitIdx === -1) return 'none'

  const fromEnd = units.length - accentedUnitIdx
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
 * - 二重母音は既定で後ろ側の母音（例: ου→ού）。sourceAccentWord を渡すと、
 *   その語の同じ母音ユニット内の前後どちらにトノスがあったかを写す（例: τραπεζαρία の ι）
 */
export function addTonosOnNthFromEndVowelUnit(
  word: string,
  n: 1 | 2 | 3,
  sourceAccentWord?: string,
): string {
  const plain = stripGreekTonos(word)
  if (!plain) return word

  const targetUnits = collectVowelUnitSpans(plain, plain)
  if (targetUnits.length < n) return word

  const targetUnit = targetUnits[targetUnits.length - n]!
  let accentAt = targetUnit.accentAt

  if (sourceAccentWord) {
    const sourcePlain = stripGreekTonos(sourceAccentWord)
    const sourceUnits = collectVowelUnitSpans(sourcePlain, sourceAccentWord)
    const sourceUnit = sourceUnits[sourceUnits.length - n]
    if (sourceUnit) {
      const offset = sourceUnit.accentAt - sourceUnit.start
      const two = plain.slice(targetUnit.start, targetUnit.start + 2)
      accentAt =
        two.length === 2 && mergeAsVowelUnit(two, plain, targetUnit.start)
          ? targetUnit.start + Math.min(offset, 1)
          : targetUnit.start
    }
  }

  const chars = [...plain]
  const ch = chars[accentAt] ?? ''
  const accented = VOWEL_MAP[ch]
  if (!accented) return word
  chars[accentAt] = accented
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
  if (pos === 'none') return applyAccentFrom(word, source)
  if (pos === 'last') return addTonosOnNthFromEndVowelUnit(word, 1, source)
  if (pos === 'penult') return addTonosOnNthFromEndVowelUnit(word, 2, source)
  return addTonosOnNthFromEndVowelUnit(word, 3, source)
}

