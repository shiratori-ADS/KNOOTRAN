import { NOTE_COLORS, NOTE_FONT_SIZES } from '../noteHelpers'

type Props = {
  onBold: () => void
  onFontSize: (size: string) => void
  onColor: (color: string) => void
  onOpenTableDialog: () => void
}

export function NotesToolbar({ onBold, onFontSize, onColor, onOpenTableDialog }: Props) {
  return (
    <div className="noteToolbar" role="toolbar" aria-label="書式設定">
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
