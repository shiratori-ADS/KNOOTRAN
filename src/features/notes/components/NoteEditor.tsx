import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildTableHtml,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
  getTableContext,
  insertTableColumn,
  insertTableRow,
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

function applyFontSize(size: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  if (range.collapsed) {
    document.execCommand('fontSize', false, '7')
    const fontElements = document.querySelectorAll('font[size="7"]')
    const last = fontElements[fontElements.length - 1] as HTMLElement | undefined
    if (last) {
      const span = document.createElement('span')
      span.style.fontSize = size
      span.innerHTML = last.innerHTML
      last.replaceWith(span)
    }
    return
  }
  const span = document.createElement('span')
  span.style.fontSize = size
  try {
    range.surroundContents(span)
  } catch {
    document.execCommand('insertHTML', false, `<span style="font-size:${size}">${range.toString()}</span>`)
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
      exec(() => applyFontSize(size))
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
