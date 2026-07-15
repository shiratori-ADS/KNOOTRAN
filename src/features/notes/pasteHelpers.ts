/** Excel / スプレッドシートからの貼り付け用（表データ検出・変換） */

export const PASTE_TABLE_MAX_ROWS = 30
export const PASTE_TABLE_MAX_COLS = 12

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function normalizeCellText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\r\n|\r/g, '\n').trim()
}

function cellHtml(text: string): string {
  const normalized = normalizeCellText(text)
  if (!normalized) return '&nbsp;'
  return escapeHtml(normalized).replace(/\n/g, '<br>')
}

export function clampTableMatrix(
  matrix: string[][],
  maxRows = PASTE_TABLE_MAX_ROWS,
  maxCols = PASTE_TABLE_MAX_COLS,
): string[][] {
  return matrix.slice(0, maxRows).map((row) => row.slice(0, maxCols))
}

function padMatrix(matrix: string[][]): string[][] {
  if (matrix.length === 0) return matrix
  const colCount = Math.max(...matrix.map((r) => r.length), 1)
  return matrix.map((row) => {
    const next = row.slice()
    while (next.length < colCount) next.push('')
    return next
  })
}

function parseHtmlTable(html: string): string[][] | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table')
  if (!table) return null

  const matrix: string[][] = []
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const row: string[] = []
    for (const cell of Array.from(tr.children)) {
      if (!(cell instanceof HTMLTableCellElement)) continue
      // colspan は単純に同じ文字を展開しない（1セル分のテキストだけ入れる）
      row.push(normalizeCellText(cell.textContent ?? ''))
      const span = Math.max(1, cell.colSpan || 1)
      for (let i = 1; i < span; i += 1) row.push('')
    }
    if (row.length > 0) matrix.push(row)
  }
  return matrix.length > 0 ? padMatrix(matrix) : null
}

function parseTsvOrPlainGrid(text: string): string[][] | null {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!normalized.trim()) return null

  const lines = normalized.split('\n')
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length === 0) return null

  const hasTab = lines.some((line) => line.includes('\t'))
  if (hasTab) {
    return padMatrix(lines.map((line) => line.split('\t').map((c) => normalizeCellText(c))))
  }

  // 複数行で、Excelの1列コピーなど（タブ無し）
  if (lines.length >= 2) {
    return padMatrix(lines.map((line) => [normalizeCellText(line)]))
  }

  return null
}

/** クリップボードが表データなら行列を返す。普通のテキストなら null */
export function parseClipboardAsTable(html: string | null, plain: string | null): string[][] | null {
  if (html) {
    const fromHtml = parseHtmlTable(html)
    if (fromHtml && (fromHtml.length > 1 || (fromHtml[0]?.length ?? 0) > 1 || html.toLowerCase().includes('<table'))) {
      // 1x1 の table も Excel 由来なら表として扱う
      return clampTableMatrix(padMatrix(fromHtml))
    }
  }

  if (plain) {
    const fromPlain = parseTsvOrPlainGrid(plain)
    if (fromPlain) return clampTableMatrix(padMatrix(fromPlain))
  }

  return null
}

/** 貼り付け行列から note-table の HTML を生成（すべて tbody の td） */
export function buildTableHtmlFromMatrix(matrix: string[][]): string {
  const safe = clampTableMatrix(padMatrix(matrix))
  if (safe.length === 0) return ''
  const bodyRows = safe
    .map((row) => `<tr>${row.map((cell) => `<td contenteditable="true">${cellHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  return `<table class="note-table"><tbody>${bodyRows}</tbody></table><p><br></p>`
}

export function setTableCellText(cell: HTMLTableCellElement, text: string): void {
  cell.innerHTML = cellHtml(text)
}
