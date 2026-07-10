import { useCallback, useEffect, useRef, useState } from 'react'
import {
  applyCellTextAlign,
  buildTableHtml,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
  getCellsInRange,
  getTableContext,
  insertTableColumn,
  insertTableRow,
  readCellTextAlign,
  type CellTextAlign,
  type TableContext,
  type TableInsertOptions,
} from '../tableHelpers'
import { NotesToolbar } from './NotesToolbar'
import { TableEditToolbar } from './TableEditToolbar'
import { TableInsertDialog } from './TableInsertDialog'

type Props = {
  pageId: number
  content: string
  onChange: (html: string) => void
}

function replaceFontSizeMarkers(editor: HTMLElement, size: string) {
  const fonts = editor.querySelectorAll('font[size="7"]')
  fonts.forEach((font) => {
    const span = document.createElement('span')
    span.style.fontSize = size
    while (font.firstChild) span.appendChild(font.firstChild)
    font.replaceWith(span)
  })
}

function wrapTextNodeWithFontSize(textNode: Text, start: number, end: number, size: string) {
  let target = textNode
  if (end < target.length) target.splitText(end)
  if (start > 0) target = target.splitText(start)

  const span = document.createElement('span')
  span.style.fontSize = size
  target.parentNode?.insertBefore(span, target)
  span.appendChild(target)
}

function getSelectedTableCells(editor: HTMLElement, range: Range): HTMLTableCellElement[] {
  return getCellsInRange(editor, range)
}

function applyFontSizeToTextNodes(range: Range, size: string, scope?: Element) {
  const root =
    scope ??
    (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement)
  if (!root) return

  const targets: Array<{ node: Text; start: number; end: number }> = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let current: Node | null
  while ((current = walker.nextNode())) {
    const node = current as Text
    if (!node.textContent?.length) continue

    const nodeRange = document.createRange()
    nodeRange.selectNodeContents(node)
    if (range.compareBoundaryPoints(Range.END_TO_START, nodeRange) >= 0) continue
    if (range.compareBoundaryPoints(Range.START_TO_END, nodeRange) <= 0) continue

    const start = node === range.startContainer ? range.startOffset : 0
    const end = node === range.endContainer ? range.endOffset : node.length
    if (start < end) targets.push({ node, start, end })
  }

  for (let i = targets.length - 1; i >= 0; i -= 1) {
    const { node, start, end } = targets[i]
    wrapTextNodeWithFontSize(node, start, end, size)
  }
}

function applyFontSizeInTable(editor: HTMLElement, range: Range, size: string) {
  for (const cell of getSelectedTableCells(editor, range)) {
    applyFontSizeToTextNodes(range, size, cell)
  }
}

function applyFontSize(editor: HTMLElement, size: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return

  if (range.collapsed) {
    document.execCommand('fontSize', false, '7')
    replaceFontSizeMarkers(editor, size)
    return
  }

  const tableCells = getSelectedTableCells(editor, range)
  if (tableCells.length > 0) {
    // execCommand は複数セル選択時に中身を1セルへ集約してしまうため、セル単位で処理する
    applyFontSizeInTable(editor, range, size)
    return
  }

  document.execCommand('fontSize', false, '7')
  const applied = editor.querySelectorAll('font[size="7"]').length > 0
  replaceFontSizeMarkers(editor, size)

  if (!applied) {
    applyFontSizeToTextNodes(range, size)
  }
}

