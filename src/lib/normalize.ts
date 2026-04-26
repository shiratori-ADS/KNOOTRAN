export function normalizeToken(input: string): string {
  return input.normalize('NFC').trim().toLowerCase()
}

