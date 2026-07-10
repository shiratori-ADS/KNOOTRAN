import type { CellTextAlign } from '../tableHelpers'
import { TableAlignButtons } from './TableAlignButtons'
import { TableInsertButtons } from './TableInsertButtons'
import { TableDeleteButtons } from './TableDeleteButtons'

type Props = {
  currentAlign: CellTextAlign
  selectedColCount: number
  colWidthPx: string
  onColWidthPxChange: (value: string) => void
  onApplyColWidth: () => void
  onClearColWidth: () => void
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
  selectedColCount,
  colWidthPx,
  onColWidthPxChange,
  onApplyColWidth,
  onClearColWidth,
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
        <span className="noteTableToolbarSubLabel">
          列幅{selectedColCount > 1 ? `（${selectedColCount}列）` : ''}
        </span>
        <input
          className="noteTableColWidthInput"
          type="number"
          min={20}
          max={800}
          placeholder={selectedColCount > 1 ? '複数' : '自動'}
          value={colWidthPx}
          onChange={(e) => onColWidthPxChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onApplyColWidth()
            }
          }}
          aria-label={selectedColCount > 1 ? `列幅（px・${selectedColCount}列）` : '列幅（px）'}
          title={selectedColCount > 1 ? `選択中の${selectedColCount}列に同じ幅を適用` : '選択中の列に幅を適用'}
        />
        <span className="noteTableColWidthUnit">px</span>
        <button type="button" className="noteToolbarBtn secondary" onClick={onApplyColWidth} title="列幅を適用">
          適用
        </button>
        <button type="button" className="noteToolbarBtn secondary" onClick={onClearColWidth} title="列幅を自動に戻す">
          自動
        </button>
      </span>
      <TableAlignButtons
        currentAlign={currentAlign}
        onAlignLeft={onAlignLeft}
        onAlignCenter={onAlignCenter}
        onAlignRight={onAlignRight}
      />
      <span className="noteTableToolbarDivider" aria-hidden="true" />
      <TableInsertButtons
        onInsertRowAbove={onInsertRowAbove}
        onInsertRowBelow={onInsertRowBelow}
        onInsertColLeft={onInsertColLeft}
        onInsertColRight={onInsertColRight}
      />
      <TableDeleteButtons
        onDeleteRow={onDeleteRow}
        onDeleteCol={onDeleteCol}
        onDeleteTable={onDeleteTable}
      />
    </div>
  )
}