export function NoteEditor({ pageId, content, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const tableCtxRef = useRef<TableContext | null>(null)
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [tableCtx, setTableCtx] = useState<TableContext | null>(null)
  const isInternalUpdate = useRef(false)

  const refreshTableContext = useCallback(() => {
    const ctx = getTableContext(editorRef.current)
    tableCtxRef.current = ctx
    setTableCtx(ctx)
  }, [])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (el.innerHTML !== content) {
      isInternalUpdate.current = true
      el.innerHTML = content || '<p><br></p>'
      isInternalUpdate.current = false
    }
    refreshTableContext()
  }, [pageId, content, refreshTableContext])

  useEffect(() => {
    const onSelectionChange = () => refreshTableContext()
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [refreshTableContext])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el || isInternalUpdate.current) return
    onChange(el.innerHTML)
    refreshTableContext()
  }, [onChange, refreshTableContext])

  const focusEditor = useCallback(() => {
    editorRef.current?.focus()
  }, [])

  const exec = useCallback(
    (fn: () => void) => {
      focusEditor()
      fn()
      emitChange()
    },
    [emitChange, focusEditor],
  )

  const runTableEdit = useCallback(
    (fn: (ctx: TableContext) => void) => {
      const ctx = tableCtxRef.current ?? getTableContext(editorRef.current)
      if (!ctx) return
      fn(ctx)
      emitChange()
    },
    [emitChange],
  )

  const onBold = useCallback(() => {
    exec(() => document.execCommand('bold'))
  }, [exec])

  const onFontSize = useCallback(
    (size: string) => {
      exec(() => {
        const editor = editorRef.current
        if (editor) applyFontSize(editor, size)
      })
    },
    [exec],
  )

  const onColor = useCallback(
    (color: string) => {
      exec(() => document.execCommand('foreColor', false, color))
    },
    [exec],
  )

  const onInsertTable = useCallback(
    (options: TableInsertOptions) => {
      exec(() => document.execCommand('insertHTML', false, buildTableHtml(options)))
    },
    [exec],
  )

  const onCellAlign = useCallback(
    (align: CellTextAlign) => {
      exec(() => {
        const editor = editorRef.current
        const selection = window.getSelection()
        if (!editor || !selection || selection.rangeCount === 0) return
        const range = selection.getRangeAt(0)
        let cells = getCellsInRange(editor, range)
        if (cells.length === 0) {
          const ctx = tableCtxRef.current ?? getTableContext(editor)
          if (ctx) cells = [ctx.cell]
        }
        if (cells.length > 0) applyCellTextAlign(cells, align)
      })
    },
    [exec],
  )

  const currentCellAlign = tableCtx ? readCellTextAlign(tableCtx.cell) : 'left'

  return (
    <div className="noteEditorShell">
      <NotesToolbar
        onBold={onBold}
        onFontSize={onFontSize}
        onColor={onColor}
        onOpenTableDialog={() => setTableDialogOpen(true)}
      />
      {tableCtx ? (
        <TableEditToolbar
          currentAlign={currentCellAlign}
          onAlignLeft={() => onCellAlign('left')}
          onAlignCenter={() => onCellAlign('center')}
          onAlignRight={() => onCellAlign('right')}
          onInsertRowAbove={() => runTableEdit((ctx) => insertTableRow(ctx, 'above'))}
          onInsertRowBelow={() => runTableEdit((ctx) => insertTableRow(ctx, 'below'))}
          onInsertColLeft={() => runTableEdit((ctx) => insertTableColumn(ctx, 'left'))}
          onInsertColRight={() => runTableEdit((ctx) => insertTableColumn(ctx, 'right'))}
          onDeleteRow={() => runTableEdit((ctx) => deleteTableRow(ctx))}
          onDeleteCol={() => runTableEdit((ctx) => deleteTableColumn(ctx))}
          onDeleteTable={() => {
            if (!window.confirm('この表を削除しますか？')) return
            runTableEdit((ctx) => deleteTable(ctx))
          }}
        />
      ) : null}
      <div
        ref={editorRef}
        className="noteEditor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="ノート本文"
        suppressContentEditableWarning
        onInput={emitChange}
        onClick={refreshTableContext}
        onKeyUp={refreshTableContext}
        onBlur={emitChange}
      />
      <TableInsertDialog
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onInsert={onInsertTable}
      />
    </div>
  )
}
