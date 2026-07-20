import { useEffect, useState } from 'react'
import { NOTE_COLORS, NOTE_FONT_SIZES } from '../noteHelpers'
import { NoteColorTileSelect } from './NoteColorTileSelect'

type Props = {
  pageTitle: string
  canDeletePage: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  canUndo: boolean
  onAddPage: () => void
  onDeletePage: () => void
  onRenamePage: (title: string) => void
  onMovePage: (direction: 'up' | 'down') => void
  onUndo: () => void
  onBold: () => void
  onFontSize: (size: string) => void
  onColor: (color: string) => void
  onOpenTableDialog: () => void
  onOpenLinkDialog: () => void
}

export function NotesToolbar({
  pageTitle,
  canDeletePage,
  canMoveUp,
  canMoveDown,
  canUndo,
  onAddPage,
  onDeletePage,
  onRenamePage,
  onMovePage,
  onUndo,
  onBold,
  onFontSize,
  onColor,
  onOpenTableDialog,
  onOpenLinkDialog,
}: Props) {
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(pageTitle)
  const [textColor, setTextColor] = useState<string>(NOTE_COLORS[0].value)

  useEffect(() => {
    setRenaming(false)
    setRenameDraft(pageTitle)
  }, [pageTitle])

  function commitRename() {
    onRenamePage(renameDraft)
    setRenaming(false)
  }

  function cancelRename() {
    setRenameDraft(pageTitle)
    setRenaming(false)
  }

  return (
    <div className="noteToolbar" role="toolbar" aria-label="書式設定">
      <span className="noteToolbarGroup">
        <span className="noteToolbarLabel">ページ</span>
        <button type="button" className="noteToolbarBtn secondary" onClick={onAddPage} aria-label="ページを追加" title="ページを追加">
          ＋
        </button>
        <button
          type="button"
          className="noteToolbarBtn secondary noteToolbarBtnIcon"
          onClick={() => onMovePage('up')}
          disabled={!canMoveUp}
          aria-label="ページを上へ"
          title="ページを上へ"
        >
          ↑
        </button>
        <button
          type="button"
          className="noteToolbarBtn secondary noteToolbarBtnIcon"
          onClick={() => onMovePage('down')}
          disabled={!canMoveDown}
          aria-label="ページを下へ"
          title="ページを下へ"
        >
          ↓
        </button>
        {renaming ? (
          <input
            className="notePageRenameInput"
            value={renameDraft}
            autoFocus
            onChange={(e) => setRenameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitRename()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                cancelRename()
              }
            }}
            aria-label="ページ名を編集"
            title="Enterで確定 / Escで取消"
          />
        ) : (
          <button
            type="button"
            className="noteToolbarBtn secondary"
            onClick={() => {
              setRenameDraft(pageTitle)
              setRenaming(true)
            }}
            aria-label="ページ名を変更"
            title="ページ名を変更"
          >
            名前
          </button>
        )}
        {canDeletePage ? (
          <button
            type="button"
            className="noteToolbarBtn danger"
            onClick={onDeletePage}
            aria-label="ページを削除"
            title="ページを削除"
          >
            削除
          </button>
        ) : null}
      </span>

      <span className="noteToolbarDivider" aria-hidden="true" />

      <button
        type="button"
        className="noteToolbarBtn secondary"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="戻す"
        title="戻す（Ctrl+Z）"
      >
        戻す
      </button>

      <label className="noteToolbarGroup">
        <span className="noteToolbarLabel">サイズ</span>
        <select
          className="noteToolbarSelect"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onFontSize(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            選択
          </option>
          {NOTE_FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="noteToolbarBtn" onClick={onBold} title="太字">
        <strong>B</strong>
      </button>

      <NoteColorTileSelect
        label="色"
        options={NOTE_COLORS}
        value={textColor}
        onChange={(color) => {
          setTextColor(color)
          onColor(color)
        }}
        ariaLabel="文字色"
        title="文字色"
      />

      <button type="button" className="noteToolbarBtn secondary" onClick={onOpenLinkDialog} title="リンクを挿入">
        リンク
      </button>

      <button type="button" className="noteToolbarBtn secondary" onClick={onOpenTableDialog} title="表を挿入・設定">
        表
      </button>
    </div>
  )
}
