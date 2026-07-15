import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  applyCellBackgroundColor,
  applyCellTextAlign,
  applyColumnsWidth,
  buildTableHtml,
  deleteTable,
  deleteTableColumn,
  deleteTableRow,
  getCellsInRange,
  getTableContext,
  insertTableColumn,
  insertTableRow,
  readCellBackgroundColor,
  readCellTextAlign,
  readColumnsWidthPx,
  getSelectedColumnIndexes,
  pasteMatrixIntoNoteTable,
  type CellTextAlign,
  type TableContext,
  type TableInsertOptions,
} from '../tableHelpers'
import { buildTableHtmlFromMatrix, parseClipboardAsTable } from '../pasteHelpers'
import { pushNoteUndoSnapshot, type NoteUndoStack } from '../noteUndo'
import { NoteLinkDialog } from './NoteLinkDialog'
import { NotesToolbar } from './NotesToolbar'
import { TableEditToolbar } from './TableEditToolbar'
import { TableInsertDialog } from './TableInsertDialog'

type Props = {
  pageId: number
  content: string
  pageTitle: string
  toolbarOpen: boolean
  canDeletePage: boolean
  onAddPage: () => void
  onDeletePage: () => void
  onRenamePage: (title: string) => void
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

export function NoteEditor({
  pageId,
  content,
  pageTitle,
  toolbarOpen,
  canDeletePage,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onChange,
}: Props) {
  const navigate = useNavigate()
  const editorRef = useRef<HTMLDivElement | null>(null)
  const tableCtxRef = useRef<TableContext | null>(null)
  const selectedColIndexesRef = useRef<number[]>([])
  const savedRangeRef = useRef<Range | null>(null)
  const [tableDialogOpen, setTableDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkSelectedText, setLinkSelectedText] = useState('')
  const [tableCtx, setTableCtx] = useState<TableContext | null>(null)
  const [selectedColIndexes, setSelectedColIndexes] = useState<number[]>([])
  const [colWidthDraft, setColWidthDraft] = useState('')
  const isInternalUpdate = useRef(false)
  const isTableEditingRef = useRef(false)
  const undoStackRef = useRef<NoteUndoStack>([])
  const typingSessionRef = useRef(false)
  const typingEndTimerRef = useRef<number | null>(null)
  const [canUndo, setCanUndo] = useState(false)

  const syncCanUndo = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0)
  }, [])

  const clearUndoHistory = useCallback(() => {
    undoStackRef.current = []
    typingSessionRef.current = false
    if (typingEndTimerRef.current != null) {
      window.clearTimeout(typingEndTimerRef.current)
      typingEndTimerRef.current = null
    }
    setCanUndo(false)
  }, [])

  const pushUndoSnapshot = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    undoStackRef.current = pushNoteUndoSnapshot(undoStackRef.current, el.innerHTML)
    syncCanUndo()
  }, [syncCanUndo])

  const refreshTableContext = useCallback(() => {
    const editor = editorRef.current
    const ctx = getTableContext(editor)
    if (ctx) {
      const selection = window.getSelection()
      let colIndexes = [ctx.colIndex]
      if (editor && selection && selection.rangeCount > 0) {
        const fromRange = getSelectedColumnIndexes(editor, selection.getRangeAt(0))
        if (fromRange.length > 0) colIndexes = fromRange
      }
      tableCtxRef.current = ctx
      selectedColIndexesRef.current = colIndexes
      setTableCtx(ctx)
      setSelectedColIndexes(colIndexes)
      return
    }

    if (isTableEditingRef.current) return

    const active = document.activeElement
    if (active instanceof HTMLElement && active.closest('#note-editor-toolbar-panels')) {
      return
    }

    if (tableCtxRef.current?.table.isConnected) return

    tableCtxRef.current = null
    selectedColIndexesRef.current = []
    setTableCtx(null)
    setSelectedColIndexes([])
  }, [])

  const onToolbarMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('input, select, textarea')) return
    e.preventDefault()
  }, [])

  useEffect(() => {
    clearUndoHistory()
  }, [pageId, clearUndoHistory])

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
    return () => {
      if (typingEndTimerRef.current != null) window.clearTimeout(typingEndTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onSelectionChange = () => refreshTableContext()
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [refreshTableContext])

  useEffect(() => {
    if (!tableCtx) {
      setColWidthDraft('')
      return
    }
    const px = readColumnsWidthPx(tableCtx.table, selectedColIndexes)
    setColWidthDraft(px != null ? String(px) : '')
  }, [tableCtx, selectedColIndexes])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el || isInternalUpdate.current) return
    onChange(el.innerHTML)
    refreshTableContext()
  }, [onChange, refreshTableContext])

  const focusEditor = useCallback(() => {
    editorRef.current?.focus()
  }, [])

  const applyHtml = useCallback(
    (html: string) => {
      const el = editorRef.current
      if (!el) return
      isInternalUpdate.current = true
      el.innerHTML = html || '<p><br></p>'
      isInternalUpdate.current = false
      onChange(el.innerHTML)
      refreshTableContext()
    },
    [onChange, refreshTableContext],
  )

  const onUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return
    const prev = undoStackRef.current[undoStackRef.current.length - 1]
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    typingSessionRef.current = false
    if (typingEndTimerRef.current != null) {
      window.clearTimeout(typingEndTimerRef.current)
      typingEndTimerRef.current = null
    }
    syncCanUndo()
    applyHtml(prev)
    focusEditor()
  }, [applyHtml, focusEditor, syncCanUndo])

  const markTypingSessionEnd = useCallback(() => {
    if (typingEndTimerRef.current != null) window.clearTimeout(typingEndTimerRef.current)
    typingEndTimerRef.current = window.setTimeout(() => {
      typingSessionRef.current = false
      typingEndTimerRef.current = null
    }, 800)
  }, [])

  const onBeforeInput = useCallback(() => {
    if (isInternalUpdate.current) return
    if (!typingSessionRef.current) {
      pushUndoSnapshot()
      typingSessionRef.current = true
    }
  }, [pushUndoSnapshot])

  const onEditorInput = useCallback(() => {
    emitChange()
    markTypingSessionEnd()
  }, [emitChange, markTypingSessionEnd])

  const exec = useCallback(
    (fn: () => void) => {
      typingSessionRef.current = false
      pushUndoSnapshot()
      focusEditor()
      fn()
      emitChange()
    },
    [emitChange, focusEditor, pushUndoSnapshot],
  )

  const runTableEdit = useCallback(
    (fn: (ctx: TableContext) => void) => {
      const ctx = tableCtxRef.current ?? getTableContext(editorRef.current)
      if (!ctx) return
      typingSessionRef.current = false
      pushUndoSnapshot()
      isTableEditingRef.current = true
      try {
        fn(ctx)
      } finally {
        isTableEditingRef.current = false
      }
      emitChange()
    },
    [emitChange, pushUndoSnapshot],
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

  const captureSelectionForLink = useCallback(() => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) {
      savedRangeRef.current = null
      setLinkSelectedText('')
      return false
    }
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = null
      setLinkSelectedText('')
      return false
    }
    savedRangeRef.current = range.cloneRange()
    setLinkSelectedText(selection.toString())
    return selection.toString().trim().length > 0
  }, [])

  const restoreSavedSelection = useCallback(() => {
    const editor = editorRef.current
    const range = savedRangeRef.current
    if (!editor || !range) return false
    editor.focus()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    return true
  }, [])

  const onOpenLinkDialog = useCallback(() => {
    captureSelectionForLink()
    setLinkDialogOpen(true)
  }, [captureSelectionForLink])

  const onInsertLink = useCallback(
    (href: string) => {
      exec(() => {
        if (!restoreSavedSelection()) return
        document.execCommand('createLink', false, href)
        const selection = window.getSelection()
        const node = selection?.anchorNode
        const el = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement
        const anchor = el?.closest('a')
        if (!(anchor instanceof HTMLAnchorElement)) return
        // ブラウザが絶対URLに展開することがあるため、相対パスに戻す
        anchor.setAttribute('href', href)
        anchor.removeAttribute('target')
        anchor.setAttribute('data-note-link', 'wordbook')
      })
      savedRangeRef.current = null
    },
    [exec, restoreSavedSelection],
  )

  const onRemoveLink = useCallback(() => {
    exec(() => {
      if (!restoreSavedSelection()) return
      document.execCommand('unlink')
    })
    savedRangeRef.current = null
  }, [exec, restoreSavedSelection])

  const onEditorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest?.('a')
      const editor = editorRef.current
      if (anchor instanceof HTMLAnchorElement && editor?.contains(anchor)) {
        const rawHref = anchor.getAttribute('href') ?? ''
        try {
          const url = new URL(rawHref, window.location.origin)
          if (url.origin === window.location.origin && url.pathname.startsWith('/wordbook')) {
            e.preventDefault()
            navigate(`${url.pathname}${url.search}${url.hash}`)
            return
          }
        } catch {
          /* ignore */
        }
      }
      refreshTableContext()
    },
    [navigate, refreshTableContext],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current
      if (!editor) return

      const html = e.clipboardData.getData('text/html') || null
      const plain = e.clipboardData.getData('text/plain') || null
      const matrix = parseClipboardAsTable(html, plain)
      if (!matrix) {
        // 普通のテキスト貼り付けも履歴に残す
        typingSessionRef.current = false
        pushUndoSnapshot()
        return
      }

      e.preventDefault()
      typingSessionRef.current = false
      pushUndoSnapshot()

      const ctx = getTableContext(editor) ?? tableCtxRef.current
      if (ctx && editor.contains(ctx.table)) {
        isTableEditingRef.current = true
        try {
          pasteMatrixIntoNoteTable(ctx, matrix)
        } finally {
          isTableEditingRef.current = false
        }
        emitChange()
        return
      }

      focusEditor()
      document.execCommand('insertHTML', false, buildTableHtmlFromMatrix(matrix))
      emitChange()
    },
    [emitChange, focusEditor, pushUndoSnapshot],
  )

  const onEditorKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod || e.key.toLowerCase() !== 'z' || e.shiftKey || e.altKey) return
      if (undoStackRef.current.length === 0) return
      e.preventDefault()
      onUndo()
    },
    [onUndo],
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

  const onCellBg = useCallback(
    (color: string) => {
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
        if (cells.length > 0) applyCellBackgroundColor(cells, color)
      })
    },
    [exec],
  )

  const currentCellAlign = tableCtx ? readCellTextAlign(tableCtx.cell) : 'left'
  const currentCellBg = tableCtx ? readCellBackgroundColor(tableCtx.cell) : ''

  const onApplyColWidth = useCallback(() => {
    runTableEdit((ctx) => {
      const colIndexes = selectedColIndexesRef.current.length > 0 ? selectedColIndexesRef.current : [ctx.colIndex]
      const trimmed = colWidthDraft.trim()
      if (!trimmed) {
        applyColumnsWidth(ctx.table, colIndexes, null)
        return
      }
      const px = Number(trimmed)
      if (!Number.isFinite(px) || px < 20) return
      applyColumnsWidth(ctx.table, colIndexes, Math.min(800, Math.round(px)))
    })
  }, [colWidthDraft, runTableEdit])

  const onClearColWidth = useCallback(() => {
    setColWidthDraft('')
    runTableEdit((ctx) => {
      const colIndexes = selectedColIndexesRef.current.length > 0 ? selectedColIndexesRef.current : [ctx.colIndex]
      applyColumnsWidth(ctx.table, colIndexes, null)
    })
  }, [runTableEdit])

  return (
    <div className="noteEditorShell">
      {toolbarOpen ? (
        <div className="noteToolbarDock isOpen">
          <div id="note-editor-toolbar-panels" className="noteToolbarPanels" onMouseDown={onToolbarMouseDown}>
            <NotesToolbar
              pageTitle={pageTitle}
              canDeletePage={canDeletePage}
              canUndo={canUndo}
              onAddPage={onAddPage}
              onDeletePage={onDeletePage}
              onRenamePage={onRenamePage}
              onUndo={onUndo}
              onBold={onBold}
              onFontSize={onFontSize}
              onColor={onColor}
              onOpenTableDialog={() => setTableDialogOpen(true)}
              onOpenLinkDialog={onOpenLinkDialog}
            />
            {tableCtx ? (
              <TableEditToolbar
                currentAlign={currentCellAlign}
                currentBg={currentCellBg}
                selectedColCount={selectedColIndexes.length}
                colWidthPx={colWidthDraft}
                onColWidthPxChange={setColWidthDraft}
                onApplyColWidth={onApplyColWidth}
                onClearColWidth={onClearColWidth}
                onAlignLeft={() => onCellAlign('left')}
                onAlignCenter={() => onCellAlign('center')}
                onAlignRight={() => onCellAlign('right')}
                onCellBg={onCellBg}
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
          </div>
        </div>
      ) : null}
      <div className="noteEditorScroll">
        <div
          ref={editorRef}
          className="noteEditor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label="ノート本文"
          suppressContentEditableWarning
          onBeforeInput={onBeforeInput}
          onInput={onEditorInput}
          onClick={onEditorClick}
          onPaste={onPaste}
          onKeyDown={onEditorKeyDown}
          onKeyUp={refreshTableContext}
          onBlur={emitChange}
        />
      </div>
      <TableInsertDialog
        open={tableDialogOpen}
        onClose={() => setTableDialogOpen(false)}
        onInsert={onInsertTable}
      />
      <NoteLinkDialog
        open={linkDialogOpen}
        selectedText={linkSelectedText}
        onClose={() => setLinkDialogOpen(false)}
        onInsertLink={onInsertLink}
        onRemoveLink={onRemoveLink}
      />
    </div>
  )
}
