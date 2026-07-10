type Props = {
  onInsertRowAbove: () => void
  onInsertRowBelow: () => void
  onInsertColLeft: () => void
  onInsertColRight: () => void
  onDeleteRow: () => void
  onDeleteCol: () => void
  onDeleteTable: () => void
}

export function TableEditToolbar({
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
