import { NOTE_COLORS, NOTE_FONT_SIZES } from '../noteHelpers'

type Props = {
  canDeletePage: boolean
  onAddPage: () => void
  onDeletePage: () => void
  onBold: () => void
  onFontSize: (size: string) => void
  onColor: (color: string) => void
  onOpenTableDialog: () => void
}

export function NotesToolbar({
  canDeletePage,
  onAddPage,
  onDeletePage,
  onBold,
  onFontSize,
  onColor,
  onOpenTableDialog,
}: Props) {
  return (
    <div className="noteToolbar" role="toolbar" aria-label="書式設定">
      <span className="noteToolbarGroup">
        <span className="noteToolbarLabel">ページ</span>
        <button type="button" className="noteToolbarBtn secondary" onClick={onAddPage} aria-label="ページを追加" title="ページを追加">
          ＋
        </button>
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

      <label className="noteToolbarGroup">
        <span className="noteToolbarLabel">色</span>
        <select
          className="noteToolbarSelect"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) onColor(e.target.value)
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            選択
          </option>
          {NOTE_COLORS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="noteToolbarBtn secondary" onClick={onOpenTableDialog} title="表を挿入・設定">
        表
      </button>
    </div>
  )
}
