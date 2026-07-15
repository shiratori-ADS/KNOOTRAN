import type { NotePage } from '../../../db/types'

type Props = {
  pages: NotePage[]
  activeId: number | null
  toolbarOpen: boolean
  onToggleToolbar: () => void
  onSelect: (id: number) => void
}

export function NoteTabs({ pages, activeId, toolbarOpen, onToggleToolbar, onSelect }: Props) {
  return (
    <div className="noteTabsBar">
      <div className="notePageSelectWrap">
        <select
          className="notePageSelect"
          value={activeId ?? ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            if (Number.isFinite(id)) onSelect(id)
          }}
          aria-label="ページを選択"
          disabled={pages.length === 0}
        >
          {pages.length === 0 ? <option value="">ページなし</option> : null}
          {pages.map((page) =>
            page.id == null ? null : (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ),
          )}
        </select>
      </div>
      {activeId != null ? (
        <div className="noteTabActions">
          <button
            type="button"
            className="noteToolbarToggle"
            onClick={onToggleToolbar}
            aria-expanded={toolbarOpen}
            aria-controls="note-editor-toolbar-panels"
            aria-label={toolbarOpen ? '編集を隠す' : '編集を表示'}
            title={toolbarOpen ? '編集を隠す' : '編集を表示'}
          >
            {toolbarOpen ? '▲' : '▼'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
