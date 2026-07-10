import { useState } from 'react'
import type { TableInsertOptions } from '../tableHelpers'

type Props = {
  open: boolean
  onClose: () => void
  onInsert: (options: TableInsertOptions) => void
}

export function TableInsertDialog({ open, onClose, onInsert }: Props) {
  const [rows, setRows] = useState(3)
  const [cols, setCols] = useState(3)
  const [withHeader, setWithHeader] = useState(true)

  if (!open) return null

  return (
    <div className="noteDialogBackdrop" role="presentation" onClick={onClose}>
      <div className="noteDialog card" role="dialog" aria-label="表の挿入" onClick={(e) => e.stopPropagation()}>
        <h3 className="noteDialogTitle">表を挿入</h3>
        <div className="noteTableFormGrid">
          <label className="field">
            <span className="label">行数</span>
            <input
              type="number"
              min={1}
              max={30}
              value={rows}
              onChange={(e) => setRows(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            />
          </label>
          <label className="field">
            <span className="label">列数</span>
            <input
              type="number"
              min={1}
              max={12}
              value={cols}
              onChange={(e) => setCols(Math.max(1, Math.min(12, Number(e.target.value) || 1)))}
            />
          </label>
        </div>
        <label className="noteTableCheckbox">
          <input type="checkbox" checked={withHeader} onChange={(e) => setWithHeader(e.target.checked)} />
          見出し行を付ける
        </label>
        <div className="row wrap">
          <button
            type="button"
            className="primary"
            onClick={() => {
              onInsert({ rows, cols, withHeader })
              onClose()
            }}
          >
            挿入
          </button>
          <button type="button" className="secondary" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
