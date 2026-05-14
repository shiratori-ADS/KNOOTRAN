/** 照合・推定・重複判定用（小文字化あり） */
export function normalizeToken(input: string): string {
  return input.normalize('NFC').trim().toLowerCase()
}

/** 単語帳の見出し語・別形の保存・表示用（大文字・小文字は入力どおり。NFC と前後空白のみ整える） */
export function normalizeForeignStorage(input: string): string {
  return input.normalize('NFC').trim()
}

