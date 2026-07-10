import type { CellTextAlign } from '../tableHelpers'

type Props = {
  currentAlign: CellTextAlign
  onAlignLeft: () => void
  onAlignCenter: () => void
  onAlignRight: () => void
  onInsertRowAbove: () => void
  onInsertRowBelow: () => void
  onInsertColLeft: () => void
  onInsertColRight: () => void
  onDeleteRow: () => void
  onDeleteCol: () => void
  onDeleteTable: () => void
}

export function TableEditToolbar({
  currentAlign,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColLeft,
  onInsertColRight,
  onDeleteRow,
  onDeleteCol,
  onDeleteTable,
}: Props) {
  return (
    <div className="noteTableToolbar" role="toolbar" aria-label="表の編集">
      <span className="noteTableToolbarLabel">表の編集</span>
      <span className="noteTableToolbarGroup">
        <span className="noteTableToolbarSubLabel">位置</span>
        <button
          type="button"
          className={currentAlign === 'left' ? 'noteToolbarBtn active' : 'noteToolbarBtn secondary'}
          onClick={onAlignLeft}
          title="左揃え"
        >
          左
        </button>
        <button
          type="button"
          className={currentAlign === 'center' ? 'noteToolbarBtn active' : 'noteToolbarBtn secondary'}
          onClick={onAlignCenter}
          title="中央揃え"
        >
          中央
        </button>
        <button
          type="button"
          className={currentAlign === 'right' ? 'noteToolbarBtn active' : 'noteToolbarBtn secondary'}
          onClick={onAlignRight}
          title="右揃え"
        >
          右
        </button>
      </span>
      <span className="noteTableToolbarDivider" aria-hidden="true" />
      <button type="button" className="noteToolbarBtn secondary" onClick={onInsertRowAbove} title="上に行を追加">
        行↑
      </button>
      <button type="button" className="noteToolbarBtn secondary" onClick={onInsertRowBelow} title="下に行を追加">
        行↓
      </button>
      <button type="button" className="noteToolbarBtn secondary" onClick={onInsertColLeft} title="左に列を追加">
        列←
      </button>
      <button type="button" className="noteToolbarBtn secondary" onClick={onInsertColRight} title="右に列を追加">
        列→
      </button>
      <button type="button" className="noteToolbarBtn secondary" onClick={onDeleteRow} title="行を削除">
        行削除
      </button>
      <button type="button" className="noteToolbarBtn secondary" onClick={onDeleteCol} title="列を削除">
        列削除
      </button>
      <button type="button" className="noteToolbarBtn danger" onClick={onDeleteTable} title="表全体を削除">
        表削除
      </button>
    </div>
  )
}
