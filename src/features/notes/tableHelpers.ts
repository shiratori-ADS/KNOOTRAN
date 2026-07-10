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
}

export function deleteTableRow(ctx: TableContext): boolean {
  if (tableRowCount(ctx.table) <= 1) return false
  const row = ctx.cell.parentElement as HTMLTableRowElement
  row.remove()
  return true
}

export function deleteTableColumn(ctx: TableContext): boolean {
  if (tableColCount(ctx.table) <= 1) return false
  forEachRow(ctx.table, (row) => {
    row.cells[ctx.colIndex]?.remove()
  })
  return true
}

export function deleteTable(ctx: TableContext): void {
  const after = document.createElement('p')
  after.innerHTML = '<br>'
  ctx.table.replaceWith(after)
}
