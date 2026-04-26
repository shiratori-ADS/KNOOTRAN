export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const m = a.length
  const n = b.length
  const dp = new Array<number>(n + 1)

  for (let j = 0; j <= n; j++) dp[j] = j

  for (let i = 1; i <= m; i++) {
    let prevDiag = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prevDiag + cost)
      prevDiag = tmp
    }
  }

  return dp[n]
}

