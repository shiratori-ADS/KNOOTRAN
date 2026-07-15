export type CellTextAlign = 'left' | 'center' | 'right'

export type TableInsertOptions = {
  rows: number
  cols: number
  withHeader: boolean
}

export type TableContext = {
  table: HTMLTableElement
  cell: HTMLTableCellElement
  colIndex: number
  section: 'head' | 'body'
}

export function buildTableHtml({ rows, cols, withHeader }: TableInsertOptions): string {
  const safeRows = Math.max(1, Math.min(rows, 30))
  const safeCols = Math.max(1, Math.min(cols, 12))
  const header =
    withHeader
      ? `<thead><tr>${Array.from({ length: safeCols }, (_, i) => `<th contenteditable="true">列${i + 1}</th>`).join('')}</tr></thead>`
      : ''
  const bodyRows = Array.from({ length: safeRows }, () => {
    const cells = Array.from({ length: safeCols }, () => '<td contenteditable="true">&nbsp;</td>').join('')
    return `<tr>${cells}</tr>`
  }).join('')
  return `<table class="note-table">${header}<tbody>${bodyRows}</tbody></table><p><br></p>`
}

export function getTableContext(root: HTMLElement | null): TableContext | null {
  if (!root) return null
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  let node: Node | null = selection.anchorNode
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement
  if (!node || !(node instanceof HTMLElement)) return null

  const cell = node.closest('td, th')
  if (!cell || !(cell instanceof HTMLTableCellElement)) return null

  const table = cell.closest('table.note-table')
  if (!table || !(table instanceof HTMLTableElement) || !root.contains(table)) return null

  const row = cell.parentElement
  if (!row) return null
  const colIndex = Array.from(row.children).indexOf(cell)
  if (colIndex < 0) return null

  const section: 'head' | 'body' = row.parentElement?.tagName === 'THEAD' ? 'head' : 'body'
  return { table, cell, colIndex, section }
}

function cellFromNode(node: Node): HTMLTableCellElement | null {
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const cell = el?.closest('td, th')
  return cell instanceof HTMLTableCellElement ? cell : null
}

export function getCellsInRange(root: HTMLElement, range: Range): HTMLTableCellElement[] {
  const cells = new Set<HTMLTableCellElement>()
  const startCell = cellFromNode(range.startContainer)
  const endCell = cellFromNode(range.endContainer)
  if (startCell) cells.add(startCell)
  if (endCell) cells.add(endCell)

  const ancestor = range.commonAncestorContainer
  const container = ancestor.nodeType === Node.ELEMENT_NODE ? (ancestor as Element) : ancestor.parentElement
  const table = container?.closest('table.note-table')
  if (!table || !root.contains(table)) return Array.from(cells)

  for (const cell of table.querySelectorAll('td, th')) {
    if (!(cell instanceof HTMLTableCellElement)) continue
    const cellRange = document.createRange()
    cellRange.selectNodeContents(cell)
    if (range.compareBoundaryPoints(Range.END_TO_START, cellRange) >= 0) continue
    if (range.compareBoundaryPoints(Range.START_TO_END, cellRange) <= 0) continue
    cells.add(cell)
  }
  return Array.from(cells)
}

export function getSelectedColumnIndexes(root: HTMLElement, range: Range): number[] {
  const cells = getCellsInRange(root, range)
  if (cells.length === 0) return []

  const indexes = new Set<number>()
  for (const cell of cells) {
    const row = cell.parentElement
    if (!row) continue
    const colIndex = Array.from(row.children).indexOf(cell)
    if (colIndex >= 0) indexes.add(colIndex)
  }
  return Array.from(indexes).sort((a, b) => a - b)
}

export function readCellTextAlign(cell: HTMLTableCellElement): CellTextAlign {
  const inline = cell.style.textAlign
  if (inline === 'center' || inline === 'right') return inline
  return 'left'
}

export function applyCellTextAlign(cells: HTMLTableCellElement[], align: CellTextAlign) {
  for (const cell of cells) {
    cell.style.textAlign = align
  }
}

export function readCellBackgroundColor(cell: HTMLTableCellElement): string {
  return cell.style.backgroundColor.trim()
}

/** color が空文字のときは背景色をクリア */
export function applyCellBackgroundColor(cells: HTMLTableCellElement[], color: string) {
  for (const cell of cells) {
    cell.style.backgroundColor = color
  }
}

function createCell(tag: 'td' | 'th'): HTMLTableCellElement {
  const cell = document.createElement(tag)
  cell.contentEditable = 'true'
  cell.innerHTML = '&nbsp;'
  return cell
}

function tableRowCount(table: HTMLTableElement): number {
  const headRows = table.tHead?.rows.length ?? 0
  const bodyRows = table.tBodies[0]?.rows.length ?? 0
  return headRows + bodyRows
}

function tableColCount(table: HTMLTableElement): number {
  const sections = [table.tHead, ...Array.from(table.tBodies)].filter(Boolean)
  for (const section of sections) {
    const first = section!.rows[0]
    if (first) return first.cells.length
  }
  return 0
}

function forEachRow(table: HTMLTableElement, fn: (row: HTMLTableRowElement, section: 'head' | 'body') => void) {
  if (table.tHead) {
    for (const row of Array.from(table.tHead.rows)) fn(row, 'head')
  }
  for (const tbody of Array.from(table.tBodies)) {
    for (const row of Array.from(tbody.rows)) fn(row, 'body')
  }
}

function getAllRowsOrdered(table: HTMLTableElement): HTMLTableRowElement[] {
  const rows: HTMLTableRowElement[] = []
  if (table.tHead) rows.push(...Array.from(table.tHead.rows))
  for (const tbody of Array.from(table.tBodies)) rows.push(...Array.from(tbody.rows))
  return rows
}

export function placeCaretInCell(cell: HTMLTableCellElement): void {
  const range = document.createRange()
  range.selectNodeContents(cell)
  range.collapse(true)
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

function buildContextFromCell(cell: HTMLTableCellElement): TableContext | null {
  const table = cell.closest('table.note-table')
  if (!(table instanceof HTMLTableElement)) return null

  const row = cell.parentElement
  if (!row) return null

  const colIndex = Array.from(row.children).indexOf(cell)
  if (colIndex < 0) return null

  const section: 'head' | 'body' = row.parentElement?.tagName === 'THEAD' ? 'head' : 'body'
  return { table, cell, colIndex, section }
}

export function focusTableCell(table: HTMLTableElement, rowIndex: number, colIndex: number): TableContext | null {
  const rows = getAllRowsOrdered(table)
  if (rows.length === 0) return null

  const row = rows[Math.max(0, Math.min(rowIndex, rows.length - 1))]
  const safeColIndex = Math.max(0, Math.min(colIndex, row.cells.length - 1))
  const cell = row.cells[safeColIndex]
  if (!(cell instanceof HTMLTableCellElement)) return null

  placeCaretInCell(cell)
  return buildContextFromCell(cell)
}

function ensureColgroup(table: HTMLTableElement): HTMLTableColElement[] {
  const colCount = tableColCount(table)
  let colgroup = table.querySelector('colgroup')
  if (!colgroup) {
    colgroup = document.createElement('colgroup')
    const first = table.tHead ?? table.tBodies[0] ?? table.querySelector('tr')
    if (first) table.insertBefore(colgroup, first)
    else table.prepend(colgroup)
  }
  while (colgroup.children.length < colCount) {
    colgroup.appendChild(document.createElement('col'))
  }
  while (colgroup.children.length > colCount) {
    colgroup.lastElementChild?.remove()
  }
  return Array.from(colgroup.children) as HTMLTableColElement[]
}

function parseWidthPx(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const px = Number(trimmed.replace(/px$/i, ''))
  if (!Number.isFinite(px) || px <= 0) return null
  return Math.round(px)
}

export function readColumnWidthPx(ctx: TableContext): number | null {
  return readColumnsWidthPx(ctx.table, [ctx.colIndex])
}

export function readColumnsWidthPx(table: HTMLTableElement, colIndexes: number[]): number | null {
  if (colIndexes.length === 0) return null
  const widths = colIndexes.map((colIndex) => {
    const col = ensureColgroup(table)[colIndex]
    if (col?.style.width) {
      const fromCol = parseWidthPx(col.style.width)
      if (fromCol != null) return fromCol
    }
    for (const section of [table.tHead, ...Array.from(table.tBodies)]) {
      if (!section) continue
      const row = section.rows[0]
      const cell = row?.cells[colIndex]
      if (cell instanceof HTMLTableCellElement && cell.style.width) {
        const fromCell = parseWidthPx(cell.style.width)
        if (fromCell != null) return fromCell
      }
    }
    return null
  })

  const defined = widths.filter((w): w is number => w != null)
  if (defined.length === 0) return null
  const first = defined[0]
  return defined.every((w) => w === first) ? first : null
}

function applyColumnWidthAt(table: HTMLTableElement, colIndex: number, widthPx: number | null): void {
  const width = widthPx != null && widthPx > 0 ? `${widthPx}px` : ''
  const cols = ensureColgroup(table)
  const col = cols[colIndex]
  if (col) col.style.width = width

  forEachRow(table, (row) => {
    const cell = row.cells[colIndex]
    if (!cell) return
    cell.style.width = width
    if (width) {
      cell.style.minWidth = width
      cell.style.maxWidth = width
    } else {
      cell.style.minWidth = ''
      cell.style.maxWidth = ''
    }
  })
}

export function applyColumnWidth(ctx: TableContext, widthPx: number | null): void {
  applyColumnWidthAt(ctx.table, ctx.colIndex, widthPx)
}

export function applyColumnsWidth(table: HTMLTableElement, colIndexes: number[], widthPx: number | null): void {
  ensureColgroup(table)
  for (const colIndex of colIndexes) {
    applyColumnWidthAt(table, colIndex, widthPx)
  }
}

export function insertTableRow(ctx: TableContext, position: 'above' | 'below'): void {
  const row = ctx.cell.parentElement as HTMLTableRowElement
  const tag = ctx.section === 'head' ? 'th' : 'td'
  const newRow = document.createElement('tr')
  const colCount = row.cells.length
  for (let i = 0; i < colCount; i += 1) {
    newRow.appendChild(createCell(tag))
  }
  if (position === 'above') row.before(newRow)
  else row.after(newRow)
}

export function insertTableColumn(ctx: TableContext, position: 'left' | 'right'): void {
  const insertIndex = position === 'left' ? ctx.colIndex : ctx.colIndex + 1
  forEachRow(ctx.table, (row, section) => {
    const tag = section === 'head' ? 'th' : 'td'
    const newCell = createCell(tag)
    const ref = row.cells[insertIndex]
    if (ref) row.insertBefore(newCell, ref)
    else row.appendChild(newCell)
  })
  ensureColgroup(ctx.table)
}

export function deleteTableRow(ctx: TableContext): boolean {
  if (tableRowCount(ctx.table) <= 1) return false
  const row = ctx.cell.parentElement as HTMLTableRowElement
  const rowIndex = getAllRowsOrdered(ctx.table).indexOf(row)
  const colIndex = ctx.colIndex
  row.remove()
  focusTableCell(ctx.table, rowIndex, colIndex)
  return true
}

export function deleteTableColumn(ctx: TableContext): boolean {
  if (tableColCount(ctx.table) <= 1) return false
  const row = ctx.cell.parentElement as HTMLTableRowElement
  const rowIndex = getAllRowsOrdered(ctx.table).indexOf(row)
  const colIndex = ctx.colIndex
  forEachRow(ctx.table, (targetRow) => {
    targetRow.cells[colIndex]?.remove()
  })
  ensureColgroup(ctx.table)
  focusTableCell(ctx.table, rowIndex, Math.min(colIndex, row.cells.length - 1))
  return true
}

export function deleteTable(ctx: TableContext): void {
  const after = document.createElement('p')
  after.innerHTML = '<br>'
  ctx.table.replaceWith(after)
}

function appendTableColumn(table: HTMLTableElement): void {
  forEachRow(table, (row, section) => {
    const tag = section === 'head' ? 'th' : 'td'
    row.appendChild(createCell(tag))
  })
  ensureColgroup(table)
}

function appendTableBodyRow(table: HTMLTableElement): void {
  let tbody = table.tBodies[0]
  if (!tbody) {
    tbody = document.createElement('tbody')
    table.appendChild(tbody)
  }
  const colCount = Math.max(tableColCount(table), 1)
  const newRow = document.createElement('tr')
  for (let i = 0; i < colCount; i += 1) {
    newRow.appendChild(createCell('td'))
  }
  tbody.appendChild(newRow)
  ensureColgroup(table)
}

/**
 * 既存表のセルを起点に行列データを貼り付ける。
 * 足りない行・列は末尾に追加する（上限は呼び出し側で clamp 済み想定）。
 */
export function pasteMatrixIntoNoteTable(ctx: TableContext, matrix: string[][]): void {
  if (matrix.length === 0) return
  const colCount = Math.max(...matrix.map((r) => r.length), 1)
  const startRows = getAllRowsOrdered(ctx.table)
  const startRowEl = ctx.cell.parentElement as HTMLTableRowElement
  let startRowIndex = startRows.indexOf(startRowEl)
  if (startRowIndex < 0) startRowIndex = 0
  const startColIndex = ctx.colIndex

  while (tableColCount(ctx.table) < startColIndex + colCount) {
    appendTableColumn(ctx.table)
  }

  while (getAllRowsOrdered(ctx.table).length < startRowIndex + matrix.length) {
    appendTableBodyRow(ctx.table)
  }

  const rows = getAllRowsOrdered(ctx.table)
  for (let r = 0; r < matrix.length; r += 1) {
    const row = rows[startRowIndex + r]
    if (!row) continue
    for (let c = 0; c < matrix[r].length; c += 1) {
      const cell = row.cells[startColIndex + c]
      if (!(cell instanceof HTMLTableCellElement)) continue
      const text = matrix[r][c] ?? ''
      const normalized = text.replace(/\u00a0/g, ' ').replace(/\r\n|\r/g, '\n').trim()
      if (!normalized) {
        cell.innerHTML = '&nbsp;'
      } else {
        cell.textContent = normalized
      }
    }
  }

  focusTableCell(ctx.table, startRowIndex, startColIndex)
}
